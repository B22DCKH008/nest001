jest.mock('bcrypt', () => ({
  hashSync: jest.fn().mockReturnValue('hashed_value'),
  compareSync: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { UserService } from './user.service';
import { User } from 'src/entities/User';

const mockUser: Partial<User> = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  password: 'hashed_password',
  refresh_token: 'hashed_refresh_token',
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
};

const mockRepository = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  softDelete: jest.fn(),
  restore: jest.fn(),
};

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    it('hash password, gán timestamps, gọi save và trả về user mới', async () => {
      const userData = { name: 'Test User', email: 'test@example.com', password: 'plain_password' };
      const createdUser = { ...userData } as any;
      mockRepository.create.mockReturnValue(createdUser);
      mockRepository.save.mockImplementation((u: any) => Promise.resolve({ ...u, id: 1 }));

      const result = await service.createUser(userData);

      expect(mockRepository.create).toHaveBeenCalledWith(userData);
      expect(bcrypt.hashSync).toHaveBeenCalledWith('plain_password', 10);
      expect(createdUser.password).toBe('hashed_value');
      expect(createdUser.created_at).toBeInstanceOf(Date);
      expect(createdUser.updated_at).toBeInstanceOf(Date);
      expect(mockRepository.save).toHaveBeenCalledWith(createdUser);
      expect(result).toEqual({ ...createdUser, id: 1 });
    });
  });

  describe('findByEmail', () => {
    it('gọi findOne với email đúng và trả về user', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
      expect(result).toEqual(mockUser);
    });
  });

  describe('validateUser', () => {
    it('trả về user khi email tồn tại và password đúng', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compareSync as jest.Mock).mockReturnValue(true);

      const result = await service.validateUser('test@example.com', 'plain_password');

      expect(result).toEqual(mockUser);
    });

    it('trả về null khi user không tồn tại', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.validateUser('notfound@example.com', 'any_password');

      expect(result).toBeNull();
      expect(bcrypt.compareSync).not.toHaveBeenCalled();
    });

    it('trả về null khi password sai', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compareSync as jest.Mock).mockReturnValue(false);

      const result = await service.validateUser('test@example.com', 'wrong_password');

      expect(result).toBeNull();
    });
  });

  describe('saveRefreshToken', () => {
    it('hash refresh token và lưu vào user khi user tồn tại', async () => {
      const user = { ...mockUser } as any;
      mockRepository.findOne.mockResolvedValue(user);
      mockRepository.save.mockResolvedValue(user);

      const result = await service.saveRefreshToken('raw_refresh_token', 1);

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(bcrypt.hashSync).toHaveBeenCalledWith('raw_refresh_token', 10);
      expect(user.refresh_token).toBe('hashed_value');
      expect(mockRepository.save).toHaveBeenCalledWith(user);
      expect(result).toEqual(user);
    });

    it('trả về false khi user không tồn tại', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.saveRefreshToken('any_token', 999);

      expect(result).toBe(false);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('verifyRefreshToken', () => {
    it('trả về user khi token hợp lệ', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compareSync as jest.Mock).mockReturnValue(true);

      const result = await service.verifyRefreshToken('valid_token', 1);

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(bcrypt.compareSync).toHaveBeenCalledWith('valid_token', mockUser.refresh_token);
      expect(result).toEqual(mockUser);
    });

    it('trả về false khi token không khớp', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compareSync as jest.Mock).mockReturnValue(false);

      const result = await service.verifyRefreshToken('invalid_token', 1);

      expect(result).toBe(false);
    });

    it('trả về false khi user không tồn tại', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.verifyRefreshToken('any_token', 999);

      expect(result).toBe(false);
    });
  });

  describe('findAll', () => {
    it('trả về danh sách tất cả users', async () => {
      mockRepository.find.mockResolvedValue([mockUser]);

      const result = await service.findAll();

      expect(mockRepository.find).toHaveBeenCalledTimes(1);
      expect(result).toEqual([mockUser]);
    });
  });

  describe('findById', () => {
    it('trả về user khi tìm thấy', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById(1);

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(mockUser);
    });

    it('trả về null khi user không tồn tại', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('cập nhật user và trả về user mới nhất', async () => {
      const updateData = { name: 'Updated Name' };
      const updatedUser = { ...mockUser, name: 'Updated Name' };
      mockRepository.findOne
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(updatedUser);

      const result = await service.update(1, updateData);

      expect(mockRepository.update).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'Updated Name', updated_at: expect.any(Date) }));
      expect(result).toEqual(updatedUser);
    });

    it('throw NotFoundException khi user không tồn tại', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update(999, { name: 'X' })).rejects.toThrow(NotFoundException);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('soft delete user và trả về user đã xóa', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.softDelete.mockResolvedValue({ affected: 1 });

      const result = await service.delete(1);

      expect(mockRepository.softDelete).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockUser);
    });

    it('throw NotFoundException khi user không tồn tại', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
      expect(mockRepository.softDelete).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('đổi mật khẩu thành công khi currentPassword đúng', async () => {
      const user = { ...mockUser, password: 'hashed_old' } as any;
      mockRepository.findOneBy.mockResolvedValue(user);
      (bcrypt.compareSync as jest.Mock).mockReturnValue(true);
      mockRepository.save.mockResolvedValue(user);

      await service.changePassword(1, 'old123', 'new456');

      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(bcrypt.compareSync).toHaveBeenCalledWith('old123', 'hashed_old');
      expect(bcrypt.hashSync).toHaveBeenCalledWith('new456', 10);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('throw BadRequestException khi currentPassword sai', async () => {
      mockRepository.findOneBy.mockResolvedValue(mockUser);
      (bcrypt.compareSync as jest.Mock).mockReturnValue(false);

      await expect(service.changePassword(1, 'wrong', 'new456')).rejects.toThrow(BadRequestException);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('throw NotFoundException khi user không tồn tại', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.changePassword(999, 'old', 'new')).rejects.toThrow(NotFoundException);
    });
  });

  describe('restore', () => {
    it('khôi phục user đã bị soft delete thành công', async () => {
      const deletedUser = { ...mockUser, deleted_at: new Date() } as any;
      const restoredUser = { ...mockUser, deleted_at: null } as any;
      mockRepository.findOne.mockResolvedValue(deletedUser);
      mockRepository.restore.mockResolvedValue({ affected: 1 });
      mockRepository.findOneBy.mockResolvedValue(restoredUser);

      const result = await service.restore(1);

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 }, withDeleted: true });
      expect(mockRepository.restore).toHaveBeenCalledWith(1);
      expect(result).toEqual(restoredUser);
    });

    it('throw NotFoundException khi user không tồn tại', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.restore(999)).rejects.toThrow(NotFoundException);
    });

    it('throw BadRequestException khi user chưa bị xóa', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockUser, deleted_at: null });

      await expect(service.restore(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateRole', () => {
    it('đổi role user thành công và trả về user đã cập nhật', async () => {
      const user = { ...mockUser, role: 'user' } as any;
      mockRepository.findOneBy.mockResolvedValue(user);
      mockRepository.save.mockImplementation((u: any) => Promise.resolve(u));

      const result = await service.updateRole(1, 'admin');

      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(user.role).toBe('admin');
      expect(user.updated_at).toBeInstanceOf(Date);
      expect(mockRepository.save).toHaveBeenCalledWith(user);
      expect(result.role).toBe('admin');
    });

    it('throw NotFoundException khi user không tồn tại', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.updateRole(999, 'admin')).rejects.toThrow(NotFoundException);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });
});
