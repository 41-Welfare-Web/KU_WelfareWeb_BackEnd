import { IsInt, IsNotEmpty, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddToCartDto {
  @ApiProperty({ example: 5, description: '장바구니에 담을 물품 ID' })
  @IsInt()
  @IsNotEmpty()
  itemId: number;

  @ApiProperty({ example: 1, description: '대여 수량 (최소 1)', minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}
