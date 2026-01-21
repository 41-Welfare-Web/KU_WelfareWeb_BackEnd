import { IsEnum, IsOptional, IsString } from 'class-validator';
import { RentalStatus } from '@prisma/client';

export class UpdateRentalStatusDto {
  @IsEnum(RentalStatus)
  status: RentalStatus;

  @IsString()
  @IsOptional()
  memo?: string;
}
