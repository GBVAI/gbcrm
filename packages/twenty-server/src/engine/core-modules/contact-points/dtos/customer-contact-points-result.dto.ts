import { Field, Int, ObjectType } from '@nestjs/graphql';

import { ContactPointPageInfoDTO } from 'src/engine/core-modules/contact-points/dtos/contact-point-page-info.dto';
import { ContactPointSourceDiagnosticsDTO } from 'src/engine/core-modules/contact-points/dtos/contact-point-source-diagnostics.dto';
import { CustomerContactPointDTO } from 'src/engine/core-modules/contact-points/dtos/customer-contact-point.dto';

@ObjectType('CustomerContactPointsResult')
export class CustomerContactPointsResultDTO {
  @Field(() => Int)
  totalCount: number;

  @Field(() => [CustomerContactPointDTO])
  contactPoints: CustomerContactPointDTO[];

  @Field(() => ContactPointPageInfoDTO)
  pageInfo: ContactPointPageInfoDTO;

  @Field(() => ContactPointSourceDiagnosticsDTO, { nullable: true })
  sourceDiagnostics?: ContactPointSourceDiagnosticsDTO | null;
}
