import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { User } from 'src/entities/User';

const mockUser: Partial<User> = {
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
};

const mockUserService = {
  saveRefreshToken: jest.fn(),
  verifyRefreshToken: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(),
  verify: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('trả về access_token và refresh_token, lưu refresh token vào DB', async () => {
      // AuthService.login: 1st sign call = refreshToken (với expiresIn), 2nd sign call = access_token
      mockJwtService.sign
        .mockReturnValueOnce('signed_refresh_token')
        .mockReturnValueOnce('signed_access_token');
      mockUserService.saveRefreshToken.mockResolvedValue(undefined);

      const result = await service.login(mockUser);

      expect(mockJwtService.sign).toHaveBeenCalledTimes(2);
      expect(mockUserService.saveRefreshToken).toHaveBeenCalledWith('signed_refresh_token', mockUser.id);
      expect(result).toEqual({
        access_token: 'signed_access_token',
        refresh_token: 'signed_refresh_token',
      });
    });
  });

  describe('verifyRefreshToken', () => {
    it('trả về user khi refresh token hợp lệ', async () => {
      const decoded = { email: 'test@example.com', sub: 1 };
      mockJwtService.verify.mockReturnValue(decoded);
      mockUserService.verifyRefreshToken.mockResolvedValue(mockUser);

      const result = await service.verifyRefreshToken('valid_token');

      expect(mockJwtService.verify).toHaveBeenCalledWith('valid_token');
      expect(mockUserService.verifyRefreshToken).toHaveBeenCalledWith('valid_token', decoded.sub);
      expect(result).toEqual(mockUser);
    });

    it('trả về false khi jwtService.verify throw (token hết hạn hoặc sai)', async () => {
      mockJwtService.verify.mockImplementation(() => { throw new Error('invalid token'); });

      const result = await service.verifyRefreshToken('invalid_token');

      expect(result).toBe(false);
      expect(mockUserService.verifyRefreshToken).not.toHaveBeenCalled();
    });

    it('trả về false khi user không tồn tại trong DB', async () => {
      const decoded = { email: 'test@example.com', sub: 999 };
      mockJwtService.verify.mockReturnValue(decoded);
      mockUserService.verifyRefreshToken.mockResolvedValue(false);

      const result = await service.verifyRefreshToken('valid_jwt_unknown_user');

      expect(result).toBe(false);
    });
  });
});
