import { Injectable, Logger } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { PhoneCallTargetWorkspaceEntity } from 'src/modules/phone-call/standard-objects/phone-call-target.workspace-entity';
import { PhoneCallWorkspaceEntity } from 'src/modules/phone-call/standard-objects/phone-call.workspace-entity';
import { PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';
import { type WildixCallEvent } from 'src/modules/wildix/types/wildix-webhook-payload.type';

@Injectable()
export class WildixCallProcessorService {
  protected readonly logger = new Logger(WildixCallProcessorService.name);

  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly twentyConfigService: TwentyConfigService,
  ) {}

  async processCallEvent(event: WildixCallEvent): Promise<void> {
    const workspaceId = this.twentyConfigService.get('WILDIX_WORKSPACE_ID');

    if (!isDefined(workspaceId) || workspaceId === '') {
      this.logger.warn(
        'WILDIX_WORKSPACE_ID not configured — skipping call processing',
      );

      return;
    }

    this.logger.log(
      `Processing ${event.eventType} for call ${event.callId} direction=${event.direction} status=${event.status}`,
    );

    switch (event.eventType) {
      case 'call:live:progress':
        await this.handleCallProgress(event, workspaceId);
        break;
      case 'call:live:completed':
        await this.handleCallCompleted(event, workspaceId);
        break;
      case 'call:live:transcription':
        await this.handleTranscription(event, workspaceId);
        break;
    }
  }

  private async handleCallProgress(
    event: WildixCallEvent,
    workspaceId: string,
  ): Promise<void> {
    if (!isDefined(event.callId) || event.callId === '') {
      this.logger.warn('Received call:live:progress with empty callId');

      return;
    }

    await this.upsertPhoneCall(event, workspaceId);
  }

  private async handleCallCompleted(
    event: WildixCallEvent,
    workspaceId: string,
  ): Promise<void> {
    if (!isDefined(event.callId) || event.callId === '') {
      this.logger.warn('Received call:live:completed with empty callId');

      return;
    }

    await this.upsertPhoneCall(event, workspaceId);
  }

  private async handleTranscription(
    event: WildixCallEvent,
    workspaceId: string,
  ): Promise<void> {
    if (!isDefined(event.transcriptSegment) || event.transcriptSegment === '') {
      return;
    }

    const authContext = buildSystemAuthContext(workspaceId);

    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(async () => {
      const phoneCallRepository =
        await this.globalWorkspaceOrmManager.getRepository<PhoneCallWorkspaceEntity>(
          workspaceId,
          'phoneCall',
          { shouldBypassPermissionChecks: true },
        );

      const existingCall = await phoneCallRepository.findOne({
        where: { wildixCallId: event.callId },
      });

      if (!isDefined(existingCall)) {
        this.logger.warn(
          `Received transcription for unknown call ${event.callId}`,
        );

        return;
      }

      // Append transcript segment to the bodyV2 rich text field
      const speakerLabel =
        event.transcriptSpeaker === 'callee'
          ? existingCall.agentName || 'Agent'
          : 'Caller';

      const newLine = `[${speakerLabel}] ${event.transcriptSegment}`;

      // transcript is RichTextV2Metadata: { blocknote?: string | null; markdown: string | null }
      // We store transcript segments as markdown text for simplicity
      const currentMarkdown = existingCall.transcript?.markdown ?? '';
      const updatedMarkdown = currentMarkdown
        ? `${currentMarkdown}\n${newLine}`
        : newLine;

      await phoneCallRepository.update(
        { wildixCallId: event.callId },
        { transcript: { markdown: updatedMarkdown, blocknote: null } },
      );

      this.logger.log(
        `Appended transcript segment to call ${event.callId} (${event.transcriptSpeaker})`,
      );
    }, authContext);
  }

  // Upsert a PhoneCall record (create if new, update if exists by wildixCallId)
  async upsertPhoneCall(
    event: WildixCallEvent,
    workspaceId: string,
  ): Promise<string | null> {
    const authContext = buildSystemAuthContext(workspaceId);
    let phoneCallId: string | null = null;

    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(async () => {
      const phoneCallRepository =
        await this.globalWorkspaceOrmManager.getRepository<PhoneCallWorkspaceEntity>(
          workspaceId,
          'phoneCall',
          { shouldBypassPermissionChecks: true },
        );

      // Idempotency: find existing record by wildixCallId
      const existing = await phoneCallRepository.findOne({
        where: { wildixCallId: event.callId },
      });

      const title = this.buildCallTitle(event);

      if (isDefined(existing)) {
        // Update with latest data (e.g. when completed event arrives after progress)
        await phoneCallRepository.update(
          { wildixCallId: event.callId },
          {
            callStatus: event.status,
            endedAt: event.endedAt ?? existing.endedAt,
            durationSeconds: event.durationSeconds || existing.durationSeconds,
            waitSeconds: event.waitSeconds || existing.waitSeconds,
            endCause: event.endCause || existing.endCause,
            recordingUrl: event.recordingUrl || existing.recordingUrl,
          },
        );
        phoneCallId = existing.id;

        this.logger.log(`Updated PhoneCall ${existing.id} for ${event.callId}`);
      } else {
        // Create new PhoneCall record
        const insertResult = await phoneCallRepository.insert({
          title,
          direction: event.direction,
          callStatus: event.status,
          callerPhone: event.caller?.phone ?? '',
          callerName: event.caller?.name ?? '',
          receiverPhone: event.callee?.phone ?? '',
          agentName: event.agentName,
          startedAt: event.startedAt,
          endedAt: event.endedAt,
          durationSeconds: event.durationSeconds,
          waitSeconds: event.waitSeconds,
          endCause: event.endCause,
          recordingUrl: event.recordingUrl,
          wildixCallId: event.callId,
          position: 0,
        });

        phoneCallId = insertResult?.identifiers?.[0]?.id ?? null;

        this.logger.log(
          `Created PhoneCall ${phoneCallId} for ${event.callId} (${event.direction} ${event.status})`,
        );

        if (isDefined(phoneCallId)) {
          await this.linkCallToContact(event, phoneCallId, workspaceId);
        }
      }
    }, authContext);

    return phoneCallId;
  }

  // Find matching Person by phone number and create PhoneCallTarget
  private async linkCallToContact(
    event: WildixCallEvent,
    phoneCallId: string,
    workspaceId: string,
  ): Promise<void> {
    const remotePhone = event.remotePhone;

    if (!isDefined(remotePhone) || remotePhone === '') {
      return;
    }

    const { subscriberNumber, callingCode } =
      extractSubscriberAndCallingCode(remotePhone);

    if (subscriberNumber === '') {
      return;
    }

    const authContext = buildSystemAuthContext(workspaceId);

    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(async () => {
      const personRepository =
        await this.globalWorkspaceOrmManager.getRepository<PersonWorkspaceEntity>(
          workspaceId,
          'person',
          { shouldBypassPermissionChecks: true },
        );

      // Match person by subscriber number AND calling code
      // Twenty stores: phonesPrimaryPhoneNumber = "3402541709", phonesPrimaryPhoneCallingCode = "+39"
      const queryBuilder = personRepository
        .createQueryBuilder('person')
        .select(['person.id'])
        .where('person."phonesPrimaryPhoneNumber" = :phone', {
          phone: subscriberNumber,
        });

      if (callingCode !== '') {
        queryBuilder.andWhere(
          'person."phonesPrimaryPhoneCallingCode" = :callingCode',
          { callingCode },
        );
      }

      const matchingPeople = await queryBuilder.limit(5).getMany();

      if (matchingPeople.length === 0) {
        this.logger.log(
          `No matching Person found for phone ${remotePhone} (subscriber: ${subscriberNumber}, callingCode: ${callingCode})`,
        );

        return;
      }

      const phoneCallTargetRepository =
        await this.globalWorkspaceOrmManager.getRepository<PhoneCallTargetWorkspaceEntity>(
          workspaceId,
          'phoneCallTarget',
          { shouldBypassPermissionChecks: true },
        );

      for (const person of matchingPeople) {
        // Check if target already exists (idempotency)
        const existing = await phoneCallTargetRepository.findOne({
          where: {
            phoneCallId,
            targetPersonId: person.id,
          },
        });

        if (isDefined(existing)) {
          continue;
        }

        await phoneCallTargetRepository.insert({
          phoneCallId,
          targetPersonId: person.id,
        });

        this.logger.log(
          `Linked call ${phoneCallId} to person ${person.id} via phone ${subscriberNumber}`,
        );
      }
    }, authContext);
  }

  private buildCallTitle(event: WildixCallEvent): string {
    const dirLabel =
      event.direction === 'INBOUND'
        ? 'Inbound call from'
        : event.direction === 'OUTBOUND'
          ? 'Outbound call to'
          : 'Internal call';

    const remoteDisplay =
      event.remoteName && event.remoteName !== event.remotePhone
        ? `${event.remotePhone} (${event.remoteName})`
        : event.remotePhone || 'Unknown';

    return `${dirLabel} ${remoteDisplay}`;
  }
}

