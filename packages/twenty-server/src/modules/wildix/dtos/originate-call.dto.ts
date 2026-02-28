import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class OriginateCallDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Matches(/^[0-9+()[\].\s#*\-]+$/)
  destination: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  displayName?: string;

  @IsOptional()
  @IsUUID()
  contactId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  contactObjectName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;
}
