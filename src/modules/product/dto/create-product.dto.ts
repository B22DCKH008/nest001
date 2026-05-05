import {IsString, IsNumber, Length} from 'class-validator';

export class CreateProductDto {
    @IsString()
    @Length(1, 255, {message: 'Tên bắt buộc phải có độ dài từ 1 đến 255 ký tự'})
    name: string;

    @IsNumber({},{message: 'Giá phải là một số'})
    price: number;

    @IsString({message: 'Mô tả phải là một chuỗi'})
    description: string;
}
