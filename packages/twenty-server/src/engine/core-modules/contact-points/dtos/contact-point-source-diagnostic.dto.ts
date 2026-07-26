import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('ContactPointSourceDiagnostic')
export class ContactPointSourceDiagnosticDTO {
  @Field()
  ok: boolean;

  @Field(() => Int)
  count: number;

  @Field({ nullable: true })
  error?: string | null;
}
