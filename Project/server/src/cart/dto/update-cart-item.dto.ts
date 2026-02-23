import { IsInt, IsOptional, IsDateString, Min, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCartItemDto {
  @ApiPropertyOptional({ example: 2, description: '변경할 수량' })
  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({
    example: '2026-03-05',
    nullable: true,
    description: '변경할 시작일. null 전송 시 날짜 초기화',
  })
  @ValidateIf((o) => o.startDate !== null && o.startDate !== undefined)
  @IsDateString()
  @IsOptional()
  startDate?: string | null;

  @ApiPropertyOptional({
    example: '2026-03-07',
    nullable: true,
    description: '변경할 반납일. null 전송 시 날짜 초기화',
  })
  @ValidateIf((o) => o.endDate !== null && o.endDate !== undefined)
  @IsDateString()
  @IsOptional()
  endDate?: string | null;
}
