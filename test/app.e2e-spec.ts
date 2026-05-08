import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AllHttpExceptionFilter } from 'src/exceptions/http-exception.filter';

// Set test DB before AppModule resolves env vars
process.env.DB_NAME = 'nestjs001_test';

import { AppModule } from 'src/app.module';

describe('E2E Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let userToken: string;
  let adminToken: string;
  let adminId: number;
  let categoryId: number;
  let productId: number;
  let cartItemId: number;
  let orderId: number;

  async function cleanupTestData(ds: DataSource) {
    await ds.query(`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%_e2e@test.com'))`);
    await ds.query(`DELETE FROM orders WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%_e2e@test.com')`);
    await ds.query(`DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%_e2e@test.com'))`);
    await ds.query(`DELETE FROM carts WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%_e2e@test.com')`);
    await ds.query(`DELETE FROM cart_items WHERE product_id IN (SELECT id FROM products WHERE name LIKE 'E2E%')`);
    await ds.query(`DELETE FROM products WHERE name LIKE 'E2E%'`);
    await ds.query(`DELETE FROM categories WHERE name LIKE 'E2E%'`);
    await ds.query(`DELETE FROM users WHERE email LIKE '%_e2e@test.com'`);
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new AllHttpExceptionFilter());
    await app.init();

    dataSource = moduleFixture.get(DataSource);

    // Xóa data cũ từ lần chạy trước (nếu có)
    await cleanupTestData(dataSource);

    // Tạo user thường
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Test User', email: 'user_e2e@test.com', password: 'password123' });

    // Tạo admin user
    const adminRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Admin User', email: 'admin_e2e@test.com', password: 'password123' });
    adminId = adminRes.body.id;

    // Promote admin bằng DataSource
    await dataSource.query(`UPDATE users SET role = 'admin' WHERE id = ?`, [adminId]);

    // Login cả 2
    const loginUser = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user_e2e@test.com', password: 'password123' });
    userToken = loginUser.body.access_token;

    const loginAdmin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin_e2e@test.com', password: 'password123' });
    adminToken = loginAdmin.body.access_token;
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await cleanupTestData(dataSource);
    }
    await app.close();
  });

  // ─── Auth ────────────────────────────────────────────────────────────────────

  describe('Auth', () => {
    it('POST /auth/register → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Extra User', email: 'extra_e2e@test.com', password: 'password123' });
      expect(res.status).toBe(201);
      expect(res.body.email).toBe('extra_e2e@test.com');
      await dataSource.query(`DELETE FROM users WHERE email = 'extra_e2e@test.com'`);
    });

    it('POST /auth/login → 201, có access_token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'user_e2e@test.com', password: 'password123' });
      expect(res.status).toBe(201);
      expect(res.body.access_token).toBeDefined();
      expect(res.body.refresh_token).toBeDefined();
    });

    it('POST /auth/login sai password → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'user_e2e@test.com', password: 'wrongpassword' });
      expect(res.status).toBe(401);
    });

    it('GET /auth/profile có token → 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(200);
      expect(res.body.email).toBe('user_e2e@test.com');
    });

    it('GET /auth/profile không có token → 401', async () => {
      const res = await request(app.getHttpServer()).get('/auth/profile');
      expect(res.status).toBe(401);
    });
  });

  // ─── Category ────────────────────────────────────────────────────────────────

  describe('Category', () => {
    it('POST /category (user thường) → 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/category')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Test Category' });
      expect(res.status).toBe(403);
    });

    it('POST /category (admin) → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/category')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'E2E Category', description: 'For E2E testing' });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('E2E Category');
      categoryId = res.body.id;
    });

    it('GET /category → 200, trả về mảng', async () => {
      const res = await request(app.getHttpServer()).get('/category');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((c: any) => c.id === categoryId)).toBe(true);
    });

    it('GET /category/:id → 200', async () => {
      const res = await request(app.getHttpServer()).get(`/category/${categoryId}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(categoryId);
    });
  });

  // ─── Product ─────────────────────────────────────────────────────────────────

  describe('Product', () => {
    it('POST /product (user thường) → 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/product')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Fake Product', price: 100, description: 'X' });
      expect(res.status).toBe(403);
    });

    it('POST /product (admin) → 201, có category', async () => {
      const res = await request(app.getHttpServer())
        .post('/product')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'E2E Product', price: 500000, description: 'Test product', category_id: categoryId });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('E2E Product');
      productId = res.body.id;
    });

    it('GET /product → 200, có kèm category', async () => {
      const res = await request(app.getHttpServer()).get('/product');
      expect(res.status).toBe(200);
      const product = res.body.data.find((p: any) => p.id === productId);
      expect(product).toBeDefined();
      expect(product.category?.id).toBe(categoryId);
    });

    it('GET /product/:id → 200', async () => {
      const res = await request(app.getHttpServer()).get(`/product/${productId}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(productId);
    });

    it('PATCH /product/:id (admin) → 200', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/product/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ price: 600000 });
      expect(res.status).toBe(200);
      expect(Number(res.body.price)).toBe(600000);
    });
  });

  // ─── Cart ────────────────────────────────────────────────────────────────────

  describe('Cart', () => {
    it('GET /cart không có token → 401', async () => {
      const res = await request(app.getHttpServer()).get('/cart');
      expect(res.status).toBe(401);
    });

    it('GET /cart → 200, cart rỗng (tự tạo nếu chưa có)', async () => {
      const res = await request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(200);
      expect(res.body.items).toEqual([]);
    });

    it('POST /cart/items → 201, item được thêm', async () => {
      const res = await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ product_id: productId, quantity: 2 });
      expect(res.status).toBe(201);
      const item = res.body.items.find((i: any) => i.product.id === productId);
      expect(item).toBeDefined();
      expect(item.quantity).toBe(2);
      cartItemId = item.id;
    });

    it('POST /cart/items cùng product → cộng quantity', async () => {
      const res = await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ product_id: productId, quantity: 1 });
      expect(res.status).toBe(201);
      const item = res.body.items.find((i: any) => i.product.id === productId);
      expect(item.quantity).toBe(3);
      cartItemId = item.id;
    });

    it('PATCH /cart/items/:id { quantity: 0 } → item bị xóa', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/cart/items/${cartItemId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ quantity: 0 });
      expect(res.status).toBe(200);
      expect(res.body.items).toEqual([]);
    });

    it('DELETE /cart → cart trống', async () => {
      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ product_id: productId, quantity: 1 });

      const res = await request(app.getHttpServer())
        .delete('/cart')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(200);
      expect(res.body.items).toEqual([]);
    });
  });

  // ─── Order ───────────────────────────────────────────────────────────────────

  describe('Order', () => {
    it('POST /order/checkout (cart trống) → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/order/checkout')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(400);
    });

    it('POST /order/checkout → 201, status pending, cart bị xóa', async () => {
      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ product_id: productId, quantity: 2 });

      const res = await request(app.getHttpServer())
        .post('/order/checkout')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('pending');
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].product_id).toBe(productId);
      expect(res.body.items[0].quantity).toBe(2);
      orderId = res.body.id;

      const cartRes = await request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${userToken}`);
      expect(cartRes.body.items).toEqual([]);
    });

    it('GET /order → 200, có order vừa tạo', async () => {
      const res = await request(app.getHttpServer())
        .get('/order')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.some((o: any) => o.id === orderId)).toBe(true);
    });

    it('GET /order/:id → 200, chi tiết order', async () => {
      const res = await request(app.getHttpServer())
        .get(`/order/${orderId}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(orderId);
    });

    it('PATCH /order/:id/cancel → 200, status cancelled', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/order/${orderId}/cancel`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('cancelled');
    });

    it('PATCH /order/:id/cancel (đã cancelled) → 400', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/order/${orderId}/cancel`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(400);
    });

    it('GET /order/admin/all (user thường) → 403', async () => {
      const res = await request(app.getHttpServer())
        .get('/order/admin/all')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(403);
    });

    it('GET /order/admin/all (admin) → 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/order/admin/all')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
