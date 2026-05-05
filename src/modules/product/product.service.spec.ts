import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
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
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('ProductService', () => {
  let service: ProductService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('trả về mảng products', async () => {
      mockRepository.find.mockResolvedValue([mockProduct]);
      const result = await service.findAll();
      expect(result).toEqual([mockProduct]);
      expect(mockRepository.find).toHaveBeenCalledTimes(1);
    });
  });

  describe('find', () => {
    it('trả về product khi tìm thấy', async () => {
      mockRepository.findOneBy.mockResolvedValue(mockProduct);
      const result = await service.find(1);
      expect(result).toEqual(mockProduct);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
    });

    it('throw NotFoundException khi không tìm thấy', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);
      await expect(service.find(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('tạo product với created_at và updated_at, trả về product đã lưu', async () => {
      const dto = { name: 'New Product', price: 200, description: 'Desc' };
      const built = { ...dto } as Product;
      mockRepository.create.mockReturnValue(built);
      mockRepository.save.mockResolvedValue({ ...built, id: 2, created_at: expect.any(Date), updated_at: expect.any(Date) });

      const result = await service.create(dto);

      expect(mockRepository.create).toHaveBeenCalledWith(dto);
      expect(built.created_at).toBeInstanceOf(Date);
      expect(built.updated_at).toBeInstanceOf(Date);
      expect(mockRepository.save).toHaveBeenCalledWith(built);
      expect(result).toBeDefined();
    });
  });

  describe('update', () => {
    it('cập nhật product và trả về product sau khi cập nhật', async () => {
      const updated = { ...mockProduct, name: 'Updated', updated_at: expect.any(Date) };
      mockRepository.update.mockResolvedValue(undefined);
      mockRepository.findOneBy.mockResolvedValue(updated);

      const result = await service.update(1, { name: 'Updated' });

      expect(mockRepository.update).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'Updated' }));
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(result).toEqual(updated);
    });
  });

  describe('delete', () => {
    it('xóa product và trả về product đã xóa khi tìm thấy', async () => {
      mockRepository.findOneBy.mockResolvedValue(mockProduct);
      mockRepository.delete.mockResolvedValue(undefined);

      const result = await service.delete(1);

      expect(mockRepository.delete).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockProduct);
    });

    it('throw NotFoundException khi product không tồn tại', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);
      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });
  });
});
