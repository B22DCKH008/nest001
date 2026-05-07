import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from 'src/entities/Category';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  findAll(): Promise<Category[]> {
    return this.categoryRepository.find();
  }

  async find(id: number): Promise<Category> {
    const category = await this.categoryRepository.findOneBy({ id });
    if (!category) {
      throw new NotFoundException(`Danh mục không tìm thấy`);
    }
    return category;
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    const category = this.categoryRepository.create(dto);
    category.created_at = new Date();
    category.updated_at = new Date();
    return this.categoryRepository.save(category);
  }

  async update(id: number, dto: UpdateCategoryDto): Promise<Category> {
    await this.find(id);
    await this.categoryRepository.update(id, { ...dto, updated_at: new Date() });
    return this.categoryRepository.findOneBy({ id }) as Promise<Category>;
  }

  async delete(id: number): Promise<Category> {
    const category = await this.find(id);
    await this.categoryRepository.delete(id);
    return category;
  }
}
