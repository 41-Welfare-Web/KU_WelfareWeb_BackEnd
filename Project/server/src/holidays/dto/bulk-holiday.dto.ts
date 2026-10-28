import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** 한 번에 등록/삭제할 수 있는 최대 기간 (실수로 몇 년치를 날리는 것 방지) */
export const MAX_BULK_RANGE_DAYS = 366;

export class CreateHolidayRangeDto {
  @ApiProperty({ example: '2026-11-30', description: '시작일 (YYYY-MM-DD, 포함)' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ example: '2027-01-15', description: '종료일 (YYYY-MM-DD, 포함)' })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({
    example: '대여 휴무 기간',
    description: '사유 (달력에 표시됩니다)',
    required: false,
  })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: false,
    description:
      '주말도 등록할지 여부. 기본 false — 주말은 운영일 계산에서 이미 자동 제외되므로 등록하지 않습니다.',
    required: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  includeWeekends?: boolean;
}

export class DeleteHolidayRangeDto {
  @ApiProperty({ example: '2026-11-30', description: '시작일 (YYYY-MM-DD, 포함)' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ example: '2027-01-15', description: '종료일 (YYYY-MM-DD, 포함)' })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;
}
