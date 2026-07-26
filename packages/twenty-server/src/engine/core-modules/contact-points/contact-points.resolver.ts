import { UseGuards } from '@nestjs/common';
import { Args, ArgsType, Field, Int, Query } from '@nestjs/graphql';

import { Max } from 'class-validator';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { CONTACT_POINTS_MAX_PAGE_SIZE } from 'src/engine/core-modules/contact-points/constants/contact-points.constants';
import { CustomerContactPointsResultDTO } from 'src/engine/core-modules/contact-points/dtos/customer-contact-points-result.dto';
import { ContactPointChannel } from 'src/engine/core-modules/contact-points/enums/contact-point-channel.enum';
import { CustomerContactPointsService } from 'src/engine/core-modules/contact-points/services/customer-contact-points.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { CoreResolver } from 'src/engine/api/graphql/graphql-config/decorators/core-resolver.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { AuthWorkspaceMemberId } from 'src/engine/decorators/auth/auth-workspace-member-id.decorator';
import { CustomPermissionGuard } from 'src/engine/guards/custom-permission.guard';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';

@ArgsType()
class ContactPointPaginationArgs {
  @Field(() => Int)
  page: number;

  @Field(() => Int)
  @Max(CONTACT_POINTS_MAX_PAGE_SIZE)
  pageSize: number;

  @Field(() => [ContactPointChannel], { nullable: true })
  channels?: ContactPointChannel[] | null;
}

@ArgsType()
class GetContactPointsFromPersonIdArgs extends ContactPointPaginationArgs {
  @Field(() => UUIDScalarType)
  personId: string;
}

@ArgsType()
class GetContactPointsFromCompanyIdArgs extends ContactPointPaginationArgs {
  @Field(() => UUIDScalarType)
  companyId: string;
}

@ArgsType()
class GetContactPointsFromOpportunityIdArgs extends ContactPointPaginationArgs {
  @Field(() => UUIDScalarType)
  opportunityId: string;
}

@UseGuards(WorkspaceAuthGuard, UserAuthGuard, CustomPermissionGuard)
@CoreResolver(() => CustomerContactPointsResultDTO)
export class ContactPointsResolver {
  constructor(
    private readonly customerContactPointsService: CustomerContactPointsService,
  ) {}

  @Query(() => CustomerContactPointsResultDTO)
  async getContactPointsFromPersonId(
    @Args() {
      personId,
      page,
      pageSize,
      channels,
    }: GetContactPointsFromPersonIdArgs,
    @AuthWorkspaceMemberId() workspaceMemberId: string,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ) {
    return this.customerContactPointsService.getContactPointsFromPersonIds({
      currentWorkspaceMemberId: workspaceMemberId,
      personIds: [personId],
      workspaceId: workspace.id,
      page,
      pageSize,
      channels,
    });
  }

  @Query(() => CustomerContactPointsResultDTO)
  async getContactPointsFromCompanyId(
    @Args() {
      companyId,
      page,
      pageSize,
      channels,
    }: GetContactPointsFromCompanyIdArgs,
    @AuthWorkspaceMemberId() workspaceMemberId: string,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ) {
    return this.customerContactPointsService.getContactPointsFromCompanyId({
      currentWorkspaceMemberId: workspaceMemberId,
      companyId,
      workspaceId: workspace.id,
      page,
      pageSize,
      channels,
    });
  }

  @Query(() => CustomerContactPointsResultDTO)
  async getContactPointsFromOpportunityId(
    @Args()
    {
      opportunityId,
      page,
      pageSize,
      channels,
    }: GetContactPointsFromOpportunityIdArgs,
    @AuthWorkspaceMemberId() workspaceMemberId: string,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ) {
    return this.customerContactPointsService.getContactPointsFromOpportunityId({
      currentWorkspaceMemberId: workspaceMemberId,
      opportunityId,
      workspaceId: workspace.id,
      page,
      pageSize,
      channels,
    });
  }
}
