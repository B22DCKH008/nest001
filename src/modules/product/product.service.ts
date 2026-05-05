import { HttpStatus, Injectable, NotFoundException, Param } from '@nestjs/common';
import { Product } from 'src/entities/Product';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { STATUS_CODES } from 'http';

@Injectable()
export class ProductService {
    constructor(
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
    ) {}

    async find(@Param('id') id: number) {
        const product = await this.productRepository.findOneBy({id});
        if (!product) {
            throw new NotFoundException(`sản phẩm ko tìm thấy`);
        }
        return product;
    }

    findAll() {
        return this.productRepository.find();
    }

    create(productData: Partial<Product>) {
        const product = this.productRepository.create(productData);
        product.created_at = new Date();
        product.updated_at = new Date();
        return this.productRepository.save(product);
    }

    async update(id: number, productData: Partial<Product>) {
        productData.updated_at = new Date();
        await this.productRepository.update(id, productData);
        return this.productRepository.findOneBy({id});
    }

    async delete(id: number) {
        const product = await this.productRepository.findOneBy({id});
        if (!product) {
            throw new NotFoundException(`sản phẩm ko tìm thấy`);
        }
        await this.productRepository.delete(id);
        return product;
    }
}
    

