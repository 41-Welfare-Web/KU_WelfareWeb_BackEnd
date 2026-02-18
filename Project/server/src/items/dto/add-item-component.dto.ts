import { IsInt, IsNotEmpty, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddItemComponentDto {
  @ApiProperty({ example: 2, description: '구성품으로 추가할 물품 ID' })
  @IsInt()
  @IsNotEmpty()
  componentId: number;

  @ApiProperty({ example: 1, description: '포함 수량' })
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  quantity: number;
}
