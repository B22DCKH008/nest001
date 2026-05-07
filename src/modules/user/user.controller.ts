import { Body, Controller, Delete, Get, NotFoundException, Param, ParseIntPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { UpdateUserDto } from './dto/update-user.dto';

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

  @ApiOperation({ summary: 'Cập nhật thông tin user' })
  @ApiResponse({ status: 200, description: 'User sau khi cập nhật' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy user' })
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Body() userData: UpdateUserDto, @Param('id', ParseIntPipe) id: number) {
    return this.userService.update(id, userData);
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
