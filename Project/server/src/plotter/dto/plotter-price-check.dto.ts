import { IsNotEmpty, IsString, IsInt, Min, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class PlotterPriceCheckDto {
  @ApiProperty({ example: '예산안 출력', description: '인쇄 목적' })
  @IsString()
  @IsNotEmpty()
  purpose: string;

  @ApiProperty({ example: 'A0', description: '용지 크기 (A0, A1)' })
  @IsString()
  @IsNotEmpty()
  paperSize: string;

  @ApiProperty({ example: 1, description: '인쇄 페이지 수' })
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  pageCount: number;

  @ApiProperty({
    example: '자치기구',
    description: '소속 유형 (선택 사항, 미입력 시 사용자 기본 정보 사용)',
    required: false,
  })
  @IsString()
  @IsOptional()
  departmentType?: string;

  @ApiProperty({
    example: '테스트동아리',
    description: '상세 소속명 (선택 사항)',
    required: false,
  })
  @IsString()
  @IsOptional()
  departmentName?: string;
}
