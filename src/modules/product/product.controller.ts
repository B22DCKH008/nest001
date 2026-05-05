import { Logger, Body, Controller, Delete, Get, NotFoundException, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('product')
export class ProductController {
  private logger = new Logger(ProductController.name);

  constructor(
    private readonly productService: ProductService
  ) {}

  @Get('')
  getAll() {
    return this.productService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const product = await this.productService.find(id);
    this.logger.log(product);
    if (!product) {
      throw new NotFoundException(`sản phẩm ko tìm thấy`);
    }
    return product;
  }

  @Post('')
  create(@Body() productData: CreateProductDto) {
    return this.productService.create(productData);
  }

  @Patch(':id')
  update(@Body() productData: UpdateProductDto, @Param('id', ParseIntPipe) id: number) {
    return this.productService.update(id, productData);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.productService.delete(id);
  }
}
