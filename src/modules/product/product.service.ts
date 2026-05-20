import { BadRequestException, Injectable, Inject, NotFoundException, Param } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import { Repository } from 'typeorm';
import { Category } from 'src/entities/Category';
import { Product } from 'src/entities/Product';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFilterDto } from 'src/common/dto/product-filter.dto';

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
            throw new NotFoundException('san pham khong tim thay');
        }
        return product;
    }

    async findAll(page = 1, limit = 10, filters?: ProductFilterDto) {
        const hasFilter = filters && Object.values(filters).some(v => v !== undefined && v !== '');

        if (!hasFilter) {
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

        const query = this.productRepository
            .createQueryBuilder('product')
            .leftJoinAndSelect('product.category', 'category')
            .orderBy('product.id', 'ASC')
            .skip((page - 1) * limit)
            .take(limit);

        if (filters!.name?.trim()) {
            query.andWhere('product.name LIKE :name', { name: `%${filters!.name.trim()}%` });
        }
        const categoryId = filters!.categoryId ?? filters!.category_id;
        if (categoryId !== undefined) {
            query.andWhere('category.id = :categoryId', { categoryId });
        }
        if (filters!.minPrice !== undefined) {
            query.andWhere('product.price >= :minPrice', { minPrice: filters!.minPrice });
        }
        if (filters!.maxPrice !== undefined) {
            query.andWhere('product.price <= :maxPrice', { maxPrice: filters!.maxPrice });
        }

        const [products, total] = await query.getManyAndCount();
        return { data: products, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    async create(productData: CreateProductDto) {
        const { category_id, description = '', ...rest } = productData;
        const product = this.productRepository.create({ ...rest, description });
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
            throw new NotFoundException('san pham khong tim thay');
        }
        await this.productRepository.softDelete(id);
        await this.cacheManager.clear();
        return product;
    }

    async restore(id: number) {
        const product = await this.productRepository.findOne({ where: { id }, withDeleted: true });
        if (!product) throw new NotFoundException('san pham khong tim thay');
        if (!product.deleted_at) throw new BadRequestException('San pham chua bi xoa');
        await this.productRepository.restore(id);
        await this.cacheManager.clear();
        return this.productRepository.findOneBy({ id });
    }

    private uploadImageToCloudinary(file: Express.Multer.File, productId: number): Promise<UploadApiResponse> {
        if (!file.buffer) {
            throw new BadRequestException('File upload khong hop le');
        }

        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        return new Promise((resolve, reject) => {
            const upload = cloudinary.uploader.upload_stream(
                {
                    folder: 'shopapp/products',
                    public_id: `product-${productId}-${Date.now()}`,
                    resource_type: 'image',
                    overwrite: true,
                },
                (error, result) => {
                    if (error || !result) {
                        return reject(error || new Error('Cloudinary upload did not return a result'));
                    }
                    resolve(result);
                },
            );

            upload.end(file.buffer);
        });
    }

    async updateImage(id: number, file: Express.Multer.File): Promise<Product> {
        const product = await this.find(id);
        const uploadResult = await this.uploadImageToCloudinary(file, id);
        product.image_url = uploadResult.secure_url;
        product.updated_at = new Date();
        const saved = await this.productRepository.save(product);
        await this.cacheManager.clear();
        return saved;
    }
}
