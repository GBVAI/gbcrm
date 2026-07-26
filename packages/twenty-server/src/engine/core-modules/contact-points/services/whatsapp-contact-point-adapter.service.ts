import { Injectable } from '@nestjs/common';

import { type ContactPointChannel } from 'src/engine/core-modules/contact-points/enums/contact-point-channel.enum';
import { type CustomerContactPointDTO } from 'src/engine/core-modules/contact-points/dtos/customer-contact-point.dto';

@Injectable()
export class WhatsAppContactPointAdapterService {
  async getContactPointsFromPersonIds({
    channels,
  }: {
    personIds: string[];
    workspaceId: string;
    pageSize: number;
    channels?: ContactPointChannel[] | null;
  }): Promise<CustomerContactPointDTO[]> {
    if (channels && !channels.includes('WHATSAPP' as ContactPointChannel)) {
      return [];
    }

    // Switchbord currently has no public API-key endpoint for server-side
    // conversation lookup by phone/wa_id/contact. Keep this adapter read-only
    // and empty until the mirror/API decision is implemented.
    return [];
  }
}
