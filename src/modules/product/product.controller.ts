import { Logger, Body, Controller, Delete, Get, HttpException, HttpStatus, NotFoundException, Param, Patch, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { ProductService } from './product.service';
import { Product } from 'src/entities/Product';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';



@Controller('product')
@UsePipes(new ValidationPipe({transform: true}))
export class ProductController {
  private logger = new Logger(ProductController.name);

  constructor(
    private readonly productService: ProductService
  ) {}

  @Get('') // localhost:3000/product
  getAll() {
    return this.productService.findAll();
  }

  @Get(':id') // localhost:3000/product/1
  async findOne(@Param('id') id: number){
    const product = await this.productService.find(id);
    this.logger.log(product);
    if(!product){
      throw new NotFoundException(`sản phẩm ko tìm thấy`);
    }
    return product;
  }

  @Post('') // localhost:3000/product
  create(@Body() productData: CreateProductDto) {
    return this.productService.create(productData);
  }

  @Patch(':id') // localhost:3000/product/1
  update(@Body() productData: UpdateProductDto, @Param('id') id: number) {
    return this.productService.update(id, productData);
  }

  @Delete(':id') // localhost:3000/product/1
  delete(@Param('id') id: number) {
    return this.productService.delete(id);
  }
}
