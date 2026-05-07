import { Injectable, Inject, NotFoundException, Param } from '@nestjs/common';
import { Product } from 'src/entities/Product';
import { Category } from 'src/entities/Category';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const PRODUCTS_CACHE_KEY = 'products_all';

@Injectable()
export class ProductService {
    constructor(
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
        @Inject(CACHE_MANAGER)
        private readonly cacheManager: Cache,
    ) {}

    async find(@Param('id') id: number) {
        const product = await this.productRepository.findOne({
            where: { id },
            relations: ['category'],
        });
        if (!product) {
            throw new NotFoundException(`sản phẩm ko tìm thấy`);
        }
        return product;
    }

    async findAll(): Promise<Product[]> {
        const cached = await this.cacheManager.get<Product[]>(PRODUCTS_CACHE_KEY);
        if (cached) return cached;
        const products = await this.productRepository.find({ relations: ['category'] });
        await this.cacheManager.set(PRODUCTS_CACHE_KEY, products);
        return products;
    }

    async create(productData: CreateProductDto) {
        const { category_id, ...rest } = productData;
        const product = this.productRepository.create(rest);
        if (category_id) {
            product.category = { id: category_id } as Category;
        }
        product.created_at = new Date();
        product.updated_at = new Date();
        const saved = await this.productRepository.save(product);
        await this.cacheManager.del(PRODUCTS_CACHE_KEY);
        return saved;
    }

    async update(id: number, productData: UpdateProductDto) {
        const { category_id, ...rest } = productData;
        const updatePayload: Partial<Product> = { ...rest, updated_at: new Date() };
        if (category_id) {
            updatePayload.category = { id: category_id } as Category;
        }
        await this.productRepository.save({ id, ...updatePayload });
        const updated = await this.productRepository.findOne({
            where: { id },
            relations: ['category'],
        });
        await this.cacheManager.del(PRODUCTS_CACHE_KEY);
        return updated;
    }

    async delete(id: number) {
        const product = await this.productRepository.findOneBy({ id });
        if (!product) {
            throw new NotFoundException(`sản phẩm ko tìm thấy`);
        }
        await this.productRepository.delete(id);
        await this.cacheManager.del(PRODUCTS_CACHE_KEY);
        return product;
    }
}
