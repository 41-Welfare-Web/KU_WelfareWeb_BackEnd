import { IsDateString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetInventoryAvailabilityDto {
  @ApiProperty({ example: '2026-03-01', description: '조회 시작일 (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ example: '2026-03-31', description: '조회 종료일 (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;
}
