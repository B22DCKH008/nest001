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
| GET | `/user` | JWT + admin | Danh sách tất cả users |
| GET | `/user/:id` | JwtAuthGuard | Chi tiết user theo id |
| PATCH | `/user/me/password` | JwtAuthGuard | Tự đổi mật khẩu (validate mật khẩu cũ) |
| PATCH | `/user/:id` | JwtAuthGuard | Cập nhật user (chỉ self hoặc admin) |
| PATCH | `/user/:id/role` | JWT + admin | Đổi role user (user/admin) |
| PATCH | `/user/:id/restore` | JWT + admin | Khôi phục user đã soft delete |
| DELETE | `/user/:id` | JWT + admin | Soft delete user (gán deleted_at) |
| GET | `/product` | — | Danh sách sản phẩm (paginated + filter: name/categoryId/minPrice/maxPrice) |
| GET | `/product/:id` | — | Chi tiết sản phẩm |
| POST | `/product` | JWT + admin | Tạo sản phẩm |
| PATCH | `/product/:id` | JWT + admin | Cập nhật sản phẩm |
| PATCH | `/product/:id/restore` | JWT + admin | Khôi phục sản phẩm đã soft delete |
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

### Session 2026-05-08 — BullMQ + Pagination

#### Những gì đã hoàn thành

**BullMQ — Task queue cho order email:**
- Cài `@nestjs/bullmq` + `bullmq`; `app.module.ts` thêm `BullModule.forRootAsync({ connection: { host, port } })`
- `src/modules/order/order.processor.ts` — `@Processor('order')`, xử lý job `order.created`, log email confirmation
- `OrderModule`: thêm `BullModule.registerQueue({ name: 'order' })`, đăng ký `OrderProcessor` trong `providers`
- `OrderService.checkout()`: sau khi tạo order → lookup email user → `orderQueue.add('order.created', { orderId, email })`
- `order.service.spec.ts`: thêm `mockOrderQueue`, test verify `queue.add` được gọi đúng payload
- `order.processor.spec.ts` (mới): 2 tests — `should be defined`, `process() logs email confirmation`

**Pagination — Phân trang cho GET /product và GET /order:**
- `src/common/dto/pagination.dto.ts` (mới) — `page` (default 1, min 1) và `limit` (default 10, min 1, max 100)
- `ProductService.findAll(page, limit, filters?)` — thêm `skip/take` cho cả cached và filtered paths
- `OrderService.findAll(userId, page, limit)` — dùng `findAndCount`, trả `{ data, total, page, limit, totalPages }`
- Controllers nhận `@Query() pagination: PaginationDto` song song với `@Query() filters: ProductFilterDto`

**Cache key strategy — thay đổi từ `products_all` sang per-page:**
- Cache key đổi thành `products_page_${page}_limit_${limit}` — mỗi combination page/limit có cache riêng
- Write methods (`create/update/delete/restore`) dùng `cacheManager.clear()` thay vì `cacheManager.del('products_all')`
- Filtered queries (có filter params) vẫn bypass cache, không cache filtered results

**Unit tests — trạng thái: ~122/122 pass, 16 test suites:**
| File spec | Tests | Ghi chú |
|---|---|---|
| `order/order.processor.spec.ts` | 2 | **Mới** — defined, process logs |
| `order/order.service.spec.ts` | 10 | +findAll pagination test, +queue.add verified in checkout |
| `product/product.service.spec.ts` | 13 | +page default test, cache key dùng `products_page_1_limit_10` |
| `product/product.controller.spec.ts` | 7 | getAll nhận 2 args (pagination + filter) |
| `order/order.controller.spec.ts` | 6 | findAll truyền page/limit xuống service |
| Còn lại (auth/user/category/cart) | ~84 | Không thay đổi |

#### Quyết định kỹ thuật quan trọng

22. **Per-page cache key thay vì single key** — Với pagination, cache `products_all` không còn phù hợp vì trang 1 và trang 2 có kết quả khác nhau. Key `products_page_${page}_limit_${limit}` mỗi combination tạo cache entry riêng. Trade-off: nhiều cache entries hơn, nhưng cache hit rate cao hơn.

23. **`cacheManager.clear()` thay vì `cacheManager.del(key)`** — Với nhiều per-page keys, việc invalidate từng key khi write là không thực tế. `clear()` xóa toàn bộ cache ngay khi có mutation. Đơn giản hơn, không risk stale data từ key nào bị bỏ sót.

24. **BullMQ Processor chỉ log, không gửi email thật** — `OrderProcessor.process()` chỉ log message chứa orderId và email. Design này cho phép swap vào email provider thật (Nodemailer, SendGrid) sau mà không cần thay đổi `OrderService` hay job payload.

