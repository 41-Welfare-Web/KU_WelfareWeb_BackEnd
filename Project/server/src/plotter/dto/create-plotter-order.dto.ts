import { IsNotEmpty, IsString, IsBoolean, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePlotterOrderDto {
  @IsString()
  @IsNotEmpty()
  purpose: string;

  @IsString()
  @IsNotEmpty()
  paperSize: string;

  @IsString() // form-data로 오면 string일 수 있음, transform은 main.ts 설정 의존
  @IsNotEmpty()
  pageCount: number;

  @IsBoolean() // form-data의 경우 Transform 필요할 수 있음
  @IsNotEmpty()
  isPaidService: boolean;
}
