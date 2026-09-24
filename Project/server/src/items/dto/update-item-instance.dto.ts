import { IsOptional, IsString, IsEnum } from 'class-validator';
import { InstanceStatus, PartCondition } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateItemInstanceDto {
  @ApiProperty({
    example: 'MIC-01-01',
    description: '자산 관리 번호 / 시리얼 번호',
    required: false,
  })
  @IsString()
  @IsOptional()
  serialNumber?: string;

  @ApiProperty({
    enum: InstanceStatus,
    example: 'AVAILABLE',
    description: '실물 상태',
    required: false,
  })
  @IsEnum(InstanceStatus)
  @IsOptional()
  status?: InstanceStatus;

  @ApiProperty({
    example: 'https://example.com/item.jpg',
    description: '개별 품목 실물 이미지 URL',
    required: false,
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({
    example: '지지대 1개 휘어짐',
    description: '관리자용 비고',
    required: false,
  })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiProperty({
    enum: PartCondition,
    example: 'NORMAL',
    description:
      '천(원단) 상태. NORMAL(정상) / LOW(파손 하) / MEDIUM(파손 중) / HIGH(파손 상). 기록·표시용이며 출고 차단과는 무관',
    required: false,
  })
  @IsEnum(PartCondition)
  @IsOptional()
  fabricCondition?: PartCondition;

  @ApiProperty({
    enum: PartCondition,
    example: 'NORMAL',
    description: '다리(프레임) 상태. NORMAL / LOW / MEDIUM / HIGH',
    required: false,
  })
  @IsEnum(PartCondition)
  @IsOptional()
  frameCondition?: PartCondition;
}
