import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
    ){}

    async login(user: any) {
        const payload = { email: user.email, sub: user.id };
        const refreshToken = this.jwtService.sign(payload, { expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRE as any});
        await this.userService.saveRefreshToken(refreshToken, user.id);
        return {
            access_token: this.jwtService.sign(payload),
            refresh_token: refreshToken,
        };
    }

    async verifyRefreshToken(refreshToken: string) {
        try {
            const decoded = this.jwtService.verify(refreshToken);
            const user = await this.userService.verifyRefreshToken(refreshToken, decoded.sub);
            if (user) {
                return user;
            }
        } catch {
            // invalid signature, expired, or malformed token
        }
        return false;
    }
}
