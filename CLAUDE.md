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
      dto/                ← register.dto.ts
    user/                 ← user.module|controller|service
      dto/                ← update-user.dto.ts
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
| GET | `/user` | JwtAuthGuard | Danh sách tất cả users |
| GET | `/user/:id` | JwtAuthGuard | Chi tiết user theo id |
| PATCH | `/user/:id` | JwtAuthGuard | Cập nhật user (name, email) |
| DELETE | `/user/:id` | JwtAuthGuard | Xóa user |
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

---

## Lịch sử session & trạng thái hiện tại

### Session 2026-05-05 — Code quality + Unit tests + UserController

#### Những gì đã hoàn thành (toàn bộ 2 session ngày 05/05)

**Code quality fixes (tất cả đã apply):**
- `ParseIntPipe` đã thêm vào tất cả `@Param('id')` trong `ProductController` (`findOne`, `update`, `delete`) — trước đó `id` nhận về **string** ở runtime dù TypeScript khai báo `number`
- `src/modules/auth/dto/register.dto.ts` đã tạo mới — `POST /auth/register` trước đó nhận `any`, nay có validation đầy đủ
- `AuthController.register()` đã đổi từ `userData: any` → `RegisterDto`
- `UserController` đã xóa `console.log('UserController constructor')` khỏi constructor
- `ProductController` đã xóa `@UsePipes(new ValidationPipe({transform: true}))` và unused imports (`HttpException`, `HttpStatus`, `UsePipes`, `ValidationPipe`)

**UserModule — implement đầy đủ:**
- `src/modules/user/dto/update-user.dto.ts` tạo mới — có `name?` và `email?` với validation tiếng Việt
- `UserService` đã thêm 4 methods mới: `findAll()`, `findById(id)`, `update(id, dto)`, `delete(id)`
- `UserController` đã implement 4 routes: `GET /user`, `GET /user/:id`, `PATCH /user/:id`, `DELETE /user/:id` — tất cả đều yêu cầu `JwtAuthGuard`

**Unit tests — trạng thái: 48/48 pass, 8 test suites:**
| File spec | Tests | Ghi chú |
|---|---|---|
| `product/product.service.spec.ts` | 7 | findAll, find (found/NotFoundException), create (timestamps), update, delete ×2 |
| `auth/auth.service.spec.ts` | 3 | login (tokens + saveRefreshToken), verifyRefreshToken (valid/invalid/unknown) |
| `product/product.controller.spec.ts` | 6 | getAll, findOne (found/NotFoundException), create, update, delete |
| `auth/auth.controller.spec.ts` | 5 | register, login, profile, refreshToken (valid/BadRequestException) |
| `user/user.service.spec.ts` | 18 | createUser, findByEmail, validateUser ×3, saveRefreshToken ×2, verifyRefreshToken ×3, findAll, findById ×2, update ×2, delete ×2 |
| `user/user.controller.spec.ts` | 5 | findAll, findOne (found/NotFoundException), update, delete |

**Jest config fix — `package.json`:**
- Đã thêm `moduleNameMapper: { "^src/(.*)$": "<rootDir>/$1" }` — cần thiết vì Jest không đọc `baseUrl` từ `tsconfig.json`

#### Quyết định kỹ thuật quan trọng

1. **Không dùng `@UsePipes` trên controller** — global `ValidationPipe` (đăng ký trong `main.ts`) đã xử lý toàn bộ, thêm lại là redundant và vi phạm convention DRY

2. **Thứ tự `jwtService.sign` trong `AuthService.login()`** — lần gọi đầu tiên tạo **refresh token** (có `expiresIn` từ config), lần thứ hai tạo **access token**. Quan trọng khi viết test để đặt `mockReturnValueOnce` đúng thứ tự

3. **Mock pattern cho TypeORM trong test** — dùng `getRepositoryToken(Entity)` từ `@nestjs/typeorm` để provide mock repository, không kết nối DB thật

4. **`findById` trả `null`, không throw** — `UserController.findOne` xử lý null và throw `NotFoundException`; nhưng `update` và `delete` trong service tự throw NotFoundException (vì chúng cần đảm bảo tính toàn vẹn). Pattern: read-only methods trả null, write methods throw exception

5. **`mockRepository.save` dùng `mockImplementation` không phải `mockResolvedValue`** — vì service mutate object TRƯỚC khi gọi save (gán timestamps, hash password), nên snapshot bằng `mockResolvedValue({ ...obj })` bắt giá trị CŨ trước mutation. `mockImplementation((u) => Promise.resolve({ ...u, id: 1 }))` bắt giá trị ĐÃ mutate

6. **Thiếu import exception class trong spec file gây worker crash trên Node.js v22** — `NotFoundException` dùng trong `.rejects.toThrow(NotFoundException)` mà không import sẽ là `undefined` ở runtime. Node.js v22 treat unhandled promise rejection là fatal, crash toàn bộ worker. Lỗi này không hiện ra như TypeScript compile error mà là process crash

#### Bước tiếp theo (session sau)

**Ưu tiên trung bình:**
- [ ] Tích hợp BullMQ — package đã cài (`@nestjs/bullmq` + `bullmq`), chưa implement queue nào. Cần quyết định queue dùng cho tác vụ gì (ví dụ: gửi email, xử lý ảnh...)
- [ ] Tích hợp Redis cache — package đã cài (`@nestjs/cache-manager` + `cache-manager-ioredis-yet`), chưa dùng. Cần quyết định cache endpoint nào (ví dụ: `GET /product` danh sách)

**Ưu tiên thấp:**
- [ ] Swagger/OpenAPI documentation (`@nestjs/swagger`) — chưa cài, chưa dùng
- [ ] E2E tests trong `test/` — hiện chỉ có NestJS stub mặc định
- [ ] Guard `POST /product` và các write endpoints — hiện chưa yêu cầu auth, ai cũng có thể tạo/sửa/xóa sản phẩm
