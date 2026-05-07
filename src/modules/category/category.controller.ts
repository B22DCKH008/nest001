import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';

@ApiTags('category')
@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @ApiOperation({ summary: 'Danh sách tất cả danh mục' })
  @ApiResponse({ status: 200, description: 'Trả về mảng categories' })
  @Get('')
  getAll() {
    return this.categoryService.findAll();
  }

  @ApiOperation({ summary: 'Chi tiết danh mục theo id' })
  @ApiResponse({ status: 200, description: 'Thông tin category' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy danh mục' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.find(id);
  }

  @ApiOperation({ summary: 'Tạo danh mục mới (admin)' })
  @ApiBearerAuth('access-token')
  @ApiResponse({ status: 201, description: 'Danh mục đã tạo' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền (yêu cầu admin)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('')
  create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @ApiOperation({ summary: 'Cập nhật danh mục (admin)' })
  @ApiBearerAuth('access-token')
  @ApiResponse({ status: 200, description: 'Danh mục sau khi cập nhật' })
  @ApiResponse({ status: 403, description: 'Không có quyền (yêu cầu admin)' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy danh mục' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.update(id, dto);
  }

  @ApiOperation({ summary: 'Xóa danh mục (admin)' })
  @ApiBearerAuth('access-token')
  @ApiResponse({ status: 200, description: 'Danh mục đã xóa' })
  @ApiResponse({ status: 403, description: 'Không có quyền (yêu cầu admin)' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy danh mục' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.delete(id);
  }
}
