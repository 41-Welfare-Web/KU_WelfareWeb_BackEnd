import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ManagementType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateItemDto {
  @ApiProperty({ example: 1, description: '카테고리 ID' })
  @IsInt()
  @IsNotEmpty()
  categoryId: number;

  @ApiProperty({ example: 'DSLR 카메라', description: '물품 이름' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'ITEM-001',
    description: '물품 코드 (미입력 시 자동 생성)',
    required: false,
  })
  @IsString()
  @IsOptional()
  itemCode?: string;

  @ApiProperty({
    example: '고화질 촬영용 카메라입니다.',
    description: '물품 상세 설명',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 'https://example.com/image.jpg',
    description: '이미지 URL',
    required: false,
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({
    example: 'https://www.youtube.com/watch?v=example',
    description: '사용법 영상 URL (유튜브 등)',
    required: false,
  })
  @IsString()
  @IsOptional()
  videoUrl?: string;

  @ApiProperty({
    enum: ManagementType,
    example: 'INDIVIDUAL',
    description: '관리 타입 (INDIVIDUAL, BULK)',
  })
  @IsEnum(ManagementType)
  @IsNotEmpty()
  managementType: ManagementType;

  @ApiProperty({
    example: 10,
    description: '총 수량 (BULK 타입일 때 사용)',
    required: false,
  })
  @IsInt()
  @IsOptional()
  @Min(0)
  totalQuantity?: number;
}
