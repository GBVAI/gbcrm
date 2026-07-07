import { Injectable } from '@nestjs/common';

import { type WorkspacePostQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';

import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { WorkspaceQueryHookType } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/types/workspace-query-hook.type';
import { type AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import { PhoneCallPostQueryHookService } from 'src/modules/phone-call/query-hooks/phone-call-post-query-hook.service';
import { PhoneCallWorkspaceEntity } from 'src/modules/phone-call/standard-objects/phone-call.workspace-entity';

@Injectable()
@WorkspaceQueryHook({
  key: `phoneCall.deleteMany`,
  type: WorkspaceQueryHookType.POST_HOOK,
})
export class PhoneCallDeleteManyPostQueryHook implements WorkspacePostQueryHookInstance {
  constructor(
    private readonly phoneCallPostQueryHookService: PhoneCallPostQueryHookService,
  ) {}

  async execute(
    authContext: AuthContext,
    _objectName: string,
    payload: PhoneCallWorkspaceEntity[],
  ): Promise<void> {
    await this.phoneCallPostQueryHookService.handlePhoneCallTargetsDelete(
      authContext,
      payload,
    );
  }
}