25. **`getQueueToken('order')` trong test** — Import từ `@nestjs/bullmq` để provide mock queue trong unit test. Không cần khởi động Redis thật trong unit test — chỉ mock `{ add: jest.fn() }`.

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

---

### Session 2026-05-08 (tiếp) — Security Fix + Password Change + Product Filter + Restore

#### Những gì đã hoàn thành

**Security Fix — `PATCH /user/:id`:**
- Phát hiện: bất kỳ user đã login đều có thể cập nhật profile của user khác
- Fix: thêm check `req.user.id !== id && req.user.role !== 'admin'` → throw `ForbiddenException`
- Test: thêm case ForbiddenException (dùng `expect(() => ...).toThrow()` vì throw đồng bộ)

**Password Change — `PATCH /user/me/password`:**
- `ChangePasswordDto`: `currentPassword` + `newPassword` (min 6 ký tự)
- `UserService.changePassword()`: validate mật khẩu cũ bằng bcrypt trước khi hash và save mật khẩu mới
- Route đặt TRƯỚC `:id` để tránh NestJS route conflict

**Product Search/Filter — `GET /product?name=&categoryId=&minPrice=&maxPrice=`:**
- `src/common/dto/product-filter.dto.ts` mới — 4 optional params với `@Type(() => Number)` cho numeric
- `ProductService.findAll()`: nếu không có filter → dùng cache như cũ; có filter → query trực tiếp với TypeORM `Like`, `Between`, `MoreThanOrEqual`, `LessThanOrEqual`, không cache
- Controller dùng 2 `@Query()` decorator tách biệt — NestJS map cùng query string vào cả 2 DTO

**Restore Soft-Deleted — `PATCH /user/:id/restore` + `PATCH /product/:id/restore` (admin):**
- `UserService.restore()` và `ProductService.restore()`: `findOne({ withDeleted: true })` → validate → `repository.restore(id)` → trả entity đã khôi phục
- Check `!user.deleted_at` → BadRequestException (chưa bị xóa thì không restore)

**Unit tests — trạng thái: 116/116 pass, 15 test suites:**
- `user.service.spec.ts`: +3 tests `changePassword`, +3 tests `restore`
- `user.controller.spec.ts`: +1 test ForbiddenException, +1 test `changePassword`, +1 test `restore`
- `product.service.spec.ts`: +1 test filter, +3 tests `restore`
- `product.controller.spec.ts`: fix `getAll` signature, +1 test `restore`

#### Quyết định kỹ thuật quan trọng

19. **ForbiddenException throw đồng bộ trong controller** — `throw new ForbiddenException()` trong method không async sẽ throw ngay, không wrap trong Promise. Test phải dùng `expect(() => controller.update(...)).toThrow()` chứ không phải `.rejects.toThrow()`.

20. **Product filter không cache** — Chỉ cache khi không có filter để tránh explosion của cache keys (mỗi combination filter là 1 key). Filtered requests đi thẳng vào DB, vẫn paginated.

21. **`repository.restore(id)` yêu cầu `withDeleted: true` khi check existence** — TypeORM mặc định filter `deleted_at IS NULL`, nên `findOne(id)` sẽ không tìm thấy record đã soft-delete. Phải dùng `findOne({ where: { id }, withDeleted: true })` để verify record tồn tại trước khi restore.

---

## Trạng thái tổng hợp (tính đến 2026-05-08)

