import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { ProductService } from './product.service';
import { Product } from 'src/entities/Product';

const mockProduct: Product = {
  id: 1,
  name: 'Test Product',
  price: 100,
  stock: 5,
  description: 'Test description',
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
};

const mockRepository = {
  find: jest.fn(),
  findAndCount: jest.fn(),
  createQueryBuilder: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  softDelete: jest.fn(),
  restore: jest.fn(),
};

const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  clear: jest.fn(),
};

const mockConfigService = {
  get: jest.fn(),
};

const createMockQueryBuilder = () => {
  const queryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockProduct], 1]),
  };
  return queryBuilder;
};

describe('ProductService', () => {
  let service: ProductService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: getRepositoryToken(Product), useValue: mockRepository },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('cache miss: query DB với findAndCount và set cache', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockRepository.findAndCount.mockResolvedValue([[mockProduct], 1]);

      const result = await service.findAll(1, 10);

      expect(mockCacheManager.get).toHaveBeenCalledWith(
        'products_page_1_limit_10',
      );
      expect(mockRepository.findAndCount).toHaveBeenCalledTimes(1);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'products_page_1_limit_10',
        expect.objectContaining({
          data: [mockProduct],
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({ data: [mockProduct], total: 1 }),
      );
    });

    it('cache hit: trả về từ cache, không query DB', async () => {
      const cached = {
        data: [mockProduct],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      mockCacheManager.get.mockResolvedValue(cached);

      const result = await service.findAll(1, 10);

      expect(mockCacheManager.get).toHaveBeenCalledWith(
        'products_page_1_limit_10',
      );
      expect(mockRepository.findAndCount).not.toHaveBeenCalled();
      expect(result).toEqual(cached);
    });

    it('page mặc định là 1, limit mặc định là 10', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll();

      expect(mockCacheManager.get).toHaveBeenCalledWith(
        'products_page_1_limit_10',
      );
    });

    it('co filter name thi dung query builder, khong check cache', async () => {
      const queryBuilder = createMockQueryBuilder();
      mockRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.findAll(1, 10, { name: 'phone' });

      expect(mockCacheManager.get).not.toHaveBeenCalled();
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'product.name LIKE :name',
        { name: '%phone%' },
      );
      expect(result.data).toEqual([mockProduct]);
    });

    it('co filter categoryId thi filter theo category.id', async () => {
      const queryBuilder = createMockQueryBuilder();
      mockRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      await service.findAll(1, 10, { categoryId: 2 });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'category.id = :categoryId',
        { categoryId: 2 },
      );
    });
  });

  describe('restore', () => {
    it('khôi phục product đã soft delete thành công', async () => {
      const deletedProduct = { ...mockProduct, deleted_at: new Date() } as any;
      const restoredProduct = { ...mockProduct, deleted_at: null } as any;
      mockRepository.findOne.mockResolvedValue(deletedProduct);
      mockRepository.restore.mockResolvedValue({ affected: 1 });
      mockCacheManager.clear.mockResolvedValue(true);
      mockRepository.findOneBy.mockResolvedValue(restoredProduct);

      const result = await service.restore(1);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        withDeleted: true,
      });
      expect(mockRepository.restore).toHaveBeenCalledWith(1);
      expect(mockCacheManager.clear).toHaveBeenCalledTimes(1);
      expect(result).toEqual(restoredProduct);
    });

    it('throw NotFoundException khi product không tồn tại', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(service.restore(999)).rejects.toThrow(NotFoundException);
    });

    it('throw BadRequestException khi product chưa bị xóa', async () => {
      mockRepository.findOne.mockResolvedValue({
        ...mockProduct,
        deleted_at: null,
      });
      await expect(service.restore(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('find', () => {
    it('trả về product khi tìm thấy', async () => {
      mockRepository.findOne.mockResolvedValue(mockProduct);
      const result = await service.find(1);
      expect(result).toEqual(mockProduct);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['category'],
      });
    });

    it('throw NotFoundException khi không tìm thấy', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(service.find(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('tạo product với timestamps, clear cache, trả về product đã lưu', async () => {
      const dto = {
        name: 'New Product',
        price: 200,
        stock: 10,
        description: 'Desc',
      };
      const built = { ...dto } as Product;
      mockRepository.create.mockReturnValue(built);
      mockRepository.save.mockResolvedValue({ ...built, id: 2 });
      mockCacheManager.clear.mockResolvedValue(true);

      const result = await service.create(dto);

      expect(mockRepository.create).toHaveBeenCalledWith(dto);
      expect(built.created_at).toBeInstanceOf(Date);
      expect(built.updated_at).toBeInstanceOf(Date);
      expect(mockRepository.save).toHaveBeenCalledWith(built);
      expect(mockCacheManager.clear).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });
  });

  describe('update', () => {
    it('cập nhật product, clear cache, trả về product sau khi cập nhật', async () => {
      const updated = { ...mockProduct, name: 'Updated' };
      mockRepository.save.mockResolvedValue(undefined);
      mockRepository.findOne.mockResolvedValue(updated);
      mockCacheManager.clear.mockResolvedValue(true);

      const result = await service.update(1, { name: 'Updated' });

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, name: 'Updated' }),
      );
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['category'],
      });
      expect(mockCacheManager.clear).toHaveBeenCalledTimes(1);
      expect(result).toEqual(updated);
    });
  });

  describe('delete', () => {
    it('soft delete product, clear cache, trả về product đã xóa', async () => {
      mockRepository.findOneBy.mockResolvedValue(mockProduct);
      mockRepository.softDelete.mockResolvedValue({ affected: 1 });
      mockCacheManager.clear.mockResolvedValue(true);

      const result = await service.delete(1);

      expect(mockRepository.softDelete).toHaveBeenCalledWith(1);
      expect(mockCacheManager.clear).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockProduct);
    });

    it('throw NotFoundException khi product không tồn tại', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);
      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
      expect(mockRepository.softDelete).not.toHaveBeenCalled();
      expect(mockCacheManager.clear).not.toHaveBeenCalled();
    });
  });
});
