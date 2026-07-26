import { Field, ObjectType } from '@nestjs/graphql';

import { ContactPointSourceDiagnosticDTO } from 'src/engine/core-modules/contact-points/dtos/contact-point-source-diagnostic.dto';

@ObjectType('ContactPointSourceDiagnostics')
export class ContactPointSourceDiagnosticsDTO {
  @Field(() => ContactPointSourceDiagnosticDTO, { nullable: true })
  email?: ContactPointSourceDiagnosticDTO | null;

  @Field(() => ContactPointSourceDiagnosticDTO, { nullable: true })
  calls?: ContactPointSourceDiagnosticDTO | null;

  @Field(() => ContactPointSourceDiagnosticDTO, { nullable: true })
  whatsapp?: ContactPointSourceDiagnosticDTO | null;
}