### Tính năng đã hoàn thành 100%
| Tính năng | Trạng thái |
|---|---|
| Auth (register/login/profile/refresh-token) | ✅ Hoàn thành |
| User CRUD + soft delete + role change + password change | ✅ Hoàn thành |
| Security: ownership check PATCH /user/:id | ✅ Hoàn thành |
| Product CRUD + soft delete + restore | ✅ Hoàn thành |
| Product filter (name/categoryId/minPrice/maxPrice) + pagination | ✅ Hoàn thành |
| Redis cache cho GET /product (per-page key) | ✅ Hoàn thành |
| Category CRUD | ✅ Hoàn thành |
| Cart (add/update quantity/remove item/clear) | ✅ Hoàn thành |
| Order (checkout/view/cancel) + admin (all/status) | ✅ Hoàn thành |
| Order pagination (GET /order?page=&limit=) | ✅ Hoàn thành |
| BullMQ job `order.created` → OrderProcessor log | ✅ Hoàn thành |
| RBAC (JwtAuthGuard + RolesGuard) | ✅ Hoàn thành |
| Swagger UI tại `/api` | ✅ Hoàn thành |
| Rate limiting (ThrottlerGuard: login 10/min, register 5/min) | ✅ Hoàn thành |
| Soft delete + restore (User + Product) | ✅ Hoàn thành |
| Winston logger + LoggingMiddleware | ✅ Hoàn thành |
| Global ValidationPipe + AllHttpExceptionFilter | ✅ Hoàn thành |
| Unit tests: 116 tests, 15 suites | ✅ Hoàn thành |
| E2E tests: 28 tests (Auth→Category→Product→Cart→Order) + BullMQ mock | ✅ Hoàn thành |
| Admin GET /order/admin/all pagination | ✅ Hoàn thành |
| Config validation (Joi) — crash on startup nếu thiếu ENV | ✅ Hoàn thành |
| Health check GET /health — DB + Redis indicators | ✅ Hoàn thành |
| React: HomePage (product grid + filter + pagination) | ✅ Hoàn thành |
| React: CartPage (cart items + checkout) | ✅ Hoàn thành |
| React: OrdersPage (orders + cancel + pagination) | ✅ Hoàn thành |
| React: ProfilePage (user info + form đổi mật khẩu) | ✅ Hoàn thành |
| React: Admin pages (Products/Categories/Users/Orders) | ✅ Hoàn thành |
| React: AdminRoute guard + AdminNav tab bar | ✅ Hoàn thành |
| React: API extensions (category, user admin, product admin, order admin) | ✅ Hoàn thành |
| Upload ảnh sản phẩm — Multer, static serve, image_url column | ✅ Hoàn thành |
| Docker + docker-compose (4 services: mysql, redis, backend, frontend) | ✅ Hoàn thành |
| Real email (Nodemailer SMTP + fallback log nếu chưa cấu hình) | ✅ Hoàn thành |

### Bước tiếp theo (session sau)

**Ưu tiên cao:**
- [x] E2E tests cập nhật cho response format mới (pagination `{ data, total, page, limit, totalPages }`) và BullMQ mock
- [x] Admin GET /order/admin/all thêm pagination (hiện vẫn trả full array)

**Ưu tiên trung bình:**
- [x] Config validation với Joi schema — validate ENV vars khi startup thay vì crash lúc runtime
- [x] Health check endpoint `GET /health` — kiểm tra DB + Redis connection
- [x] Upload ảnh sản phẩm — Multer + lưu local (backend: `POST /product/:id/image`; frontend: file input trong AdminProductsPage)

**Ưu tiên thấp:**
- [x] Docker + docker-compose — containerize app + MySQL + Redis (Dockerfile, docker-compose.yml)
  - `Nest/docker-compose.yml`: 4 services, named volumes, healthcheck cho MySQL + Redis
  - `nest001/Dockerfile`: multi-stage (builder + production, `--omit=dev`)
  - `react001/Dockerfile`: multi-stage (builder + nginx:alpine)
  - `react001/nginx.conf`: `try_files` cho SPA routing + cache headers
- [x] Real email service — swap `OrderProcessor` logger ra Nodemailer (SMTP configurable)
- [ ] Refresh token rotation — invalidate old refresh token khi issue mới (bảo mật tốt hơn)

---

### Session 2026-05-08 — E2E Fix + Admin Pagination

#### Những gì đã hoàn thành

**BullMQ mock trong E2E:**
- `test/app.e2e-spec.ts`: thêm `import { getQueueToken } from '@nestjs/bullmq'`
- `.overrideProvider(getQueueToken('order')).useValue({ add: jest.fn() })` trước `.compile()` — checkout không phụ thuộc Redis thật trong E2E

**Admin pagination cho `GET /order/admin/all`:**
- `OrderService.findAllAdmin(page, limit)`: đổi `find()` → `findAndCount()`, trả `{ data, total, page, limit, totalPages }`
- `OrderController.findAllAdmin()`: thêm `@Query() pagination: PaginationDto`, truyền xuống service
- `order.service.spec.ts`: cập nhật test dùng `findAndCount` mock, kiểm tra shape paginated
- `order.controller.spec.ts`: cập nhật test truyền pagination arg, kiểm tra paginated shape
- `test/app.e2e-spec.ts`: đổi `Array.isArray(res.body)` → `Array.isArray(res.body.data)`

**Unit tests — trạng thái: 116/116 pass, 15 test suites** (không thay đổi số lượng)

#### Quyết định kỹ thuật quan trọng

30. **BullMQ override ở E2E layer, không sửa AppModule** — `overrideProvider(getQueueToken('order'))` trong TestingModule thay thế đúng DI token mà `@InjectQueue('order')` sử dụng. BullModule vẫn load nhưng `OrderService` nhận mock queue. Cách này không ảnh hưởng production code.

31. **`findAllAdmin` dùng `findAndCount` thay `find`** — Nhất quán với pattern pagination của `findAll` (user) và `findAll` (product). Admin endpoint giờ hỗ trợ `?page=&limit=` query params, tránh trả toàn bộ bảng khi có nhiều orders.

---

### Session 2026-05-08 — React Frontend (react001)

