import { Injectable, Inject, NotFoundException, Param } from '@nestjs/common';
import { Product } from 'src/entities/Product';
import { Category } from 'src/entities/Category';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

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

    async findAll(page = 1, limit = 10) {
        const cacheKey = `products_page_${page}_limit_${limit}`;
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) return cached;

        const [products, total] = await this.productRepository.findAndCount({
            relations: ['category'],
            skip: (page - 1) * limit,
            take: limit,
            order: { id: 'ASC' },
        });

        const result = { data: products, total, page, limit, totalPages: Math.ceil(total / limit) };
        await this.cacheManager.set(cacheKey, result);
        return result;
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
        await this.cacheManager.clear();
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
        await this.cacheManager.clear();
        return updated;
    }

    async delete(id: number) {
        const product = await this.productRepository.findOneBy({ id });
        if (!product) {
            throw new NotFoundException(`sản phẩm ko tìm thấy`);
        }
        await this.productRepository.delete(id);
        await this.cacheManager.clear();
        return product;
    }
}
