import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
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

  @ApiOperation({ summary: 'Tạo đơn hàng từ cart hiện tại (checkout)' })
  @ApiResponse({ status: 201, description: 'Đơn hàng đã tạo, cart được xoá' })
  @ApiResponse({ status: 400, description: 'Giỏ hàng trống' })
  @Post('checkout')
  checkout(@Request() req: any) {
    return this.orderService.checkout(req.user.id);
  }

  @ApiOperation({ summary: 'Danh sách đơn hàng của user hiện tại (có phân trang)' })
  @ApiResponse({ status: 200, description: 'PaginatedResult<Order>' })
  @Get('')
  findAll(@Request() req: any, @Query() pagination: PaginationDto) {
    return this.orderService.findAll(req.user.id, pagination.page, pagination.limit);
  }

  @ApiOperation({ summary: 'Chi tiết một đơn hàng (chỉ xem được của mình)' })
  @ApiResponse({ status: 200, description: 'Thông tin order' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
  @Get(':id')
  findOne(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.orderService.findOne(req.user.id, id);
  }

  @ApiOperation({ summary: 'Huỷ đơn hàng (chỉ khi status = pending)' })
  @ApiResponse({ status: 200, description: 'Đơn hàng đã huỷ' })
  @ApiResponse({ status: 400, description: 'Không thể huỷ đơn hàng ở trạng thái này' })
  @Patch(':id/cancel')
  cancel(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.orderService.cancel(req.user.id, id);
  }

  @ApiOperation({ summary: 'Admin: xem tất cả đơn hàng' })
  @ApiResponse({ status: 200, description: 'Tất cả orders' })
  @ApiResponse({ status: 403, description: 'Không có quyền (yêu cầu admin)' })
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Get('admin/all')
  findAllAdmin(@Query() pagination: PaginationDto) {
    return this.orderService.findAllAdmin(pagination.page, pagination.limit);
  }

  @ApiOperation({ summary: 'Admin: cập nhật trạng thái đơn hàng' })
  @ApiResponse({ status: 200, description: 'Order sau khi cập nhật' })
  @ApiResponse({ status: 403, description: 'Không có quyền (yêu cầu admin)' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Patch('admin/:id/status')
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOrderStatusDto) {
    return this.orderService.updateStatus(id, dto);
  }
}