#### Những gì đã hoàn thành

**Khởi tạo dự án React (`react001/`):**
- Vite 8 + React 19 + TypeScript 6 + Tailwind CSS v4
- `@tanstack/react-query` v5 — server state management (staleTime 30s, retry 1)
- `react-router-dom` v7 — client-side routing
- `axios` v1 — HTTP client

**Cấu trúc thư mục `react001/src/`:**
```
api/
  axios.ts          ← axios instance + request/response interceptors
  auth.ts           ← login, register, getProfile
  cart.ts           ← get, addItem, updateItem, removeItem, clear
  order.ts          ← checkout, getAll (paginated), getById, cancel
  product.ts        ← getAll (filter + pagination), getById
store/
  AuthContext.tsx   ← Context + Provider + useAuth hook
router/
  ProtectedRoute.tsx ← redirect to /login nếu chưa đăng nhập
components/layout/
  Navbar.tsx        ← nav links, conditional auth buttons, logout
  Layout.tsx        ← wrapper với Navbar + main container
pages/
  LoginPage.tsx     ← form đăng nhập hoàn chỉnh
  RegisterPage.tsx  ← form đăng ký hoàn chỉnh
  ProfilePage.tsx   ← hiển thị user info từ AuthContext
  HomePage.tsx      ← scaffold (placeholder "Đang phát triển...")
  CartPage.tsx      ← scaffold
  OrdersPage.tsx    ← scaffold
types/
  api.types.ts      ← TypeScript interfaces cho toàn bộ API response
```

**`api/axios.ts` — Axios interceptors:**
- Request interceptor: inject `Authorization: Bearer {access_token}` từ localStorage
- Response interceptor: tự động refresh token khi nhận 401, retry request gốc; nếu refresh thất bại → clear tokens + redirect `/login`

**`store/AuthContext.tsx` — Auth state management:**
- `useState<User | null>` + `isLoading` — loading flag để `ProtectedRoute` không redirect sớm
- `useEffect` on mount: nếu có token trong localStorage → `authApi.getProfile()` để hydrate user
- `login(access_token, refresh_token)` — lưu tokens + fetch profile
- `logout()` — xóa tokens + clear user state

**`types/api.types.ts` — Interfaces đầy đủ:**
| Interface | Ghi chú |
|---|---|
| `User` | id, name, email, role |
| `Product` | id, name, price, description, category? |
| `Category` | id, name, description? |
| `PaginatedResult<T>` | data, total, page, limit, totalPages |
| `Cart` + `CartItem` | cart với items array, CartItem có product |
| `Order` + `OrderItem` | order với items, OrderItem có snapshot giá |
| `AuthTokens` | access_token + refresh_token |
| `ApiError` | statusCode, message, timestamp, path |

**Routing (App.tsx):**
| Route | Component | Guard |
|---|---|---|
| `/login` | LoginPage | public |
| `/register` | RegisterPage | public |
| `/` | HomePage + Layout | public |
| `/cart` | CartPage + Layout | ProtectedRoute |
| `/orders` | OrdersPage + Layout | ProtectedRoute |
| `/profile` | ProfilePage + Layout | ProtectedRoute |

**Trang hoàn chỉnh (có logic thật):**
- **LoginPage**: form email/password, validation client-side, error từ server, loading state, navigate `/` sau login
- **RegisterPage**: form name/email/password, validate min 6 ký tự, handle array error message từ ValidationPipe, navigate `/login` sau thành công
- **ProfilePage**: hiển thị name, email, role từ `useAuth()`

**Trang hoàn chỉnh (bổ sung từ session sau):**
- **HomePage**: filter form (name/minPrice/maxPrice), product grid 3 cột, pagination
- **CartPage**: danh sách items, quantity +/-, xoá item, order summary, checkout → navigate /orders
- **OrdersPage**: danh sách đơn hàng, badge status màu sắc, huỷ đơn pending, pagination

#### Quyết định kỹ thuật quan trọng

26. **`isLoading` trong AuthContext trước khi render ProtectedRoute** — Khi app mount, nếu có token, cần fetch profile trước khi quyết định redirect. Không có `isLoading`, `ProtectedRoute` thấy `isLoggedIn=false` và redirect `/login` ngay cả khi token hợp lệ. Pattern: render loading spinner cho đến khi hydration xong.

27. **Axios response interceptor tự refresh token** — Thay vì handle 401 ở từng component, interceptor tập trung xử lý: retry với token mới nếu refresh thành công, redirect `/login` nếu không. `_retry` flag ngăn infinite loop khi refresh request chính nó bị 401.

28. **TanStack Query với `staleTime: 30_000`** — Data không re-fetch trong 30s nếu vẫn đang được mount. Phù hợp với product listing ít thay đổi. Cache tự invalidate khi component unmount và re-mount sau 30s.

