import { Body, Controller, Delete, Get, NotFoundException, Param, ParseIntPipe, Patch, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('user')
export class UserController {
    constructor(
        private readonly userService: UserService,
    ) {}

    @UseGuards(JwtAuthGuard)
    @Get('')
    findAll() {
        return this.userService.findAll();
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    async findOne(@Param('id', ParseIntPipe) id: number) {
        const user = await this.userService.findById(id);
        if (!user) {
            throw new NotFoundException('Người dùng không tìm thấy');
        }
        return user;
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    update(@Body() userData: UpdateUserDto, @Param('id', ParseIntPipe) id: number) {
        return this.userService.update(id, userData);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    delete(@Param('id', ParseIntPipe) id: number) {
        return this.userService.delete(id);
    }
}
