import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsIn,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DEPARTMENT_TYPES } from '../../auth/dto/register.dto';

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
  @ApiProperty({
    example: '학과',
    description: '신청 시 소속 유형 (기본값은 본인 계정 정보)',
    enum: DEPARTMENT_TYPES,
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(DEPARTMENT_TYPES)
  departmentType: string;

  @ApiProperty({
    example: '컴퓨터공학과',
    description: '신청 시 소속 단위명 (기본값은 본인 계정 정보)',
    required: false,
  })
  @IsString()
  @IsOptional()
  departmentName?: string;

  @ApiProperty({ type: [RentalItemDto], description: '대여 물품 목록 (각 품목별 날짜 포함)' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RentalItemDto)
  items: RentalItemDto[];
}