29. **`PaginatedResult<T>` generic interface** — Một interface cho mọi paginated response (product, order). Matching chính xác với backend response shape `{ data, total, page, limit, totalPages }`.

#### Bước tiếp theo (react001)

**Ưu tiên cao:**
- [x] HomePage: implement product listing với TanStack Query + `productApi.getAll()`, pagination, filter form
- [x] CartPage: hiển thị cart items, update quantity, remove item, checkout button
- [x] OrdersPage: danh sách orders với pagination, trạng thái order

**Ưu tiên trung bình:**
- [x] ProfilePage: form đổi mật khẩu (gọi `PATCH /user/me/password`)
- [x] Admin pages: quản lý product/category/user/order (chỉ hiển thị nếu `user.role === 'admin'`)

---

### Session 2026-05-08 — Config Validation + Health Check + Frontend 3 trang

#### Những gì đã hoàn thành

**Backend — Config validation (Joi):**
- Cài `joi`; `app.module.ts` thêm `validationSchema: Joi.object({...})` vào `ConfigModule.forRoot()`
- Validate 11 ENV vars khi app startup: `JWT_SECRET` và `DB_NAME`/`DB_USERNAME` là required, còn lại có default
- App crash ngay lúc boot nếu thiếu biến bắt buộc — thay vì crash runtime sau

**Backend — Health check `GET /health`:**
- Cài `@nestjs/terminus`
- `src/modules/health/health.controller.ts` + `health.module.ts` — `@HealthCheck()` check 2 indicators:
  - `TypeOrmHealthIndicator.pingCheck('database')` — ping MySQL
  - Custom Redis check: `cacheManager.set('health_ping', '1', 5)` — nếu throw → down
- `CACHE_MANAGER` inject trực tiếp (không cần import `CacheModule` vì isGlobal: true)
- `HealthModule` import `TerminusModule`, đăng ký trong `app.module.ts`

**Frontend — HomePage (react001/src/pages/HomePage.tsx):**
- Filter form: name (text), minPrice/maxPrice (number) + nút Lọc/Xoá bộ lọc
- TanStack Query: `queryKey: ['products', page, filters]`, `staleTime: 30s`
- Product grid 3 cột (responsive: 1→2→3), card: tên, category badge, giá format `toLocaleString('vi-VN')`
- Pagination: Trước/Sau + "Trang X / Y" (ẩn khi chỉ có 1 trang)

**Frontend — CartPage (react001/src/pages/CartPage.tsx):**
- `useQuery(['cart'], cartApi.get)` — backend auto-create cart nếu chưa có
- Quantity controls: nút `-` gọi `updateItem(id, q-1)` (khi q=1 → q=0 → backend xoá item), nút `+` tăng
- `useMutation` cho updateItem, removeItem, checkout
- Order summary sticky với tổng tiền + nút Thanh toán
- Sau checkout: `invalidate ['cart']` + `navigate('/orders')`
- Empty state với link về trang chủ

**Frontend — OrdersPage (react001/src/pages/OrdersPage.tsx):**
- `useQuery(['orders', page], () => orderApi.getAll(page, 10))`
- Status badge color-coded: pending=vàng, confirmed=xanh, cancelled=đỏ
- `useMutation` cancel: chỉ hiện nút "Huỷ đơn" khi `status === 'pending'`
- Format ngày `toLocaleDateString('vi-VN')` 
- Pagination

**Unit tests — trạng thái: 116/116 pass** (không thay đổi)
**TypeScript — react001 `tsc --noEmit`: 0 errors**

#### Quyết định kỹ thuật quan trọng

32. **Joi validation với `DB_PASSWORD: Joi.string().allow('')`** — Password có thể rỗng (MySQL local thường không có password). `Joi.string().required()` sẽ reject empty string, phải dùng `.allow('')` để cho phép.

33. **Redis health check dùng `cacheManager.set()` thay vì ping** — `@nestjs/terminus` không có built-in Redis indicator. Dùng `set()` với TTL 5s để test connectivity thực sự. Key `health_ping` tự hết hạn, không pollute cache.

34. **CartPage dùng `quantity - 1` thay vì check trước** — Gọi `updateItem(id, 0)` khi quantity=1 — backend nhận `quantity=0` và tự xoá item (behavior đã implement trong CartService). Không cần frontend distinguish giữa "giảm quantity" và "xoá item".

35. **`cancelMutation.variables === order.id` để disable đúng nút** — Khi cancel đang pending, chỉ disable nút của order đang huỷ, không disable toàn bộ danh sách.

---

### Session 2026-05-08 — ProfilePage + Admin Pages

#### Những gì đã hoàn thành

