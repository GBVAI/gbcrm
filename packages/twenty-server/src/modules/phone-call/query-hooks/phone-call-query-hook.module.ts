import { Module } from '@nestjs/common';

import { PhoneCallDeleteManyPostQueryHook } from 'src/modules/phone-call/query-hooks/phone-call-delete-many.post-query.hook';
import { PhoneCallDeleteOnePostQueryHook } from 'src/modules/phone-call/query-hooks/phone-call-delete-one.post-query.hook';
import { PhoneCallPostQueryHookService } from 'src/modules/phone-call/query-hooks/phone-call-post-query-hook.service';
import { PhoneCallRestoreManyPostQueryHook } from 'src/modules/phone-call/query-hooks/phone-call-restore-many.post-query.hook';
import { PhoneCallRestoreOnePostQueryHook } from 'src/modules/phone-call/query-hooks/phone-call-restore-one.post-query.hook';

@Module({
  providers: [
    PhoneCallPostQueryHookService,
    PhoneCallDeleteManyPostQueryHook,
    PhoneCallDeleteOnePostQueryHook,
    PhoneCallRestoreManyPostQueryHook,
    PhoneCallRestoreOnePostQueryHook,
  ],
})
export class PhoneCallQueryHookModule {}
