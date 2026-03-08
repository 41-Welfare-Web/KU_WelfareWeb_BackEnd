import { IsNotEmpty, IsString, IsInt, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { DEPARTMENT_TYPES } from '../../auth/dto/register.dto';

export class CreatePlotterOrderDto {
  @ApiProperty({
    example: '학과',
    description: '신청 시 소속 유형',
    enum: DEPARTMENT_TYPES,
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(DEPARTMENT_TYPES)
  departmentType: string;

  @ApiProperty({
    example: '컴퓨터공학과',
    description: '신청 시 소속 단위명',
    required: false,
  })
  @IsString()
  @IsOptional()
  departmentName?: string;

  @ApiProperty({ example: '졸업 작품 포스터', description: '인쇄 목적' })
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
  pageCount: number;

  @ApiProperty({
    example: '2026-03-15',
    description: '수령 희망 일자 (YYYY-MM-DD)',
  })
  @IsString()
  @IsNotEmpty()
  pickupDate: string;
}

export class CreatePlotterOrderWithFilesDto extends CreatePlotterOrderDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: '인쇄할 PDF 파일',
  })
  pdfFile: any;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: '결제 영수증 이미지 (유료 시 필수)',
    required: false,
  })
  paymentReceiptImage?: any;
}
