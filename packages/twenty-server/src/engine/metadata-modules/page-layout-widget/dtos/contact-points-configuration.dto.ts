import { Field, ObjectType } from '@nestjs/graphql';

import { IsIn, IsNotEmpty } from 'class-validator';
import { type ContactPointsConfiguration } from 'twenty-shared/types';

import { WidgetConfigurationType } from 'src/engine/metadata-modules/page-layout-widget/enums/widget-configuration-type.type';

@ObjectType('ContactPointsConfiguration')
export class ContactPointsConfigurationDTO implements ContactPointsConfiguration {
  @Field(() => WidgetConfigurationType)
  @IsIn([WidgetConfigurationType.CONTACT_POINTS])
  @IsNotEmpty()
  configurationType: WidgetConfigurationType.CONTACT_POINTS;
}
