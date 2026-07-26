import { Injectable } from '@nestjs/common';

import { type ContactPointChannel } from 'src/engine/core-modules/contact-points/enums/contact-point-channel.enum';
import { type CustomerContactPointDTO } from 'src/engine/core-modules/contact-points/dtos/customer-contact-point.dto';
import { mapTimelineThreadToContactPoint } from 'src/engine/core-modules/contact-points/utils/map-timeline-thread-to-contact-point.util';
import { GetMessagesService } from 'src/engine/core-modules/messaging/services/get-messages.service';

@Injectable()
export class EmailContactPointAdapterService {
  constructor(private readonly getMessagesService: GetMessagesService) {}

  async getContactPointsFromPersonIds({
    currentWorkspaceMemberId,
    personIds,
    workspaceId,
    pageSize,
    channels,
  }: {
    currentWorkspaceMemberId: string;
    personIds: string[];
    workspaceId: string;
    pageSize: number;
    channels?: ContactPointChannel[] | null;
  }): Promise<CustomerContactPointDTO[]> {
    if (channels && !channels.includes('EMAIL' as ContactPointChannel)) {
      return [];
    }

    if (personIds.length === 0) {
      return [];
    }

    const { timelineThreads } = await this.getMessagesService.getMessagesFromPersonIds(
      currentWorkspaceMemberId,
      personIds,
      workspaceId,
      1,
      pageSize,
    );

    return timelineThreads.map(mapTimelineThreadToContactPoint);
  }
}
