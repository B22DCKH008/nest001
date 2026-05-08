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
| `User` | `users` | id, name, email, password, role, refresh_token, created_at, updated_at, deleted_at |
| `Product` | `products` | id, name, price, description, created_at, updated_at, deleted_at |

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
| `@nestjs/bullmq` + `bullmq` | Task queue — push job `order.created` khi checkout, processor log email |
| `@nestjs/cache-manager` + `cache-manager-ioredis-yet` | Redis cache — cache `GET /product` ở service layer, TTL 60s, per-page key |
| `@nestjs/swagger` | Swagger UI tại `/api` — docs toàn bộ API |
| `@nestjs/throttler` | Rate limiting — login 10/phút, register 5/phút; global ThrottlerGuard |

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

REDIS_HOST=localhost
REDIS_PORT=6379
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
| PATCH | `/user/:id/role` | JWT + admin | Đổi role user (user/admin) |
| DELETE | `/user/:id` | JWT + admin | Soft delete user (gán deleted_at) |
| GET | `/product` | — | Danh sách sản phẩm (cached 60s, kèm category) |
| GET | `/product/:id` | — | Chi tiết sản phẩm |
| POST | `/product` | JWT + admin | Tạo sản phẩm |
| PATCH | `/product/:id` | JWT + admin | Cập nhật sản phẩm |
| DELETE | `/product/:id` | JWT + admin | Soft delete sản phẩm (gán deleted_at) |
| GET | `/category` | — | Danh sách danh mục |
| GET | `/category/:id` | — | Chi tiết danh mục |
| POST | `/category` | JWT + admin | Tạo danh mục |
| PATCH | `/category/:id` | JWT + admin | Cập nhật danh mục |
| DELETE | `/category/:id` | JWT + admin | Xóa danh mục |
| GET | `/cart` | JwtAuthGuard | Cart của user (tự tạo nếu chưa có) |
| POST | `/cart/items` | JwtAuthGuard | Thêm item (đã có → cộng quantity) |
| PATCH | `/cart/items/:id` | JwtAuthGuard | Đổi quantity (0 = xóa item) |
| DELETE | `/cart/items/:id` | JwtAuthGuard | Xóa một item |
| DELETE | `/cart` | JwtAuthGuard | Xóa toàn bộ cart |
| POST | `/order/checkout` | JwtAuthGuard | Tạo order từ cart, clear cart |
| GET | `/order` | JwtAuthGuard | Orders của user hiện tại |
| GET | `/order/:id` | JwtAuthGuard | Chi tiết order (chỉ của mình) |
| PATCH | `/order/:id/cancel` | JwtAuthGuard | Hủy order (chỉ khi pending) |
| GET | `/order/admin/all` | JWT + admin | Tất cả orders (admin) |
| PATCH | `/order/admin/:id/status` | JWT + admin | Đổi status bất kỳ (admin) |

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

---

### Session 2026-05-07 — Security + Redis Cache

#### Những gì đã hoàn thành

**Security — JwtAuthGuard cho Product write endpoints:**
- `ProductController`: thêm `@UseGuards(JwtAuthGuard)` cho `POST /product`, `PATCH /product/:id`, `DELETE /product/:id`
- `GET /product` và `GET /product/:id` vẫn public (không cần login để browse)
- `product.controller.spec.ts`: thêm `.overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })`

**Redis Cache — service layer cho `GET /product`:**
- `app.module.ts`: thêm `CacheModule.registerAsync({ isGlobal: true, store: redisStore, TTL: 60s })`
- `ProductService`: inject `CACHE_MANAGER`, sửa `findAll()` check cache trước, `create/update/delete` gọi `cacheManager.del('products_all')` để invalidate
- `.env`: thêm `REDIS_HOST=localhost`, `REDIS_PORT=6379`
- `product.service.spec.ts`: thêm mock `CACHE_MANAGER`, thêm test cache hit/miss cho `findAll`, verify `del()` được gọi trong write methods

**Unit tests — trạng thái: 49/49 pass, 8 test suites:**
| File spec | Tests | Ghi chú |
|---|---|---|
| `product/product.service.spec.ts` | 8 | +cache hit, +cache miss (findAll), +verify del() trong create/update/delete |
| `product/product.controller.spec.ts` | 6 | guard override thêm — số test không đổi |
| `auth/auth.service.spec.ts` | 3 | không thay đổi |
| `auth/auth.controller.spec.ts` | 5 | không thay đổi |
| `user/user.service.spec.ts` | 18 | không thay đổi |
| `user/user.controller.spec.ts` | 5 | không thay đổi |

#### Quyết định kỹ thuật quan trọng

7. **Cache invalidation strategy: `del` thay vì TTL-only** — Write methods (`create/update/delete`) gọi `cacheManager.del(PRODUCTS_CACHE_KEY)` ngay sau khi mutate DB. Tránh stale cache tối đa 60s sau khi thay đổi dữ liệu.

