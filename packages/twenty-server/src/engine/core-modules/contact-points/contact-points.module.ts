import { Module } from '@nestjs/common';

import { ContactPointsResolver } from 'src/engine/core-modules/contact-points/contact-points.resolver';
import { CallContactPointAdapterService } from 'src/engine/core-modules/contact-points/services/call-contact-point-adapter.service';
import { CustomerContactPointsService } from 'src/engine/core-modules/contact-points/services/customer-contact-points.service';
import { EmailContactPointAdapterService } from 'src/engine/core-modules/contact-points/services/email-contact-point-adapter.service';
import { WhatsAppContactPointAdapterService } from 'src/engine/core-modules/contact-points/services/whatsapp-contact-point-adapter.service';
import { TimelineMessagingModule } from 'src/engine/core-modules/messaging/timeline-messaging.module';
import { WorkspaceDataSourceModule } from 'src/engine/workspace-datasource/workspace-datasource.module';
import { FeatureFlagModule } from 'src/engine/core-modules/feature-flag/feature-flag.module';
import { PermissionsModule } from 'src/engine/metadata-modules/permissions/permissions.module';

@Module({
  imports: [
    WorkspaceDataSourceModule,
    TimelineMessagingModule,
    FeatureFlagModule,
    PermissionsModule,
  ],
  providers: [
    ContactPointsResolver,
    CustomerContactPointsService,
    EmailContactPointAdapterService,
    CallContactPointAdapterService,
    WhatsAppContactPointAdapterService,
  ],
  exports: [CustomerContactPointsService],
})
export class ContactPointsModule {}
