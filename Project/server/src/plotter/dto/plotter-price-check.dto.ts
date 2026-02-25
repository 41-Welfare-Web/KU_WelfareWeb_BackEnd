import { IsNotEmpty, IsString, IsInt, Min } from 'class-validator';
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
}