8. **Service layer cache, không dùng `CacheInterceptor` trên controller** — Inject `CACHE_MANAGER` vào service cho phép invalidate chủ động. `CacheInterceptor` ở controller level không có cơ chế invalidate khi data thay đổi.

9. **`PRODUCTS_CACHE_KEY` là constant module-level** — `'products_all'` dùng ở cả `findAll` (set/get) và write methods (del). Đặt ở module scope tránh typo khi gọi del.

---

### Session 2026-05-07 (tiếp) — Category + Swagger + RBAC + Cart + Order + E2E

#### Những gì đã hoàn thành

**Bug fixes:**
- `UpdateProductDto` thiếu toàn bộ `class-validator` decorators → ValidationPipe `forbidNonWhitelisted: true` reject body → 400. Fix: thêm đầy đủ decorators + `@IsOptional()`
- `import { Cache } from 'cache-manager'` gây lỗi TS1272 với `isolatedModules: true`. Fix: `import type { Cache }`

**Category module** — CRUD đầy đủ tại `/category`:
- `src/entities/Category.ts` — `OneToMany` với Product
- `src/entities/Product.ts` — thêm `ManyToOne` nullable tới Category (`category_id` FK)
- `GET /product` và `GET /product/:id` giờ load kèm category object

**Swagger/OpenAPI** — `GET /api` tự động:
- Cài `@nestjs/swagger`, setup `SwaggerModule` trong `main.ts`
- `@ApiTags`, `@ApiOperation`, `@ApiResponse` trên tất cả 4 controllers (auth/user/product/category)
- `@ApiBearerAuth('access-token')` trên endpoints có guard
- `@ApiProperty` / `@ApiPropertyOptional` trên tất cả DTOs
- Required properties trong DTOs dùng `!` (definite assignment assertion) để tránh TS2564

**RBAC — phân quyền admin/user:**
- `src/entities/User.ts`: thêm `role: 'user' | 'admin'` với `DEFAULT 'user'`
- `src/decorators/roles.decorator.ts`: `@Roles('admin')` via `SetMetadata`
- `src/guards/roles.guard.ts`: đọc `request.user.role`, trả `false` → 403
- Áp dụng `@UseGuards(JwtAuthGuard, RolesGuard) + @Roles('admin')` cho: POST/PATCH/DELETE product, POST/PATCH/DELETE category, GET /user (all), DELETE /user/:id

**Cart module:**
- `src/entities/Cart.ts` — OneToOne User, OneToMany CartItem
- `src/entities/CartItem.ts` — ManyToOne Cart + Product (eager: true), có `quantity`
- Logic: `addItem` cộng quantity nếu đã có, tạo mới nếu chưa; `updateItem` với quantity=0 tự xóa item

**Order module:**
- `src/entities/Order.ts` — status: `pending|confirmed|cancelled`, `total_amount`
- `src/entities/OrderItem.ts` — snapshot `product_name`, `product_price`, `subtotal` tại thời điểm đặt
- `checkout`: tạo order từ cart → clear cart
- User endpoints: checkout, xem orders của mình, hủy (chỉ khi pending)
- Admin endpoints: xem tất cả, đổi status bất kỳ

**E2E Tests** — 28 integration tests, chạy với `nestjs001_test` DB:
- `test/jest-e2e.json`: thêm `moduleNameMapper`, `forceExit`, `testTimeout: 30000`
- `test/app.e2e-spec.ts`: flow đầy đủ Auth → Category → Product → Cart → Order
- `beforeAll` cleanup dữ liệu cũ trước khi tạo mới (idempotent)
- Admin user được tạo bằng cách update `role='admin'` qua `DataSource` trực tiếp

**Unit tests — trạng thái: 96/96 pass, 14 test suites:**
| File spec | Tests | Ghi chú |
|---|---|---|
| `product/product.service.spec.ts` | 8 | +findOne dùng findOne thay findOneBy |
| `product/product.controller.spec.ts` | 6 | +overrideGuard RolesGuard |
| `category/category.service.spec.ts` | 8 | CRUD + NotFoundException |
| `category/category.controller.spec.ts` | 5 | CRUD + overrideGuard |
| `cart/cart.service.spec.ts` | 12 | getOrCreate, addItem, updateItem, removeItem, clearCart |
| `cart/cart.controller.spec.ts` | 5 | CRUD |
| `order/order.service.spec.ts` | 8 | checkout, findAll, findOne, cancel, admin ops |
| `order/order.controller.spec.ts` | 6 | CRUD + admin |
| `user/user.controller.spec.ts` | 5 | +overrideGuard RolesGuard, +role trong mockUser |
| Auth + User service | giữ nguyên | không đổi |

#### Quyết định kỹ thuật quan trọng

10. **RBAC dùng `RolesGuard` riêng biệt, không gộp vào `JwtAuthGuard`** — Tách trách nhiệm: JwtAuthGuard xác thực danh tính, RolesGuard kiểm tra quyền. `RolesGuard` luôn đứng SAU `JwtAuthGuard` vì cần `request.user` do JwtStrategy inject.

