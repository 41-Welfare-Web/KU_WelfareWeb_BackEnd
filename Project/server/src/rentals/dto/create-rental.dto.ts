import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RentalItemDto {
  @ApiProperty({ example: 1, description: '물품 ID' })
  @IsInt()
  @IsNotEmpty()
  itemId: number;

  @ApiProperty({ example: 1, description: '대여 수량' })
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: '2026-06-02', description: '대여 시작일 (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ example: '2026-06-04', description: '반납 예정일 (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;
}

export class CreateRentalDto {
  @ApiProperty({ type: [RentalItemDto], description: '대여 물품 목록 (각 품목별 날짜 포함)' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RentalItemDto)
  items: RentalItemDto[];
}
