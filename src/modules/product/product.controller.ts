import { Logger, Body, Controller, Delete, Get, NotFoundException, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { ProductFilterDto } from 'src/common/dto/product-filter.dto';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';

@ApiTags('product')
@Controller('product')
export class ProductController {
  private logger = new Logger(ProductController.name);

  constructor(private readonly productService: ProductService) {}

  @ApiOperation({ summary: 'Danh sách sản phẩm có phân trang + filter (kèm category)' })
  @ApiResponse({ status: 200, description: 'Trả về PaginatedResult<Product>' })
  @Get('')
  getAll(@Query() pagination: PaginationDto, @Query() filter: ProductFilterDto) {
    return this.productService.findAll(pagination.page, pagination.limit, filter);
  }

  @ApiOperation({ summary: 'Chi tiết sản phẩm theo id' })
  @ApiResponse({ status: 200, description: 'Thông tin product' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sản phẩm' })
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const product = await this.productService.find(id);
    this.logger.log(product);
    if (!product) {
      throw new NotFoundException(`sản phẩm ko tìm thấy`);
    }
    return product;
  }

  @ApiOperation({ summary: 'Tạo sản phẩm mới (admin)' })
  @ApiBearerAuth('access-token')
  @ApiResponse({ status: 201, description: 'Sản phẩm đã tạo' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền (yêu cầu admin)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('')
  create(@Body() productData: CreateProductDto) {
    return this.productService.create(productData);
  }

  @ApiOperation({ summary: 'Cập nhật sản phẩm (admin)' })
  @ApiBearerAuth('access-token')
  @ApiResponse({ status: 200, description: 'Sản phẩm sau khi cập nhật' })
  @ApiResponse({ status: 403, description: 'Không có quyền (yêu cầu admin)' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sản phẩm' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id')
  update(@Body() productData: UpdateProductDto, @Param('id', ParseIntPipe) id: number) {
    return this.productService.update(id, productData);
  }

  @ApiOperation({ summary: 'Admin: khôi phục sản phẩm đã xóa' })
  @ApiBearerAuth('access-token')
  @ApiResponse({ status: 200, description: 'Sản phẩm sau khi khôi phục' })
  @ApiResponse({ status: 400, description: 'Sản phẩm chưa bị xóa' })
  @ApiResponse({ status: 403, description: 'Không có quyền (yêu cầu admin)' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sản phẩm' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.productService.restore(id);
  }

  @ApiOperation({ summary: 'Xóa sản phẩm (admin)' })
  @ApiBearerAuth('access-token')
  @ApiResponse({ status: 200, description: 'Sản phẩm đã xóa' })
  @ApiResponse({ status: 403, description: 'Không có quyền (yêu cầu admin)' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sản phẩm' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.productService.delete(id);
  }
}