11. **OrderItem lưu snapshot giá** — `product_name`, `product_price`, `subtotal` copy từ Product tại thời điểm checkout. Admin sửa giá sau không ảnh hưởng đơn cũ.

12. **`cartRepository.update(id, partial)` thay vì `cartRepository.save(cart)`** — Dùng `save(cart)` với `cart.items = []` và `cascade: true` trên OneToMany khiến TypeORM **NULL hóa `cart_id`** trên tất cả CartItem vừa lưu (cascade nullify behavior). `update(id, {})` chỉ UPDATE bảng `carts` mà không trigger cascade trên relations.

13. **CartService ownership check dùng nested where** — `findOne({ where: { id: itemId, cart: { user: { id: userId } } } })` thay vì load relations rồi so sánh `item.cart.user.id !== userId`. Tránh type mismatch MySQL INT vs JS number, và ít query hơn.

14. **E2E cleanup idempotent** — `cleanupTestData()` chạy ở đầu `beforeAll` (xóa data từ run trước) VÀ ở `afterAll`. Pattern này đảm bảo test không bị ảnh hưởng bởi state cũ dù lần chạy trước bị crash giữa chừng.

15. **E2E dùng real DB + Redis** — Không mock TypeORM hay Redis trong E2E. Dùng `nestjs001_test` database riêng (không ảnh hưởng dev data). `beforeAll` set `process.env.DB_NAME = 'nestjs001_test'` TRƯỚC khi import `AppModule` (vì TypeORM đọc env lúc module init).

#### Bước tiếp theo (session sau)

**Ưu tiên trung bình:**
- [x] BullMQ — checkout push job `order.created` → `OrderProcessor` log email xác nhận
- [x] Pagination cho `GET /product`, `GET /order` — response `{ data, total, page, limit, totalPages }`

**Ưu tiên thấp:**
- [x] Admin-only endpoint `PATCH /user/:id/role` — đổi role user/admin
- [x] Rate limiting cho auth endpoints — `@nestjs/throttler`, login 10/phút, register 5/phút
- [x] Soft delete thay hard delete — `@DeleteDateColumn` trên User + Product

---

### Session 2026-05-08 — Rate Limiting + Soft Delete + Admin Role Change

#### Những gì đã hoàn thành

**Rate Limiting (`@nestjs/throttler`):**
- Cài `@nestjs/throttler`, thêm `ThrottlerModule.forRoot` + `APP_GUARD: ThrottlerGuard` global vào `app.module.ts`
- `AuthController`: `@Throttle({ default: { limit: 10, ttl: 60000 } })` trên `POST /login`, `{ limit: 5 }` trên `POST /register`
- `@SkipThrottle()` trên `GET /profile` và `POST /refresh-token` (đã có JWT guard, không cần throttle)

**Soft Delete:**
- `User.ts` và `Product.ts`: thêm `@DeleteDateColumn({ nullable: true }) deleted_at: Date | null`
- TypeORM `synchronize: true` tự ADD column, không phá data cũ
- `UserService.delete()` và `ProductService.delete()`: đổi `repository.delete(id)` → `repository.softDelete(id)`
- TypeORM tự lọc `deleted_at IS NOT NULL` trong mọi `find`/`findOne`

**Admin Role Change:**
- `src/modules/user/dto/update-user-role.dto.ts` mới — `@IsIn(['user', 'admin'])`
- `UserService.updateRole(id, role)` mới
- `UserController`: thêm `PATCH /user/:id/role` (JWT + admin), đặt TRƯỚC `:id` để tránh route conflict

**Unit tests — trạng thái: 102/102 pass, 15 test suites:**
- `user.service.spec.ts`: +2 tests `updateRole`, đổi `delete` → `softDelete` mock
- `user.controller.spec.ts`: +1 test `updateRole`
- `product.service.spec.ts`: đổi `delete` → `softDelete` mock

#### Quyết định kỹ thuật quan trọng

16. **`APP_GUARD: ThrottlerGuard` không ảnh hưởng unit tests** — `APP_GUARD` chỉ apply ở AppModule level. Unit tests dùng `Test.createTestingModule` isolated, không import AppModule → ThrottlerGuard không chạy → không cần override trong spec files.

17. **`softDelete()` không trả entity** — TypeORM `softDelete(id)` trả `UpdateResult`, không phải entity. Phải `findOneBy` TRƯỚC để có entity trả về cho client. Pattern: find → if not found throw → softDelete → return found entity.

18. **`@DeleteDateColumn` tự quản lý filter** — TypeORM tự thêm `WHERE deleted_at IS NULL` vào mọi query sau khi entity có `@DeleteDateColumn`. Không cần sửa gì ở service `findAll`, `findById`, hay relations — đều tự lọc soft-deleted records.
