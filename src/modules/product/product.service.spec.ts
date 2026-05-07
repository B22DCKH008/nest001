import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ProductService } from './product.service';
import { Product } from 'src/entities/Product';

const mockProduct: Product = {
  id: 1,
  name: 'Test Product',
  price: 100,
  description: 'Test description',
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
};

const mockRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

describe('ProductService', () => {
  let service: ProductService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: getRepositoryToken(Product), useValue: mockRepository },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('cache miss: query DB và set cache', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockRepository.find.mockResolvedValue([mockProduct]);

      const result = await service.findAll();

      expect(mockCacheManager.get).toHaveBeenCalledWith('products_all');
      expect(mockRepository.find).toHaveBeenCalledTimes(1);
      expect(mockCacheManager.set).toHaveBeenCalledWith('products_all', [mockProduct]);
      expect(result).toEqual([mockProduct]);
    });

    it('cache hit: trả về từ cache, không query DB', async () => {
      mockCacheManager.get.mockResolvedValue([mockProduct]);

      const result = await service.findAll();

      expect(mockCacheManager.get).toHaveBeenCalledWith('products_all');
      expect(mockRepository.find).not.toHaveBeenCalled();
      expect(result).toEqual([mockProduct]);
    });
  });

  describe('find', () => {
    it('trả về product khi tìm thấy', async () => {
      mockRepository.findOne.mockResolvedValue(mockProduct);
      const result = await service.find(1);
      expect(result).toEqual(mockProduct);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 }, relations: ['category'] });
    });

    it('throw NotFoundException khi không tìm thấy', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(service.find(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('tạo product với timestamps, xóa cache, trả về product đã lưu', async () => {
      const dto = { name: 'New Product', price: 200, description: 'Desc' };
      const built = { ...dto } as Product;
      mockRepository.create.mockReturnValue(built);
      mockRepository.save.mockResolvedValue({ ...built, id: 2 });

      const result = await service.create(dto);

      expect(mockRepository.create).toHaveBeenCalledWith(dto);
      expect(built.created_at).toBeInstanceOf(Date);
      expect(built.updated_at).toBeInstanceOf(Date);
      expect(mockRepository.save).toHaveBeenCalledWith(built);
      expect(mockCacheManager.del).toHaveBeenCalledWith('products_all');
      expect(result).toBeDefined();
    });
  });

  describe('update', () => {
    it('cập nhật product, xóa cache, trả về product sau khi cập nhật', async () => {
      const updated = { ...mockProduct, name: 'Updated' };
      mockRepository.save.mockResolvedValue(undefined);
      mockRepository.findOne.mockResolvedValue(updated);

      const result = await service.update(1, { name: 'Updated' });

      expect(mockRepository.save).toHaveBeenCalledWith(expect.objectContaining({ id: 1, name: 'Updated' }));
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 }, relations: ['category'] });
      expect(mockCacheManager.del).toHaveBeenCalledWith('products_all');
      expect(result).toEqual(updated);
    });
  });

  describe('delete', () => {
    it('xóa product, xóa cache, trả về product đã xóa', async () => {
      mockRepository.findOneBy.mockResolvedValue(mockProduct);
      mockRepository.delete.mockResolvedValue(undefined);

      const result = await service.delete(1);

      expect(mockRepository.delete).toHaveBeenCalledWith(1);
      expect(mockCacheManager.del).toHaveBeenCalledWith('products_all');
      expect(result).toEqual(mockProduct);
    });

    it('throw NotFoundException khi product không tồn tại', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);
      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
      expect(mockRepository.delete).not.toHaveBeenCalled();
      expect(mockCacheManager.del).not.toHaveBeenCalled();
    });
  });
});
