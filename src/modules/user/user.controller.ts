import { Body, Controller, Delete, ForbiddenException, Get, NotFoundException, Param, ParseIntPipe, Patch, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@ApiTags('user')
@ApiBearerAuth('access-token')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: 'Danh sách tất cả users (admin)' })
  @ApiResponse({ status: 200, description: 'Trả về mảng users' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền (yêu cầu admin)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('')
  findAll() {
    return this.userService.findAll();
  }

  @ApiOperation({ summary: 'Chi tiết user theo id' })
  @ApiResponse({ status: 200, description: 'Thông tin user' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy user' })
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.userService.findById(id);
    if (!user) {
      throw new NotFoundException('Người dùng không tìm thấy');
    }
    return user;
  }

  @ApiOperation({ summary: 'Tự đổi mật khẩu' })
  @ApiResponse({ status: 200, description: 'Đổi mật khẩu thành công' })
  @ApiResponse({ status: 400, description: 'Mật khẩu hiện tại không đúng' })
  @UseGuards(JwtAuthGuard)
  @Patch('me/password')
  async changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    await this.userService.changePassword(req.user.id, dto.currentPassword, dto.newPassword);
    return { message: 'Đổi mật khẩu thành công' };
  }

  @ApiOperation({ summary: 'Cập nhật thông tin user (chỉ self hoặc admin)' })
  @ApiResponse({ status: 200, description: 'User sau khi cập nhật' })
  @ApiResponse({ status: 403, description: 'Không có quyền cập nhật user khác' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy user' })
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Body() userData: UpdateUserDto, @Param('id', ParseIntPipe) id: number, @Request() req: any) {
    if (req.user.id !== id && req.user.role !== 'admin') {
      throw new ForbiddenException('Bạn chỉ có thể cập nhật thông tin của mình');
    }
    return this.userService.update(id, userData);
  }

  @ApiOperation({ summary: 'Admin: đổi role của user' })
  @ApiResponse({ status: 200, description: 'User sau khi đổi role' })
  @ApiResponse({ status: 403, description: 'Không có quyền (yêu cầu admin)' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy user' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id/role')
  updateRole(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserRoleDto) {
    return this.userService.updateRole(id, dto.role);
  }

  @ApiOperation({ summary: 'Admin: khôi phục user đã xóa' })
  @ApiResponse({ status: 200, description: 'User sau khi khôi phục' })
  @ApiResponse({ status: 400, description: 'User chưa bị xóa' })
  @ApiResponse({ status: 403, description: 'Không có quyền (yêu cầu admin)' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy user' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.userService.restore(id);
  }

  @ApiOperation({ summary: 'Xóa user (admin)' })
  @ApiResponse({ status: 200, description: 'User đã xóa' })
  @ApiResponse({ status: 403, description: 'Không có quyền (yêu cầu admin)' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy user' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.userService.delete(id);
  }
}
