import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';

const mockProduct = {
  id: 1,
  name: 'Test Product',
  price: 100,
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
};

describe('ProductController', () => {
  let controller: ProductController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [{ provide: ProductService, useValue: mockProductService }],
    }).compile();

    controller = module.get<ProductController>(ProductController);
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('trả về danh sách products', async () => {
      mockProductService.findAll.mockResolvedValue([mockProduct]);
      const result = await controller.getAll();
      expect(result).toEqual([mockProduct]);
      expect(mockProductService.findAll).toHaveBeenCalledTimes(1);
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
      const dto = { name: 'New Product', price: 200, description: 'Desc' };
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
});
