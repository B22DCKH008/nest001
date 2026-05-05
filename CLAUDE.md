# CLAUDE.md — Dự án nest001

File này được Claude Code tự động nạp vào context mỗi phiên làm việc. Luôn tuân thủ các quy tắc dưới đây.

---

## Kiến trúc tổng quan

- **Framework:** NestJS v11, Express platform
- **Ngôn ngữ:** TypeScript (ES2023, strictNullChecks)
- **Database:** MySQL 8 + TypeORM (synchronize: true)
- **Auth:** Passport.js — LocalStrategy (email+password) + JwtStrategy (Bearer token)
- **Port mặc định:** 3000

### Luồng xác thực
```
POST /auth/login → LocalAuthGuard → AuthService.login()
  → access_token (1h) + refresh_token (7d, hashed bcrypt)

Mọi route cần auth → @UseGuards(JwtAuthGuard) → JwtStrategy.validate()
```

### Global providers (đăng ký tại main.ts)
| Provider | Mô tả |
|---|---|
| `ValidationPipe` | transform: true, whitelist: true, forbidNonWhitelisted: true |
| `AllHttpExceptionFilter` | Chuẩn hóa tất cả lỗi thành `{ statusCode, timestamp, path, message }` |
| `LoggingMiddleware` | Log URL của mỗi request vào console |
| `WinstonLogger` | Log ra console + file `application.log` |

---

## Cấu trúc thư mục

```
src/
  entities/               ← TypeORM entities (PascalCase filename = class name)
  exceptions/             ← Global exception filters
  guards/                 ← jwt-auth.guard.ts, local-auth.guard.ts
  logger/                 ← winston.logger.ts
  middleware/logging/     ← logging.middleware.ts
  modules/
    auth/                 ← auth.module|controller|service, jwt.strategy, local.strategy
    user/                 ← user.module|controller|service
    product/
      dto/                ← create-product.dto.ts, update-product.dto.ts
      product.module|controller|service.ts
  app.module.ts
  main.ts
test/                     ← E2E tests (jest-e2e.json)
```

### Quy tắc đặt tên file
- Entity: `PascalCase.ts` (ví dụ: `User.ts`, `Product.ts`)
- Module/Controller/Service: `kebab-case.[type].ts`
- DTO: `create-[feature].dto.ts`, `update-[feature].dto.ts`
- Guard: `[name]-auth.guard.ts`
- Spec: `[tên-file].spec.ts` cùng thư mục với file được test

---

## Database — TypeORM entities

### Quy tắc bắt buộc cho mọi entity
```typescript
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('table_name')       // tên bảng snake_case số nhiều
export class EntityName {
  @PrimaryGeneratedColumn()
  id: number;

  // ... các column khác ...

  @Column()
  created_at: Date;         // luôn có, tự gán = new Date() khi create

  @Column()
  updated_at: Date;         // luôn có, tự gán = new Date() khi create/update
}
```

### Entities hiện có
| Entity | Bảng | Cột chính |
|---|---|---|
| `User` | `users` | id, name, email, password, refresh_token, created_at, updated_at |
| `Product` | `products` | id, name, price, description, created_at, updated_at |

### Đăng ký entity
- Khai báo trong `TypeOrmModule.forRoot({ entities: [...] })` tại `app.module.ts`
- Khai báo trong `TypeOrmModule.forFeature([Entity])` tại module tương ứng

---

## Thư viện quan trọng

| Thư viện | Mục đích |
|---|---|
| `@nestjs/typeorm` + `typeorm` + `mysql2` | ORM + MySQL |
| `@nestjs/jwt` + `@nestjs/passport` + `passport-jwt` + `passport-local` | Authentication |
| `bcrypt` | Hash password và refresh_token |
| `class-validator` + `class-transformer` | Validate và transform DTO |
| `nest-winston` + `winston` | Structured logging |
| `@nestjs/config` | Đọc biến môi trường qua `ConfigService` |
| `@nestjs/bullmq` + `bullmq` | Task queue (đã cài, chưa dùng) |
| `@nestjs/cache-manager` + `cache-manager-ioredis-yet` | Redis cache (đã cài, chưa dùng) |

---

