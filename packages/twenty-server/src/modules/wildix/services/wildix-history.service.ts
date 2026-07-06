import { Injectable, Logger } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { WildixCallProcessorService } from 'src/modules/wildix/services/wildix-call-processor.service';
import { WildixWebhookService } from 'src/modules/wildix/services/wildix-webhook.service';
import { type WildixCallRecord } from 'src/modules/wildix/types/wildix-webhook-payload.type';

const WDA_BASE_URL = 'https://wda.wildix.com';

// Handles polling the WDA History API to backfill / sync call records.
// Can be triggered manually, on a cron schedule, or at server startup.
@Injectable()
export class WildixHistoryService {
  protected readonly logger = new Logger(WildixHistoryService.name);

  constructor(
    private readonly twentyConfigService: TwentyConfigService,
    private readonly wildixWebhookService: WildixWebhookService,
    private readonly wildixCallProcessorService: WildixCallProcessorService,
  ) {}

  // Import calls for a date range. Returns number of calls processed.
  async importCallsForDateRange(
    from: Date,
    to: Date,
    workspaceId?: string,
  ): Promise<number> {
    const apiKey = this.twentyConfigService.get('WILDIX_API_KEY');
    const wsId =
      workspaceId ?? this.twentyConfigService.get('WILDIX_WORKSPACE_ID');

    if (!isDefined(apiKey) || apiKey === '') {
      this.logger.warn(
        'WILDIX_API_KEY not configured — skipping history import',
      );

      return 0;
    }

    if (!isDefined(wsId) || wsId === '') {
      this.logger.warn(
        'WILDIX_WORKSPACE_ID not configured — skipping history import',
      );

      return 0;
    }

    this.logger.log(
      `Importing Wildix calls from ${from.toISOString()} to ${to.toISOString()}`,
    );

    let totalProcessed = 0;
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const conversations = await this.fetchConversations(
        apiKey,
        from,
        to,
        limit,
        offset,
      );

      if (!isDefined(conversations) || conversations.length === 0) {
        hasMore = false;
        break;
      }

      // Deduplicate: each call appears twice in QueryConversations (one per participant perspective)
      // Keep only the canonical record: for INBOUND, prefer the record where callee has an email;
      // for OUTBOUND, prefer where caller has an email.
      const deduped = this.deduplicateConversations(conversations);

      this.logger.log(
        `Processing ${deduped.length} unique calls (offset ${offset}, raw: ${conversations.length})`,
      );

      for (const record of deduped) {
        try {
          const event = this.wildixWebhookService.parseHistoryRecord(record);
          const id = await this.wildixCallProcessorService.upsertPhoneCall(
            event,
            wsId,
          );

          if (isDefined(id)) {
            totalProcessed++;
          }
        } catch (error) {
          this.logger.error(
            `Failed to process call ${record.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      // Check if there are more pages
      if (conversations.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }
    }

    this.logger.log(
      `History import complete: ${totalProcessed} calls processed`,
    );

    return totalProcessed;
  }

  // Fetch a page of conversations from the WDA History API
  private async fetchConversations(
    apiKey: string,
    from: Date,
    to: Date,
    limit: number,
    offset: number,
  ): Promise<WildixCallRecord[]> {
    const url = `${WDA_BASE_URL}/v2/history/conversations`;

    const body = {
      limit,
      offset,
      filter: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        this.logger.error(
          `WDA History API error ${response.status}: ${text.substring(0, 200)}`,
        );

        return [];
      }

      const data = (await response.json()) as {
        conversations?: Array<{
          call?: WildixCallRecord;
          conference?: unknown;
        }>;
      };

      // Extract only call records (skip conferences)
      return (data.conversations ?? [])
        .filter((item) => isDefined(item.call))
        .map((item) => item.call as WildixCallRecord);
    } catch (error) {
      this.logger.error(
        `WDA History API request failed: ${error instanceof Error ? error.message : String(error)}`,
      );

      return [];
    }
  }

  // Fetch the formatted transcript text for a call
  async fetchTranscriptText(
    callId: string,
    flowIndex: number,
  ): Promise<string | null> {
    const apiKey = this.twentyConfigService.get('WILDIX_API_KEY');

    if (!isDefined(apiKey) || apiKey === '') {
      return null;
    }

    const url = `${WDA_BASE_URL}/v2/history/calls/${encodeURIComponent(callId)}/flows/${flowIndex}/transcription/text`;

    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (response.status === 404) {
        return null; // No transcript for this call
      }

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as { text?: string };

      return data.text ?? null;
    } catch {
      return null;
    }
  }

  // Deduplicate call records: the WDA QueryConversations endpoint returns each call
  // from multiple participant perspectives. We want one record per unique call ID.
  // Strategy: prefer records where a LOCAL participant has an email address (i.e. the
  // internal agent is known), as this is the most useful record for the CRM.
  private deduplicateConversations(
    records: WildixCallRecord[],
  ): WildixCallRecord[] {
    const seen = new Map<string, WildixCallRecord>();

    for (const record of records) {
      const existing = seen.get(record.id);

      if (!isDefined(existing)) {
        seen.set(record.id, record);
        continue;
      }

      // Prefer the record where either caller or callee has an email
      const existingHasEmail =
        isDefined(existing.callee?.email) || isDefined(existing.caller?.email);
      const newHasEmail =
        isDefined(record.callee?.email) || isDefined(record.caller?.email);

      if (!existingHasEmail && newHasEmail) {
        seen.set(record.id, record);
      }
    }

    return Array.from(seen.values());
  }
}
