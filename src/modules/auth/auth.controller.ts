import { Body, Controller, Post, UseGuards, Get, Request, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { LocalAuthGuard } from 'src/guards/local-auth.guard';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @ApiOperation({ summary: 'Đăng ký tài khoản mới' })
  @ApiResponse({ status: 201, description: 'Tạo tài khoản thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @Post('register')
  register(@Body() userData: RegisterDto) {
    return this.userService.createUser(userData);
  }

  @ApiOperation({ summary: 'Đăng nhập, nhận access + refresh token' })
  @ApiBody({ schema: { properties: { email: { type: 'string', example: 'user@example.com' }, password: { type: 'string', example: 'password123' } } } })
  @ApiResponse({ status: 201, description: 'Đăng nhập thành công, trả về tokens' })
  @ApiResponse({ status: 401, description: 'Sai email hoặc mật khẩu' })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@Request() request: any) {
    return this.authService.login(request.user);
  }

  @ApiOperation({ summary: 'Thông tin user hiện tại (từ JWT)' })
  @ApiBearerAuth('access-token')
  @ApiResponse({ status: 200, description: 'Thông tin user' })
  @ApiResponse({ status: 401, description: 'Token không hợp lệ' })
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  profile(@Request() request: any) {
    return request.user;
  }

  @ApiOperation({ summary: 'Cấp lại access token từ refresh token' })
  @ApiBody({ schema: { properties: { refreshToken: { type: 'string' } } } })
  @ApiResponse({ status: 201, description: 'Trả về tokens mới' })
  @ApiResponse({ status: 400, description: 'Refresh token không hợp lệ' })
  @Post('refresh-token')
  async refreshToken(@Body() { refreshToken }: { refreshToken: string }) {
    if (!refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }
    const user = await this.authService.verifyRefreshToken(refreshToken);
    if (!user) {
      throw new BadRequestException('Invalid refresh token');
    }
    return this.authService.login(user);
  }
}
