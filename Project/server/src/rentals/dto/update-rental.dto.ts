import { CreateRentalDto } from './create-rental.dto';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class UpdateRentalDto extends PartialType(CreateRentalDto) {
  @ApiProperty({
    example: '2026-07-14',
    description: '대여 시작일 — 품목 변경 없이 날짜만 수정할 때 사용 (items 미포함 시)',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({
    example: '2026-07-16',
    description: '반납 예정일 — 품목 변경 없이 날짜만 수정할 때 사용 (items 미포함 시)',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}
