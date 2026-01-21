import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ManagementType } from '@prisma/client';

export class CreateItemDto {
  @IsInt()
  @IsNotEmpty()
  categoryId: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  itemCode: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsEnum(ManagementType)
  @IsNotEmpty()
  managementType: ManagementType;

  @IsInt()
  @IsOptional()
  @Min(0)
  totalQuantity?: number;
}
