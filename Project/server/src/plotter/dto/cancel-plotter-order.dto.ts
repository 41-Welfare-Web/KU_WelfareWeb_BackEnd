import { IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DEPARTMENT_TYPES } from '../../auth/dto/register.dto';

export class CancelPlotterOrderDto {
  @ApiProperty({
    example: '학과',
    description: '취소 시점의 소속 유형',
    enum: DEPARTMENT_TYPES,
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(DEPARTMENT_TYPES)
  departmentType: string;

  @ApiProperty({
    example: '컴퓨터공학과',
    description: '취소 시점의 소속 단위명',
    required: false,
  })
  @IsString()
  @IsOptional()
  departmentName?: string;
}
