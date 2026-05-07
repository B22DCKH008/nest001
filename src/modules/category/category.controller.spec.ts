import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';

const mockCategory = {
  id: 1,
  name: 'Electronics',
  description: 'Electronic products',
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
};

const mockCategoryService = {
  findAll: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('CategoryController', () => {
  let controller: CategoryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [{ provide: CategoryService, useValue: mockCategoryService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CategoryController>(CategoryController);
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('trả về danh sách categories', async () => {
      mockCategoryService.findAll.mockResolvedValue([mockCategory]);
      const result = await controller.getAll();
      expect(result).toEqual([mockCategory]);
      expect(mockCategoryService.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('trả về category khi tìm thấy', async () => {
      mockCategoryService.find.mockResolvedValue(mockCategory);
      const result = await controller.findOne(1);
      expect(result).toEqual(mockCategory);
      expect(mockCategoryService.find).toHaveBeenCalledWith(1);
    });

    it('throw NotFoundException khi không tìm thấy', async () => {
      mockCategoryService.find.mockRejectedValue(new NotFoundException());
      await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('tạo và trả về category mới', async () => {
      const dto = { name: 'New Category' };
      mockCategoryService.create.mockResolvedValue({ ...mockCategory, ...dto });
      const result = await controller.create(dto as any);
      expect(mockCategoryService.create).toHaveBeenCalledWith(dto);
      expect(result).toBeDefined();
    });
  });

  describe('update', () => {
    it('cập nhật và trả về category', async () => {
      const dto = { name: 'Updated' };
      const updated = { ...mockCategory, name: 'Updated' };
      mockCategoryService.update.mockResolvedValue(updated);
      const result = await controller.update(1, dto as any);
      expect(mockCategoryService.update).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(updated);
    });
  });

  describe('delete', () => {
    it('xóa và trả về category đã xóa', async () => {
      mockCategoryService.delete.mockResolvedValue(mockCategory);
      const result = await controller.delete(1);
      expect(mockCategoryService.delete).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockCategory);
    });
  });
});
