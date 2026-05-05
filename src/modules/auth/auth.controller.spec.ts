import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { RegisterDto } from './dto/register.dto';

const mockUser = {
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
};

const mockTokens = {
  access_token: 'signed_access_token',
  refresh_token: 'signed_refresh_token',
};

const mockAuthService = {
  login: jest.fn(),
  verifyRefreshToken: jest.fn(),
};

const mockUserService = {
  createUser: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('gọi userService.createUser và trả về user mới', async () => {
      const dto: RegisterDto = { name: 'Test User', email: 'test@example.com', password: '123456' };
      mockUserService.createUser.mockResolvedValue(mockUser);

      const result = await controller.register(dto);

      expect(mockUserService.createUser).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockUser);
    });
  });

  describe('login', () => {
    it('gọi authService.login với request.user và trả về tokens', async () => {
      const req = { user: mockUser };
      mockAuthService.login.mockResolvedValue(mockTokens);

      const result = await controller.login(req);

      expect(mockAuthService.login).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockTokens);
    });
  });

  describe('profile', () => {
    it('trả về request.user', () => {
      const req = { user: mockUser };
      const result = controller.profile(req);
      expect(result).toEqual(mockUser);
    });
  });

  describe('refreshToken', () => {
    it('trả về tokens mới khi refresh token hợp lệ', async () => {
      mockAuthService.verifyRefreshToken.mockResolvedValue(mockUser);
      mockAuthService.login.mockResolvedValue(mockTokens);

      const result = await controller.refreshToken({ refreshToken: 'valid_refresh_token' });

      expect(mockAuthService.verifyRefreshToken).toHaveBeenCalledWith('valid_refresh_token');
      expect(mockAuthService.login).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockTokens);
    });

    it('throw BadRequestException khi refresh token không hợp lệ', async () => {
      mockAuthService.verifyRefreshToken.mockResolvedValue(false);

      await expect(
        controller.refreshToken({ refreshToken: 'invalid_token' }),
      ).rejects.toThrow(BadRequestException);

      expect(mockAuthService.login).not.toHaveBeenCalled();
    });
  });
});