**Frontend — ProfilePage đổi mật khẩu (`react001/src/pages/ProfilePage.tsx`):**
- Giữ nguyên phần user info, thêm form đổi mật khẩu bên dưới
- 3 input: `currentPassword`, `newPassword`, `confirmNewPassword`
- Client-side validate: min 6 ký tự + confirm phải khớp
- Success message tự ẩn sau 3s, form reset sau khi thành công
- `react001/src/api/user.ts` tạo mới — `userApi.changePassword()`

**Frontend — Admin infrastructure:**
- `react001/src/router/AdminRoute.tsx` — guard, redirect `/` nếu `user.role !== 'admin'` hoặc chưa login
- `react001/src/components/admin/AdminNav.tsx` — tab bar dùng chung: Sản phẩm | Danh mục | Người dùng | Đơn hàng (NavLink highlight active)
- Navbar: thêm link "Quản trị" màu tím, chỉ hiện khi `user.role === 'admin'`
- App.tsx: 4 routes `/admin/*` bọc `AdminRoute + Layout`

**Frontend — API extensions:**
- `react001/src/api/category.ts` (mới): `getAll`, `create`, `update`, `delete`
- `react001/src/api/user.ts` mở rộng: thêm `getAll`, `updateRole`, `delete`, `restore`
- `react001/src/api/product.ts` mở rộng: thêm `create`, `update`, `delete`, `restore` + interface `ProductFormData`
- `react001/src/api/order.ts` mở rộng: thêm `getAllAdmin`, `updateStatus`
- `react001/src/types/api.types.ts`: thêm `user?: { id, name, email }` vào `Order` (admin endpoint trả về relation user)

**Frontend — 4 Admin pages:**

| Page | Route | Tính năng |
|---|---|---|
| `AdminCategoriesPage` | `/admin/categories` | CRUD, form inline, xác nhận xoá, không có pagination (trả mảng) |
| `AdminProductsPage` | `/admin/products` | CRUD + pagination (10/trang), form grid 2 cột, dropdown category, soft delete |
| `AdminUsersPage` | `/admin/users` | List users, toggle role (user↔admin), soft delete, bảo vệ account bản thân |
| `AdminOrdersPage` | `/admin/orders` | List paginated, dropdown status + nút Lưu per row, format ngày vi-VN |

**TypeScript — react001 `tsc --noEmit`: 0 errors**

#### Quyết định kỹ thuật quan trọng

36. **`AdminRoute` tách biệt với `ProtectedRoute`** — `ProtectedRoute` chỉ check `isLoggedIn`. `AdminRoute` check thêm `user.role === 'admin'`. Tách ra để mỗi guard có một trách nhiệm, dễ mở rộng (ví dụ thêm role 'moderator' sau).

37. **`AdminNav` là shared component, không inline trong mỗi trang** — 4 trang cùng dùng tab bar. Đặt trong `components/admin/` thay vì copy-paste. NavLink tự highlight active dựa vào URL match.

38. **Bảo vệ admin không thể tự xoá/đổi role mình (`u.id !== currentUser?.id`)** — Nếu admin duy nhất tự đổi role thành user thì mất quyền admin. Check này ở frontend — backend cũng có thể thêm sau nếu cần.

39. **`statusMap` state riêng trong AdminOrdersPage** — Dropdown status giữ giá trị đã chọn local, chỉ gửi API khi bấm "Lưu". Tránh gọi API mỗi lần dropdown thay đổi. Nút "Lưu" disable khi `selected === order.status` (chưa thay đổi gì).

40. **`ProductFormData` interface export từ `api/product.ts`** — Form data type dùng cả trong `productApi.create/update` lẫn trong `AdminProductsPage` state. Export interface thay vì define inline ở component — tránh duplication và đảm bảo nhất quán với API call.

---

## Trạng thái cuối cùng — Dự án react001 (tính đến cuối session 2026-05-08)

### Tất cả pages đã hoàn thiện

| Route | Component | Auth | Tình trạng |
|---|---|---|---|
| `/login` | LoginPage | public | ✅ |
| `/register` | RegisterPage | public | ✅ |
| `/` | HomePage | public | ✅ Filter + Pagination |
| `/cart` | CartPage | user | ✅ CRUD + Checkout |
| `/orders` | OrdersPage | user | ✅ Paginated + Cancel |
| `/profile` | ProfilePage | user | ✅ Info + Đổi MK |
| `/admin/products` | AdminProductsPage | admin | ✅ CRUD + Pagination |
| `/admin/categories` | AdminCategoriesPage | admin | ✅ CRUD |
| `/admin/users` | AdminUsersPage | admin | ✅ Role + Delete |
| `/admin/orders` | AdminOrdersPage | admin | ✅ Status + Pagination |

### Còn lại (tùy chọn — security hardening)

