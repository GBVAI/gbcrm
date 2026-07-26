import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('ContactPointPageInfo')
export class ContactPointPageInfoDTO {
  @Field(() => Int)
  page: number;

  @Field(() => Int)
  pageSize: number;

  @Field()
  hasMore: boolean;
}
