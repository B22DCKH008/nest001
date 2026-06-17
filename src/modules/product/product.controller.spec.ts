import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';

const mockProduct = {
  id: 1,
  name: 'Test Product',
  price: 100,
  stock: 5,
  description: 'Test description',
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
};

const mockProductService = {
  findAll: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  restore: jest.fn(),
};

describe('ProductController', () => {
  let controller: ProductController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [{ provide: ProductService, useValue: mockProductService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProductController>(ProductController);
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('trả về danh sách products với pagination và filter', async () => {
      const paginated = {
        data: [mockProduct],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      mockProductService.findAll.mockResolvedValue(paginated);
      const result = await controller.getAll({ page: 1, limit: 10 });
      expect(result).toEqual(paginated);
      expect(mockProductService.findAll).toHaveBeenCalledWith(1, 10, {});
    });
  });

  describe('findOne', () => {
    it('trả về product khi tìm thấy', async () => {
      mockProductService.find.mockResolvedValue(mockProduct);
      const result = await controller.findOne(1);
      expect(result).toEqual(mockProduct);
      expect(mockProductService.find).toHaveBeenCalledWith(1);
    });

    it('throw NotFoundException khi service throw NotFoundException', async () => {
      mockProductService.find.mockRejectedValue(new NotFoundException());
      await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('tạo và trả về product mới', async () => {
      const dto = {
        name: 'New Product',
        price: 200,
        stock: 10,
        description: 'Desc',
      };
      mockProductService.create.mockResolvedValue({ ...mockProduct, ...dto });
      const result = await controller.create(dto as any);
      expect(mockProductService.create).toHaveBeenCalledWith(dto);
      expect(result).toBeDefined();
    });
  });

  describe('update', () => {
    it('cập nhật và trả về product sau khi sửa', async () => {
      const dto = { name: 'Updated' };
      const updated = { ...mockProduct, name: 'Updated' };
      mockProductService.update.mockResolvedValue(updated);
      const result = await controller.update(dto as any, 1);
      expect(mockProductService.update).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(updated);
    });
  });

  describe('delete', () => {
    it('xóa product và trả về product đã xóa', async () => {
      mockProductService.delete.mockResolvedValue(mockProduct);
      const result = await controller.delete(1);
      expect(mockProductService.delete).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockProduct);
    });
  });

  describe('restore', () => {
    it('khôi phục product và trả về product đã khôi phục', async () => {
      mockProductService.restore.mockResolvedValue(mockProduct);
      const result = await controller.restore(1);
      expect(mockProductService.restore).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockProduct);
    });
  });
});
