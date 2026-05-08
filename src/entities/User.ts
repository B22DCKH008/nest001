import { Entity, PrimaryGeneratedColumn, Column, DeleteDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column()
  password: string;

  @Column({ default: 'user' })
  role: 'user' | 'admin';

  @Column({ nullable: true })
  refresh_token?: string;

  @Column()
  created_at: Date;

  @Column()
  updated_at: Date;

  @DeleteDateColumn({ nullable: true })
  deleted_at: Date | null;
}
