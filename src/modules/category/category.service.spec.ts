import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { CategoryService } from './category.service';
import { Category } from 'src/entities/Category';

const mockCategory: Category = {
  id: 1,
  name: 'Electronics',
  description: 'Electronic products',
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

describe('CategoryService', () => {
  let service: CategoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        { provide: getRepositoryToken(Category), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('trả về danh sách categories', async () => {
      mockRepository.find.mockResolvedValue([mockCategory]);
      const result = await service.findAll();
      expect(result).toEqual([mockCategory]);
      expect(mockRepository.find).toHaveBeenCalledTimes(1);
    });
  });

  describe('find', () => {
    it('trả về category khi tìm thấy', async () => {
      mockRepository.findOneBy.mockResolvedValue(mockCategory);
      const result = await service.find(1);
      expect(result).toEqual(mockCategory);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
    });

    it('throw NotFoundException khi không tìm thấy', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);
      await expect(service.find(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('tạo category với timestamps, trả về category đã lưu', async () => {
      const dto = { name: 'New Category', description: 'Desc' };
      const built = { ...dto } as Category;
      mockRepository.create.mockReturnValue(built);
      mockRepository.save.mockResolvedValue({ ...built, id: 2 });

      const result = await service.create(dto);

      expect(mockRepository.create).toHaveBeenCalledWith(dto);
      expect(built.created_at).toBeInstanceOf(Date);
      expect(built.updated_at).toBeInstanceOf(Date);
      expect(mockRepository.save).toHaveBeenCalledWith(built);
      expect(result).toBeDefined();
    });
  });

  describe('update', () => {
    it('cập nhật category và trả về category sau khi sửa', async () => {
      const updated = { ...mockCategory, name: 'Updated' };
      mockRepository.findOneBy
        .mockResolvedValueOnce(mockCategory)
        .mockResolvedValueOnce(updated);
      mockRepository.update.mockResolvedValue(undefined);

      const result = await service.update(1, { name: 'Updated' });

      expect(mockRepository.update).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'Updated' }));
      expect(result).toEqual(updated);
    });

    it('throw NotFoundException khi category không tồn tại', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);
      await expect(service.update(999, { name: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('xóa category và trả về category đã xóa', async () => {
      mockRepository.findOneBy.mockResolvedValue(mockCategory);
      mockRepository.delete.mockResolvedValue(undefined);

      const result = await service.delete(1);

      expect(mockRepository.delete).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockCategory);
    });

    it('throw NotFoundException khi category không tồn tại', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);
      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });
  });
});
