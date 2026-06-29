import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { RentalStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRentalStatusDto {
  @ApiProperty({
    enum: RentalStatus,
    example: 'RENTED',
    description: '변경할 대여 상태. 생략 시 현재 상태를 유지하고 메모만 업데이트',
    required: false,
  })
  @IsEnum(RentalStatus)
  @IsOptional()
  status?: RentalStatus;

  @ApiProperty({
    example: '물품 정상 반납 확인',
    description: '상태 변경 관련 비고/메모',
    required: false,
  })
  @IsString()
  @IsOptional()
  memo?: string;

  @ApiProperty({
    example: 12,
    description: 'DEFECTIVE 처리 시 불량 처리할 RentalItem ID (DEFECTIVE 상태 전용)',
    required: false,
  })
  @IsInt()
  @IsOptional()
  rentalItemId?: number;
}
