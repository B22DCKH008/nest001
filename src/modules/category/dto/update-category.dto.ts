import { IsString, IsOptional, Length } from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @Length(1, 100, {
    message: 'Tên danh mục phải có độ dài 1-100 ký tự',
  })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Mô tả phải là chuỗi' })
  description?: string;
}
