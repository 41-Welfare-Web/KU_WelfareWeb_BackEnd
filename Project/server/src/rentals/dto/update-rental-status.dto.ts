import { IsEnum, IsOptional, IsString } from 'class-validator';
import { RentalStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRentalStatusDto {
  @ApiProperty({
    enum: RentalStatus,
    example: 'RENTED',
    description: '변경할 대여 상태',
  })
  @IsEnum(RentalStatus)
  status: RentalStatus;

  @ApiProperty({
    example: '물품 정상 반납 확인',
    description: '상태 변경 관련 비고/메모',
    required: false,
  })
  @IsString()
  @IsOptional()
  memo?: string;
}
