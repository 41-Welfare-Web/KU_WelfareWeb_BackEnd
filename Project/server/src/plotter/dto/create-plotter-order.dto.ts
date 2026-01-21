import { IsNotEmpty, IsString, IsBoolean, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePlotterOrderDto {
  @IsString()
  @IsNotEmpty()
  purpose: string;

  @IsString()
  @IsNotEmpty()
  paper_size: string;

  @IsInt()
  @Type(() => Number) // form-data는 문자열로 오므로 숫자로 변환
  @IsNotEmpty()
  page_count: number;

  @IsBoolean()
  @Type(() => Boolean) // 문자열 "true"/"false"를 불리언으로 변환
  is_paid_service: boolean;
}
