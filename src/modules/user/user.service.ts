import { BadRequestException, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { User } from 'src/entities/User';
import { Repository } from 'typeorm';
import * as brcypt from 'bcrypt';

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ){}

    async createUser(userData: Partial<User>): Promise<User> {
        const user = this.userRepository.create(userData);
        user.created_at = new Date();
        user.updated_at = new Date();
        const hashedPassword = await brcypt.hashSync(userData.password, 10);
        user.password = hashedPassword;
        return this.userRepository.save(user);
    }

    findByEmail(email: string){
        const user = this.userRepository.findOne({ where: { email } });
        return user;
    }

    async validateUser(email: string, password: string){
        const user = await this.findByEmail(email);
        if(!user){
            return null;
        }
        const status = brcypt.compareSync(password, user.password);
        if(status){
            return user;
        }
        return null;
    }

    async saveRefreshToken(refreshToken: string, userId: number){
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if(!user){
            return false;
        }
        const hashedRefreshToken = await brcypt.hashSync(refreshToken, 10);
        user.refresh_token = hashedRefreshToken;
        user.updated_at = new Date();
        return this.userRepository.save(user);
    }

    async verifyRefreshToken(refreshToken: string, userId: number) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if(!user){
            return false;
        }
        const status = await brcypt.compareSync(refreshToken, user.refresh_token);
        if(status){
            return user;
        }
        return false;
    }

    findAll(): Promise<User[]> {
        return this.userRepository.find();
    }

    findById(id: number): Promise<User | null> {
        return this.userRepository.findOne({ where: { id } });
    }

    async update(id: number, userData: Partial<User>): Promise<User> {
        const user = await this.findById(id);
        if (!user) {
            throw new NotFoundException('Người dùng không tìm thấy');
        }
        userData.updated_at = new Date();
        await this.userRepository.update(id, userData);
        return this.userRepository.findOne({ where: { id } }) as Promise<User>;
    }

    async delete(id: number): Promise<User> {
        const user = await this.findById(id);
        if (!user) {
            throw new NotFoundException('Người dùng không tìm thấy');
        }
        await this.userRepository.softDelete(id);
        return user;
    }

    async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
        const user = await this.userRepository.findOneBy({ id: userId });
        if (!user) throw new NotFoundException('Người dùng không tìm thấy');
        const isValid = brcypt.compareSync(currentPassword, user.password);
        if (!isValid) throw new BadRequestException('Mật khẩu hiện tại không đúng');
        user.password = brcypt.hashSync(newPassword, 10);
        user.updated_at = new Date();
        await this.userRepository.save(user);
    }

    async restore(id: number): Promise<User> {
        const user = await this.userRepository.findOne({ where: { id }, withDeleted: true });
        if (!user) throw new NotFoundException('Người dùng không tìm thấy');
        if (!user.deleted_at) throw new BadRequestException('Người dùng chưa bị xóa');
        await this.userRepository.restore(id);
        return this.userRepository.findOneBy({ id }) as Promise<User>;
    }

    async updateRole(id: number, role: 'user' | 'admin'): Promise<User> {
        const user = await this.userRepository.findOneBy({ id });
        if (!user) {
            throw new NotFoundException('Người dùng không tìm thấy');
        }
        user.role = role;
        user.updated_at = new Date();
        return this.userRepository.save(user);
    }
}
