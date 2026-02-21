import { Injectable } from '@nestjs/common';

import { assertIsDefinedOrThrow } from 'twenty-shared/utils';
import { In } from 'typeorm';

import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { type AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import { WorkspaceNotFoundDefaultError } from 'src/engine/core-modules/workspace/workspace.exception';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { PhoneCallTargetWorkspaceEntity } from 'src/modules/phone-call/standard-objects/phone-call-target.workspace-entity';
import { PhoneCallWorkspaceEntity } from 'src/modules/phone-call/standard-objects/phone-call.workspace-entity';

@Injectable()
export class PhoneCallPostQueryHookService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  async handlePhoneCallTargetsDelete(
    authContext: AuthContext,
    payload: PhoneCallWorkspaceEntity[],
  ): Promise<void> {
    if (!payload || payload?.length === 0) {
      return;
    }

    const workspace = authContext.workspace;

    assertIsDefinedOrThrow(workspace, WorkspaceNotFoundDefaultError);

    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(async () => {
      const phoneCallTargetRepository =
        await this.globalWorkspaceOrmManager.getRepository<PhoneCallTargetWorkspaceEntity>(
          workspace.id,
          'phoneCallTarget',
        );

      await phoneCallTargetRepository.softDelete({
        phoneCallId: In(payload.map((phoneCall) => phoneCall.id)),
      });
    }, authContext as WorkspaceAuthContext);
  }

  async handlePhoneCallTargetsRestore(
    authContext: AuthContext,
    payload: PhoneCallWorkspaceEntity[],
  ): Promise<void> {
    if (!payload || payload?.length === 0) {
      return;
    }

    const workspace = authContext.workspace;

    assertIsDefinedOrThrow(workspace, WorkspaceNotFoundDefaultError);

    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(async () => {
      const phoneCallTargetRepository =
        await this.globalWorkspaceOrmManager.getRepository<PhoneCallTargetWorkspaceEntity>(
          workspace.id,
          'phoneCallTarget',
        );

      await phoneCallTargetRepository.restore({
        phoneCallId: In(payload.map((phoneCall) => phoneCall.id)),
      });
    }, authContext as WorkspaceAuthContext);
  }
}
