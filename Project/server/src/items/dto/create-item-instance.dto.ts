import { IsNotEmpty, IsOptional, IsString, IsEnum } from 'class-validator';
import { InstanceStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateItemInstanceDto {
  @ApiProperty({ example: 'MIC-01-01', description: '자산 관리 번호 / 시리얼 번호' })
  @IsString()
  @IsNotEmpty()
  serialNumber: string;

  @ApiProperty({ enum: InstanceStatus, example: 'AVAILABLE', description: '실물 상태' })
  @IsEnum(InstanceStatus)
  @IsOptional()
  status?: InstanceStatus;

  @ApiProperty({ example: 'https://example.com/item.jpg', description: '개별 품목 실물 이미지 URL', required: false })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}