// Extract the subscriber number and calling code from a full phone number.
// Twenty CRM stores these separately:
//   phonesPrimaryPhoneNumber = "3402541709" (subscriber digits only)
//   phonesPrimaryPhoneCallingCode = "+39" (with + prefix)
//
// Examples:
//   +393487432338  →  { subscriberNumber: "3487432338", callingCode: "+39" }
//   +13025551234   →  { subscriberNumber: "3025551234", callingCode: "+1" }
//   003912345678   →  { subscriberNumber: "12345678",   callingCode: "+39" }
//   0612345678     →  { subscriberNumber: "612345678",  callingCode: "" }
//   3487432338     →  { subscriberNumber: "3487432338", callingCode: "" }
export function extractSubscriberAndCallingCode(phone: string): {
  subscriberNumber: string;
  callingCode: string;
} {
  if (!isDefined(phone) || phone.trim() === '') {
    return { subscriberNumber: '', callingCode: '' };
  }

  // Remove spaces, dashes, parentheses
  let cleaned = phone.replace(/[\s\-().]/g, '');

  // Strip leading + and identify the calling code
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1); // Remove the +

    // Common calling codes (longest match first to avoid ambiguity)
    const twoDigitCodes = [
      '39', '44', '33', '49', '34', '31', '32', '41', '43',
      '46', '47', '48', '30', '45', '36', '40', '35', '38',
      '37', '42', '90', '91', '92', '93', '94', '95', '98',
      '20', '27', '55', '52', '54', '56', '57', '58', '60',
      '61', '62', '63', '64', '65', '66', '81', '82', '84',
      '86',
    ];
    const oneDigitCodes = ['1', '7'];

    const twoDigit = cleaned.slice(0, 2);

    if (twoDigitCodes.includes(twoDigit)) {
      return {
        subscriberNumber: cleaned.slice(2),
        callingCode: `+${twoDigit}`,
      };
    }

    const oneDigit = cleaned.slice(0, 1);

    if (oneDigitCodes.includes(oneDigit)) {
      return {
        subscriberNumber: cleaned.slice(1),
        callingCode: `+${oneDigit}`,
      };
    }

    // Unknown calling code — return digits without code
    return { subscriberNumber: cleaned.replace(/\D/g, ''), callingCode: '' };
  }

  // Handle 00-prefixed international format (e.g. 0039123...)
  if (cleaned.startsWith('00')) {
    return extractSubscriberAndCallingCode('+' + cleaned.slice(2));
  }

  // Strip leading 0 for local formats (e.g. 0612345678 → 612345678)
  if (cleaned.startsWith('0') && cleaned.length > 8) {
    return {
      subscriberNumber: cleaned.slice(1).replace(/\D/g, ''),
      callingCode: '',
    };
  }

  // Already subscriber digits, no calling code
  return { subscriberNumber: cleaned.replace(/\D/g, ''), callingCode: '' };
}

// Convenience wrapper — returns just the subscriber number for simple lookups
export function normalizePhoneNumber(phone: string): string {
  return extractSubscriberAndCallingCode(phone).subscriberNumber;
}
