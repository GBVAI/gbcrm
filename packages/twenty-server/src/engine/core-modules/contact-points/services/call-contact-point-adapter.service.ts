import { Injectable } from '@nestjs/common';

import { Any } from 'typeorm';

import { type ContactPointChannel } from 'src/engine/core-modules/contact-points/enums/contact-point-channel.enum';
import { type CustomerContactPointDTO } from 'src/engine/core-modules/contact-points/dtos/customer-contact-point.dto';
import { mapPhoneCallToContactPoint } from 'src/engine/core-modules/contact-points/utils/map-phone-call-to-contact-point.util';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { type PhoneCallWorkspaceEntity } from 'src/modules/phone-call/standard-objects/phone-call.workspace-entity';

@Injectable()
export class CallContactPointAdapterService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  async getContactPointsFromPersonIds({
    personIds,
    workspaceId,
    pageSize,
    channels,
  }: {
    personIds: string[];
    workspaceId: string;
    pageSize: number;
    channels?: ContactPointChannel[] | null;
  }): Promise<CustomerContactPointDTO[]> {
    if (channels && !channels.includes('CALL' as ContactPointChannel)) {
      return [];
    }

    if (personIds.length === 0) {
      return [];
    }

    const authContext = buildSystemAuthContext(workspaceId);

    return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const phoneCallRepository =
          await this.globalWorkspaceOrmManager.getRepository<PhoneCallWorkspaceEntity>(
            workspaceId,
            'phoneCall',
          );

        const phoneCalls = await phoneCallRepository.find({
          where: {
            phoneCallTargets: {
              targetPersonId: Any(personIds),
            },
          },
          relations: {
            phoneCallTargets: true,
          },
          take: pageSize,
          order: {
            startedAt: 'DESC',
            createdAt: 'DESC',
          },
        });

        const dedupedPhoneCalls = [
          ...new Map(
            phoneCalls.map((phoneCall) => [phoneCall.id, phoneCall]),
          ).values(),
        ];

        return dedupedPhoneCalls.map((phoneCall) => {
          const contactPoint = mapPhoneCallToContactPoint(phoneCall);
          const target = phoneCall.phoneCallTargets?.find((phoneCallTarget) =>
            personIds.includes(phoneCallTarget.targetPersonId ?? ''),
          );

          return {
            ...contactPoint,
            personId: target?.targetPersonId ?? null,
            companyId: target?.targetCompanyId ?? null,
            opportunityId: target?.targetOpportunityId ?? null,
          };
        });
      },
      authContext,
    );
  }
}
