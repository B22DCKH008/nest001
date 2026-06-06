import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';

@ApiTags('order')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @ApiOperation({ summary: 'Tạo đơn hàng từ cart hiện tại' })
  @ApiResponse({ status: 201, description: 'Đơn hàng đã tạo, cart được xóa' })
  @Post('checkout')
  checkout(@Request() req: any) {
    return this.orderService.checkout(req.user.id);
  }

  @ApiOperation({ summary: 'Admin: xem tất cả đơn hàng' })
  @ApiResponse({ status: 200, description: 'Tất cả đơn hàng kèm khách hàng và sản phẩm' })
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Get('admin/all')
  findAllAdmin(@Query() pagination: PaginationDto) {
    return this.orderService.findAllAdmin(pagination.page, pagination.limit);
  }

  @ApiOperation({ summary: 'Admin: cập nhật trạng thái đơn hàng' })
  @ApiResponse({ status: 200, description: 'Order sau khi cập nhật' })
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Patch('admin/:id/status')
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOrderStatusDto) {
    return this.orderService.updateStatus(id, dto);
  }

  @ApiOperation({ summary: 'Danh sách đơn hàng của user hiện tại' })
  @ApiResponse({ status: 200, description: 'PaginatedResult<Order>' })
  @Get('')
  findAll(@Request() req: any, @Query() pagination: PaginationDto) {
    return this.orderService.findAll(req.user.id, pagination.page, pagination.limit);
  }

  @ApiOperation({ summary: 'Chi tiết một đơn hàng của user hiện tại' })
  @ApiResponse({ status: 200, description: 'Thông tin order' })
  @Get(':id')
  findOne(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.orderService.findOne(req.user.id, id);
  }

  @ApiOperation({ summary: 'Huỷ đơn hàng khi status = pending' })
  @ApiResponse({ status: 200, description: 'Đơn hàng đã huỷ' })
  @Patch(':id/cancel')
  cancel(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.orderService.cancel(req.user.id, id);
  }
}
