import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { GetUser } from '../auth/get-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('장바구니 (Cart)')
@ApiBearerAuth()
@Controller('cart')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: '내 장바구니 조회' })
  getCart(@GetUser() user: any) {
    return this.cartService.getCart(user.userId);
  }

  @Post()
  @ApiOperation({ summary: '장바구니 물품 추가 (동일 물품 존재 시 수량 덮어씀)' })
  addToCart(@GetUser() user: any, @Body() dto: AddToCartDto) {
    return this.cartService.addToCart(user.userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: '장바구니 항목 수량/날짜 수정' })
  updateCartItem(
    @GetUser() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateCartItem(user.userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '장바구니 항목 제거' })
  removeFromCart(@GetUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.cartService.removeFromCart(user.userId, id);
  }
}
