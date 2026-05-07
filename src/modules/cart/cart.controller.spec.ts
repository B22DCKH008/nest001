import { Test, TestingModule } from '@nestjs/testing';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

const mockCart = {
  id: 1,
  user: { id: 1 },
  items: [],
  created_at: new Date(),
  updated_at: new Date(),
};

const mockCartService = {
  getOrCreateCart: jest.fn(),
  addItem: jest.fn(),
  updateItem: jest.fn(),
  removeItem: jest.fn(),
  clearCart: jest.fn(),
};

const mockRequest = { user: { id: 1 } };

describe('CartController', () => {
  let controller: CartController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [{ provide: CartService, useValue: mockCartService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CartController>(CartController);
    jest.clearAllMocks();
  });

  describe('getCart', () => {
    it('trả về cart của user hiện tại', async () => {
      mockCartService.getOrCreateCart.mockResolvedValue(mockCart);
      const result = await controller.getCart(mockRequest);
      expect(mockCartService.getOrCreateCart).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockCart);
    });
  });

  describe('addItem', () => {
    it('thêm item vào cart và trả về cart đã cập nhật', async () => {
      const dto = { product_id: 1, quantity: 2 };
      const updatedCart = { ...mockCart, items: [{ product: { id: 1 }, quantity: 2 }] };
      mockCartService.addItem.mockResolvedValue(updatedCart);
      const result = await controller.addItem(mockRequest, dto as any);
      expect(mockCartService.addItem).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(updatedCart);
    });
  });

  describe('updateItem', () => {
    it('cập nhật quantity và trả về cart', async () => {
      mockCartService.updateItem.mockResolvedValue(mockCart);
      const result = await controller.updateItem(mockRequest, 1, { quantity: 3 } as any);
      expect(mockCartService.updateItem).toHaveBeenCalledWith(1, 1, { quantity: 3 });
      expect(result).toEqual(mockCart);
    });
  });

  describe('removeItem', () => {
    it('xóa item và trả về cart', async () => {
      mockCartService.removeItem.mockResolvedValue(mockCart);
      const result = await controller.removeItem(mockRequest, 1);
      expect(mockCartService.removeItem).toHaveBeenCalledWith(1, 1);
      expect(result).toEqual(mockCart);
    });
  });

  describe('clearCart', () => {
    it('xóa toàn bộ items và trả về cart trống', async () => {
      mockCartService.clearCart.mockResolvedValue(mockCart);
      const result = await controller.clearCart(mockRequest);
      expect(mockCartService.clearCart).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockCart);
    });
  });
});
