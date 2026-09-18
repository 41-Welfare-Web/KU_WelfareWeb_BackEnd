import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { RentalStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRentalStatusDto {
  @ApiProperty({
    enum: RentalStatus,
    example: 'RENTED',
    description:
      '변경할 대여 상태. 생략 시 현재 상태를 유지하고 메모만 업데이트',
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
    description:
      '개별 품목 상태 변경 시 대상 RentalItem ID. 지정 시 해당 품목만 변경, 생략 시 전체 일괄 변경',
    required: false,
  })
  @IsInt()
  @IsOptional()
  rentalItemId?: number;

  @ApiProperty({
    example: [3, 7],
    description:
      '출고할 개별 실물(ItemInstance) ID 목록. RENTED로 변경할 때만 사용하며 rentalItemId 필수. ' +
      '신청 수량보다 적게 보내면 해당 품목의 수량이 보낸 개수로 함께 조정됩니다(부분 출고).',
    required: false,
    type: [Number],
  })
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @IsOptional()
  instanceIds?: number[];
}
