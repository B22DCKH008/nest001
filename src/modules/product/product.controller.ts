import { Logger, Body, Controller, Delete, Get, NotFoundException, Param, ParseIntPipe, Patch, Post, Query, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
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
  getAll(@Query() query: ProductFilterDto) {
    const { page = 1, limit = 10, ...filter } = query;
    return this.productService.findAll(page, limit, filter);
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

  @ApiOperation({ summary: 'Upload ảnh sản phẩm (admin)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { image: { type: 'string', format: 'binary' } } } })
  @ApiBearerAuth('access-token')
  @ApiResponse({ status: 201, description: 'Sản phẩm sau khi cập nhật ảnh' })
  @ApiResponse({ status: 400, description: 'File không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sản phẩm' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post(':id/image')
  @UseInterceptors(FileInterceptor('image', {
    storage: memoryStorage(),
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new BadRequestException('Chỉ chấp nhận file ảnh (jpg, png, webp...)') as any, false);
      }
      cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  uploadImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Không có file được upload');
    return this.productService.updateImage(id, file);
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