## Quy tắc coding

### Imports
- Dùng `src/...` thay vì relative path `../../`
  ```typescript
  import { User } from 'src/entities/User';       // đúng
  import { User } from '../../entities/User';      // tránh
  ```

### DTOs
- Phải dùng `class-validator` decorators, không được dùng `any`
- Đặt trong thư mục `dto/` trong module tương ứng
- Error message bằng tiếng Việt (theo convention dự án)
  ```typescript
  import { IsString, IsNumber, Length } from 'class-validator';

  export class CreateXxxDto {
    @IsString()
    @Length(1, 255, { message: 'Tên bắt buộc có độ dài 1-255 ký tự' })
    name: string;

    @IsNumber({}, { message: 'Giá phải là một số' })
    price: number;
  }
  ```

### Services — Repository pattern
```typescript
@Injectable()
export class XxxService {
  constructor(
    @InjectRepository(Xxx)
    private readonly xxxRepository: Repository<Xxx>,
  ) {}
}
```

### Guards
- Route cần JWT: `@UseGuards(JwtAuthGuard)` — import từ `src/guards/jwt-auth.guard`
- Route login: `@UseGuards(LocalAuthGuard)` — import từ `src/guards/local-auth.guard`

### Xử lý lỗi
- Throw NestJS exceptions: `NotFoundException`, `BadRequestException`, `UnauthorizedException`, ...
- `AllHttpExceptionFilter` tự động bắt và format thành JSON

### Code style (Prettier + ESLint)
- Single quotes: `'string'` không phải `"string"`
- Trailing comma sau mỗi phần tử cuối
- Chạy `npm run format` trước khi commit
- `@typescript-eslint/no-explicit-any` đã tắt — nhưng DTOs vẫn phải typed

---

## Biến môi trường (.env)

```
JWT_SECRET=
JWT_ACCESS_TOKEN_EXPIRE=1h
JWT_REFRESH_TOKEN_EXPIRE=7d

DB_DRIVER=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=nestjs001
DB_USERNAME=root
DB_PASSWORD=
```

- Đọc qua `ConfigService` (inject từ `@nestjs/config`) hoặc `process.env.*`
- `ConfigModule.forRoot({ isGlobal: true })` đã đăng ký global trong `app.module.ts`

---

## API endpoints hiện có

| Method | Path | Guard | Mô tả |
|---|---|---|---|
| GET | `/` | — | Hello World |
| POST | `/auth/register` | — | Tạo tài khoản mới |
| POST | `/auth/login` | LocalAuthGuard | Đăng nhập, trả access + refresh token |
| GET | `/auth/profile` | JwtAuthGuard | Thông tin user hiện tại |
| POST | `/auth/refresh-token` | — | Cấp lại access token |
| GET | `/product` | — | Danh sách sản phẩm |
| GET | `/product/:id` | — | Chi tiết sản phẩm |
| POST | `/product` | — | Tạo sản phẩm |
| PATCH | `/product/:id` | — | Cập nhật sản phẩm |
| DELETE | `/product/:id` | — | Xóa sản phẩm |

---

## NPM scripts thường dùng

```bash
npm run start:dev     # Chạy dev với hot-reload
npm run start:prod    # Chạy production (từ dist/)
npm run build         # Compile TypeScript
npm run test          # Unit tests
npm run test:e2e      # E2E tests
npm run test:cov      # Test + coverage report
npm run lint          # ESLint auto-fix
npm run format        # Prettier format
```

---

## Checklist khi thêm module mới

1. Tạo entity tại `src/entities/NewFeature.ts` — có `created_at` và `updated_at`
2. Đăng ký entity trong `app.module.ts` (mảng `entities`)
3. Tạo thư mục `src/modules/new-feature/`
4. Tạo: `new-feature.module.ts`, `new-feature.controller.ts`, `new-feature.service.ts`
5. Tạo thư mục `dto/` với `create-new-feature.dto.ts` và `update-new-feature.dto.ts`
6. Import `TypeOrmModule.forFeature([NewFeature])` trong module
7. Import module mới vào `app.module.ts`
8. Tạo spec files: `*.controller.spec.ts`, `*.service.spec.ts`
