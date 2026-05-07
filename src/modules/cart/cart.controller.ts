import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

@ApiTags('cart')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @ApiOperation({ summary: 'Lấy cart của user hiện tại (tạo mới nếu chưa có)' })
  @ApiResponse({ status: 200, description: 'Cart với danh sách items' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @Get('')
  getCart(@Request() req: any) {
    return this.cartService.getOrCreateCart(req.user.id);
  }

  @ApiOperation({ summary: 'Thêm sản phẩm vào cart (nếu đã có → cộng quantity)' })
  @ApiResponse({ status: 201, description: 'Cart sau khi thêm item' })
  @ApiResponse({ status: 404, description: 'Sản phẩm không tồn tại' })
  @Post('items')
  addItem(@Request() req: any, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(req.user.id, dto);
  }

  @ApiOperation({ summary: 'Cập nhật số lượng item (quantity=0 → xóa item)' })
  @ApiResponse({ status: 200, description: 'Cart sau khi cập nhật' })
  @ApiResponse({ status: 404, description: 'Item không tồn tại' })
  @Patch('items/:itemId')
  updateItem(
    @Request() req: any,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(req.user.id, itemId, dto);
  }

  @ApiOperation({ summary: 'Xóa một item khỏi cart' })
  @ApiResponse({ status: 200, description: 'Cart sau khi xóa item' })
  @ApiResponse({ status: 404, description: 'Item không tồn tại' })
  @Delete('items/:itemId')
  removeItem(@Request() req: any, @Param('itemId', ParseIntPipe) itemId: number) {
    return this.cartService.removeItem(req.user.id, itemId);
  }

  @ApiOperation({ summary: 'Xóa toàn bộ items trong cart' })
  @ApiResponse({ status: 200, description: 'Cart trống' })
  @Delete('')
  clearCart(@Request() req: any) {
    return this.cartService.clearCart(req.user.id);
  }
}
