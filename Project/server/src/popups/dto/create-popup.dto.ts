import { IsBoolean, IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePopupDto {
  @ApiProperty({ example: '5월 운영 안내', description: '팝업 제목' })
  @IsString()
  @MaxLength(100)
  title: string;

  @ApiProperty({ example: '5월 1일은 휴무입니다.', description: '팝업 본문 텍스트', required: false })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({ example: 'https://...', description: '팝업 이미지 URL', required: false })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ example: '2026-05-01', description: '표시 시작일 (YYYY-MM-DD)' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-05-07', description: '표시 종료일 (YYYY-MM-DD)' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: true, description: '활성화 여부', required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
