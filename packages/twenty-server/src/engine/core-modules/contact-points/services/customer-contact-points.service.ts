import { Injectable } from '@nestjs/common';

import { CONTACT_POINTS_SOURCE_FETCH_MULTIPLIER } from 'src/engine/core-modules/contact-points/constants/contact-points.constants';
import { type ContactPointSourceDiagnosticsDTO } from 'src/engine/core-modules/contact-points/dtos/contact-point-source-diagnostics.dto';
import { type CustomerContactPointsResultDTO } from 'src/engine/core-modules/contact-points/dtos/customer-contact-points-result.dto';
import { type CustomerContactPointDTO } from 'src/engine/core-modules/contact-points/dtos/customer-contact-point.dto';
import { type ContactPointChannel } from 'src/engine/core-modules/contact-points/enums/contact-point-channel.enum';
import { CallContactPointAdapterService } from 'src/engine/core-modules/contact-points/services/call-contact-point-adapter.service';
import { EmailContactPointAdapterService } from 'src/engine/core-modules/contact-points/services/email-contact-point-adapter.service';
import { WhatsAppContactPointAdapterService } from 'src/engine/core-modules/contact-points/services/whatsapp-contact-point-adapter.service';
import { buildContactPointSourceDiagnostic } from 'src/engine/core-modules/contact-points/utils/contact-point-source-diagnostic.util';
import { mergeSortAndSliceContactPoints } from 'src/engine/core-modules/contact-points/utils/merge-sort-and-slice-contact-points.util';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { type OpportunityWorkspaceEntity } from 'src/modules/opportunity/standard-objects/opportunity.workspace-entity';
import { type PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';

@Injectable()
export class CustomerContactPointsService {
  constructor(
    private readonly emailContactPointAdapterService: EmailContactPointAdapterService,
    private readonly callContactPointAdapterService: CallContactPointAdapterService,
    private readonly whatsAppContactPointAdapterService: WhatsAppContactPointAdapterService,
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  async getContactPointsFromPersonIds({
    currentWorkspaceMemberId,
    personIds,
    workspaceId,
    page,
    pageSize,
    channels,
  }: {
    currentWorkspaceMemberId: string;
    personIds: string[];
    workspaceId: string;
    page: number;
    pageSize: number;
    channels?: ContactPointChannel[] | null;
  }): Promise<CustomerContactPointsResultDTO> {
    const sourcePageSize = Math.max(
      page * pageSize * CONTACT_POINTS_SOURCE_FETCH_MULTIPLIER,
      pageSize,
    );

    const sourceDiagnostics: ContactPointSourceDiagnosticsDTO = {};
    const contactPoints: CustomerContactPointDTO[] = [];

    await Promise.all([
      this.collectSource({
        key: 'email',
        sourceDiagnostics,
        contactPoints,
        loader: () =>
          this.emailContactPointAdapterService.getContactPointsFromPersonIds({
            currentWorkspaceMemberId,
            personIds,
            workspaceId,
            pageSize: sourcePageSize,
            channels,
          }),
      }),
      this.collectSource({
        key: 'calls',
        sourceDiagnostics,
        contactPoints,
        loader: () =>
          this.callContactPointAdapterService.getContactPointsFromPersonIds({
            personIds,
            workspaceId,
            pageSize: sourcePageSize,
            channels,
          }),
      }),
      this.collectSource({
        key: 'whatsapp',
        sourceDiagnostics,
        contactPoints,
        loader: () =>
          this.whatsAppContactPointAdapterService.getContactPointsFromPersonIds({
            personIds,
            workspaceId,
            pageSize: sourcePageSize,
            channels,
          }),
      }),
    ]);

    return {
      ...mergeSortAndSliceContactPoints({ contactPoints, page, pageSize }),
      sourceDiagnostics,
    };
  }

  async getContactPointsFromCompanyId({
    currentWorkspaceMemberId,
    companyId,
    workspaceId,
    page,
    pageSize,
    channels,
  }: {
    currentWorkspaceMemberId: string;
    companyId: string;
    workspaceId: string;
    page: number;
    pageSize: number;
    channels?: ContactPointChannel[] | null;
  }): Promise<CustomerContactPointsResultDTO> {
    const personIds = await this.getPersonIdsByCompanyId({ workspaceId, companyId });

    return this.getContactPointsFromPersonIds({
      currentWorkspaceMemberId,
      personIds,
      workspaceId,
      page,
      pageSize,
      channels,
    });
  }

  async getContactPointsFromOpportunityId({
    currentWorkspaceMemberId,
    opportunityId,
    workspaceId,
    page,
    pageSize,
    channels,
  }: {
    currentWorkspaceMemberId: string;
    opportunityId: string;
    workspaceId: string;
    page: number;
    pageSize: number;
    channels?: ContactPointChannel[] | null;
  }): Promise<CustomerContactPointsResultDTO> {
    const companyId = await this.getOpportunityCompanyId({
      workspaceId,
      opportunityId,
    });

    if (!companyId) {
      return this.getContactPointsFromPersonIds({
        currentWorkspaceMemberId,
        personIds: [],
        workspaceId,
        page,
        pageSize,
        channels,
      });
    }

    return this.getContactPointsFromCompanyId({
      currentWorkspaceMemberId,
      companyId,
      workspaceId,
      page,
      pageSize,
      channels,
    });
  }

  private async collectSource({
    key,
    sourceDiagnostics,
    contactPoints,
    loader,
  }: {
    key: keyof ContactPointSourceDiagnosticsDTO;
    sourceDiagnostics: ContactPointSourceDiagnosticsDTO;
    contactPoints: CustomerContactPointDTO[];
    loader: () => Promise<CustomerContactPointDTO[]>;
  }) {
    try {
      const sourceContactPoints = await loader();

      contactPoints.push(...sourceContactPoints);
      sourceDiagnostics[key] = buildContactPointSourceDiagnostic({
        ok: true,
        count: sourceContactPoints.length,
      });
    } catch (error) {
      sourceDiagnostics[key] = buildContactPointSourceDiagnostic({
        ok: false,
        count: 0,
        error,
      });
    }
  }

  private async getPersonIdsByCompanyId({
    workspaceId,
    companyId,
  }: {
    workspaceId: string;
    companyId: string;
  }): Promise<string[]> {
    const authContext = buildSystemAuthContext(workspaceId);

    return this.globalWorkspaceOrmManager.executeInWorkspaceContext(async () => {
      const personRepository =
        await this.globalWorkspaceOrmManager.getRepository<PersonWorkspaceEntity>(
          workspaceId,
          'person',
          { shouldBypassPermissionChecks: true },
        );

      const people = await personRepository.find({
        where: {
          companyId,
        },
        select: {
          id: true,
        },
      });

      return people.map(({ id }) => id);
    }, authContext);
  }

  private async getOpportunityCompanyId({
    workspaceId,
    opportunityId,
  }: {
    workspaceId: string;
    opportunityId: string;
  }): Promise<string | null> {
    const authContext = buildSystemAuthContext(workspaceId);

    return this.globalWorkspaceOrmManager.executeInWorkspaceContext(async () => {
      const opportunityRepository =
        await this.globalWorkspaceOrmManager.getRepository<OpportunityWorkspaceEntity>(
          workspaceId,
          'opportunity',
          { shouldBypassPermissionChecks: true },
        );

      const opportunity = await opportunityRepository.findOne({
        where: {
          id: opportunityId,
        },
        select: {
          companyId: true,
        },
      });

      return opportunity?.companyId ?? null;
    }, authContext);
  }
}
