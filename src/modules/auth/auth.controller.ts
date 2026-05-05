import { Body, Controller, Post, UseGuards, Get, Request, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { LocalAuthGuard } from 'src/guards/local-auth.guard';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';


@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @Post('register')
  register(@Body() userData: RegisterDto) {
    return this.userService.createUser(userData);
  }
  
  @UseGuards(LocalAuthGuard)
  @Post('login') // localhost:3000/auth/login
  login(@Request() request: any) {
    return this.authService.login(request.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile') // localhost:3000/auth/profile
  profile(@Request() request: any) {
    return request.user;
  }

  @Post('refresh-token') // localhost:3000/auth/refresh-token
  async refreshToken(@Body() {refreshToken}:{ refreshToken: string }) {
    if (!refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }
    const user = await this.authService.verifyRefreshToken(refreshToken);
    if(!user){
      throw new BadRequestException('Invalid refresh token');
    }
    return this.authService.login(user); 
  }
  
}