- [ ] **Refresh token rotation** — khi `POST /auth/refresh-token` cấp token mới, invalidate token cũ. Hiện tại token cũ vẫn valid đến hết 7d. Cần thêm `refresh_token_version` hoặc lưu token hash mới ghi đè khi issue. Ảnh hưởng `AuthService.verifyRefreshToken()` + `UserService.saveRefreshToken()`.

---

### Session 2026-05-08 — Upload ảnh sản phẩm (Multer)

#### Những gì đã hoàn thành

**Backend:**
- Cài `@types/multer` (devDependency — types cho TypeScript)
- `src/entities/Product.ts`: thêm `@Column({ nullable: true }) image_url: string | null` — TypeORM tự ADD column
- `src/main.ts`: cast sang `NestExpressApplication`, thêm `mkdirSync('uploads/', { recursive: true })` và `app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' })`
- `ProductService.updateImage(id, filename)`: tìm product, gán `image_url = /uploads/${filename}`, save, clear cache
- `ProductController` thêm `POST :id/image`:
  - `FileInterceptor('image')` với `diskStorage` — lưu vào `uploads/`, filename = `product-${id}-${timestamp}${ext}`
  - `fileFilter`: reject nếu `mimetype` không bắt đầu `image/`
  - `limits.fileSize`: 5MB
  - `@ApiConsumes('multipart/form-data')` + `@ApiBody` — Swagger docs cho file upload

**Frontend:**
- `src/types/api.types.ts`: thêm `image_url?: string | null` vào `Product`
- `src/api/product.ts`: thêm `uploadImage(id, file)` — dùng `FormData`, Axios tự set `multipart/form-data`
- `src/pages/HomePage.tsx`: thay placeholder bằng `<img src="http://localhost:3000{image_url}">` nếu có ảnh, giữ placeholder nếu không
- `src/pages/admin/AdminProductsPage.tsx`:
  - Thêm cột "Ảnh" đầu tiên trong table — thumbnail 40×40 nếu có `image_url`
  - Thêm nút "Ảnh" per row, 1 hidden `<input ref>` dùng chung
  - `uploadMutation` với `uploadingId` state để track row đang upload
  - `e.target.value = ''` sau khi chọn file — reset input để có thể chọn lại cùng file

**Backend build**: ✅ pass | **Unit tests**: 116/116 ✅ | **Frontend tsc**: 0 errors ✅

#### Quyết định kỹ thuật quan trọng

41. **1 hidden file input dùng chung cho toàn bảng** — Thay vì render `<input type="file">` trong mỗi row (tốn DOM), dùng 1 input với `ref`, trigger `.click()` khi bấm nút upload của row. `uploadingId` state ghi nhớ row nào đang được upload. Pattern này sạch hơn và không gây vấn đề về z-index hay overflow.

42. **`process.cwd()` thay vì `__dirname`** — `__dirname` trong ts-node là `src/`, trong compiled JS là `dist/`, gây inconsistency. `process.cwd()` luôn là project root (nơi chạy `npm run start:dev`) nên reliable hơn trong cả môi trường dev và prod.

43. **`mkdirSync({ recursive: true })` trong bootstrap()** — Đảm bảo thư mục `uploads/` luôn tồn tại trước khi Multer cố gắng ghi file. Không cần tạo thủ công, không fail nếu thư mục đã tồn tại. Chạy mỗi lần app start — cheap operation.

44. **fileFilter dùng `mimetype.startsWith('image/')` thay vì whitelist extension** — Extension có thể bị rename (file .exe đổi thành .jpg). MIME type được browser/OS set dựa trên nội dung file, khó fake hơn. Tuy nhiên đây không phải security đảm bảo tuyệt đối — production nên dùng thêm magic bytes check.

---

### Session 2026-05-08 — Docker + docker-compose

#### Những gì đã hoàn thành

**6 files mới tạo:**
- `Nest/docker-compose.yml` — orchestrate 4 services: mysql, redis, backend, frontend
- `nest001/Dockerfile` — multi-stage: stage `builder` (`npm ci` + `npm run build`) → stage `production` (`npm ci --omit=dev` + copy `dist/`, `mkdir uploads/`)
- `nest001/.dockerignore` — exclude: node_modules, dist, .env, uploads, *.log
- `react001/Dockerfile` — multi-stage: stage `builder` (`npm ci` + `npm run build`) → stage `production` (`nginx:alpine` + copy `dist/`)
- `react001/nginx.conf` — `try_files $uri $uri/ /index.html` cho SPA routing + cache headers 1y cho static assets
- `react001/.dockerignore` — exclude: node_modules, dist

