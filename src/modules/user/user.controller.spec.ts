import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';

const mockUser = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  password: 'hashed_password',
  role: 'user' as const,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
};

const mockRequest = { user: { id: 1, role: 'user' } };

const mockUserService = {
  createUser: jest.fn(),
  findByEmail: jest.fn(),
  validateUser: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  updateRole: jest.fn(),
  changePassword: jest.fn(),
  restore: jest.fn(),
};

describe('UserController', () => {
  let controller: UserController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: mockUserService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UserController>(UserController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('trả về danh sách users', async () => {
      mockUserService.findAll.mockResolvedValue([mockUser]);

      const result = await controller.findAll();

      expect(mockUserService.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual([mockUser]);
    });
  });

  describe('findOne', () => {
    it('trả về user khi tìm thấy', async () => {
      mockUserService.findById.mockResolvedValue(mockUser);

      const result = await controller.findOne(1);

      expect(mockUserService.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockUser);
    });

    it('throw NotFoundException khi user không tồn tại', async () => {
      mockUserService.findById.mockResolvedValue(null);

      await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('cập nhật và trả về user sau khi sửa (self update)', async () => {
      const dto: UpdateUserDto = { name: 'Updated Name' };
      const updated = { ...mockUser, name: 'Updated Name' };
      mockUserService.update.mockResolvedValue(updated);

      const result = await controller.update(dto, 1, mockRequest);

      expect(mockUserService.update).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(updated);
    });

    it('throw ForbiddenException khi update user khác (không phải admin)', () => {
      const dto: UpdateUserDto = { name: 'Hacked' };
      expect(() => controller.update(dto, 2, mockRequest)).toThrow(ForbiddenException);
      expect(mockUserService.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('xóa và trả về user đã xóa', async () => {
      mockUserService.delete.mockResolvedValue(mockUser);

      const result = await controller.delete(1);

      expect(mockUserService.delete).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockUser);
    });
  });

  describe('updateRole', () => {
    it('gọi userService.updateRole với đúng params và trả về user', async () => {
      const updated = { ...mockUser, role: 'admin' as const };
      mockUserService.updateRole.mockResolvedValue(updated);

      const result = await controller.updateRole(1, { role: 'admin' });

      expect(mockUserService.updateRole).toHaveBeenCalledWith(1, 'admin');
      expect(result).toEqual(updated);
    });
  });

  describe('changePassword', () => {
    it('gọi userService.changePassword và trả về message thành công', async () => {
      mockUserService.changePassword.mockResolvedValue(undefined);
      const dto = { currentPassword: 'old123', newPassword: 'new456' };

      const result = await controller.changePassword(mockRequest, dto);

      expect(mockUserService.changePassword).toHaveBeenCalledWith(1, 'old123', 'new456');
      expect(result).toEqual({ message: 'Đổi mật khẩu thành công' });
    });
  });

  describe('restore', () => {
    it('gọi userService.restore và trả về user đã khôi phục', async () => {
      mockUserService.restore.mockResolvedValue(mockUser);

      const result = await controller.restore(1);

      expect(mockUserService.restore).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockUser);
    });
  });
});