**docker-compose.yml chi tiết:**
- `mysql:8` với `MYSQL_ROOT_PASSWORD: root`, `MYSQL_DATABASE: nestjs001`, named volume `mysql_data`, healthcheck `mysqladmin ping`
- `redis:7-alpine` với named volume `redis_data`, healthcheck `redis-cli ping`
- `backend`: build từ `./nest001`, port `3000:3000`, `DB_HOST: mysql` / `REDIS_HOST: redis` (service name trong Docker network), volume `uploads_data:/app/uploads`, `depends_on` với `condition: service_healthy`
- `frontend`: build từ `./react001`, port `5173:80` (giữ 5173 để CORS không cần sửa)

**Lệnh sử dụng:**
```bash
docker compose up --build      # build + start
docker compose up --build -d   # detached
docker compose down            # stop (giữ volumes)
docker compose down -v         # stop + xóa volumes
```

#### Quyết định kỹ thuật quan trọng

45. **Port frontend `5173:80` thay vì `80:80`** — Backend có `enableCors({ origin: 'http://localhost:5173' })`. Giữ port 5173 để CORS không bị reject mà không cần sửa code backend.

46. **`depends_on: condition: service_healthy`** — Backend chờ MySQL + Redis pass healthcheck trước khi start. Tránh race condition khi app boot trước khi DB sẵn sàng nhận connection.

47. **Named volumes cho uploads** — `uploads_data:/app/uploads` đảm bảo file ảnh đã upload không mất khi `docker compose down`. Chỉ mất khi `docker compose down -v`.

48. **`npm ci --omit=dev` trong production stage** — Loại bỏ devDependencies (jest, ts, etc.) khỏi production image. Image nhỏ hơn, attack surface nhỏ hơn.

---

### Session 2026-05-08 — Nodemailer (Real Email)

#### Những gì đã hoàn thành

**2 files mới:**
- `src/modules/mail/mail.service.ts` — `MailService` inject `ConfigService`, tạo Nodemailer transporter từ SMTP config
- `src/modules/mail/mail.module.ts` — export `MailService`

**4 files sửa:**
- `order.processor.ts`: inject `MailService` (constructor), gọi `mailService.sendOrderConfirmation(email, orderId)` thay vì `logger.log`
- `order.module.ts`: import `MailModule`
- `app.module.ts`: thêm 5 `MAIL_*` vars vào Joi schema
- `order.processor.spec.ts`: thêm `mockMailService`, đổi assertion từ `logSpy` sang `sendOrderConfirmation.toHaveBeenCalledWith(...)`

**2 files config cập nhật:**
- `.env`: thêm MAIL_* vars (empty + comment hướng dẫn dùng Gmail App Password)
- `docker-compose.yml`: thêm MAIL_* vào backend environment (mặc định rỗng)

**Fallback behavior:** Nếu `MAIL_USER`/`MAIL_PASS` trống → `MailService` không tạo transporter → `sendOrderConfirmation()` chỉ log, không throw. App hoạt động bình thường khi dev chưa cấu hình SMTP.

**Unit tests — trạng thái: 116/116 pass, 16 suites**

#### Quyết định kỹ thuật quan trọng

49. **`MailService` tạo transporter trong constructor, không lazy** — Transporter được tạo 1 lần khi module init. Nếu SMTP config sai → fail fast khi app start thay vì fail lúc runtime khi gửi email. Trade-off: nếu SMTP không accessible khi boot nhưng accessible sau, cần restart app.

50. **`transporter: Transporter | null` pattern** — Thay vì throw error khi SMTP chưa cấu hình, giữ `null` và check trước khi gửi. Cho phép chạy dev/test hoàn toàn offline. Pattern phổ biến cho optional external service.

51. **`MailModule` export `MailService`, không import vào `AppModule` global** — Chỉ `OrderModule` cần `MailService`. Import `MailModule` trực tiếp trong `OrderModule` thay vì declare global → DI scoping rõ ràng, dễ hiểu dependency graph.

---

## Trạng thái dự án cuối cùng (2026-05-08)

### Tóm tắt

| Hạng mục | Trạng thái |
|---|---|
| Backend API (NestJS) | ✅ 100% hoàn thiện |
| Frontend (React) | ✅ 100% hoàn thiện — 10/10 trang |
| Testing | ✅ 116 unit tests + 28 E2E tests |
| Infrastructure | ✅ Docker, Health check, Config validation |
| Email | ✅ Nodemailer SMTP (fallback log) |
| Upload ảnh | ✅ Multer + static serve |

### Còn lại duy nhất (tùy chọn)

**Refresh token rotation** — security hardening, không ảnh hưởng đến functionality. Token cũ vẫn valid đến hết 7d sau khi issue token mới. Nếu cần: sửa `AuthService.refreshToken()` để hash mới ghi đè `refresh_token` trong DB → token cũ tự invalid vì bcrypt compare sẽ fail.
