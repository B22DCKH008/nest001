import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CartService } from './cart.service';
import { Cart } from 'src/entities/Cart';
import { CartItem } from 'src/entities/CartItem';
import { Product } from 'src/entities/Product';

const mockProduct = { id: 1, name: 'Test Product', price: 100, description: 'Desc' } as Product;

const mockCartItem = {
  id: 1,
  product: mockProduct,
  quantity: 2,
  created_at: new Date(),
  updated_at: new Date(),
} as CartItem;

const mockCart = {
  id: 1,
  user: { id: 1 },
  items: [mockCartItem],
  created_at: new Date(),
  updated_at: new Date(),
} as unknown as Cart;

const mockCartRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

const mockCartItemRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
};

const mockProductRepository = {
  findOneBy: jest.fn(),
};

describe('CartService', () => {
  let service: CartService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: getRepositoryToken(Cart), useValue: mockCartRepository },
        { provide: getRepositoryToken(CartItem), useValue: mockCartItemRepository },
        { provide: getRepositoryToken(Product), useValue: mockProductRepository },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    jest.clearAllMocks();
  });

  describe('getOrCreateCart', () => {
    it('trả về cart hiện có', async () => {
      mockCartRepository.findOne.mockResolvedValue(mockCart);
      const result = await service.getOrCreateCart(1);
      expect(result).toEqual(mockCart);
      expect(mockCartRepository.findOne).toHaveBeenCalledTimes(1);
    });

    it('tạo cart mới khi chưa có', async () => {
      mockCartRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...mockCart, items: [] });
      mockCartRepository.create.mockReturnValue({ user: { id: 1 }, items: [] });
      mockCartRepository.save.mockResolvedValue({ ...mockCart, items: [] });

      const result = await service.getOrCreateCart(1);

      expect(mockCartRepository.create).toHaveBeenCalled();
      expect(mockCartRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('addItem', () => {
    it('throw NotFoundException khi product không tồn tại', async () => {
      mockProductRepository.findOneBy.mockResolvedValue(null);
      await expect(service.addItem(1, { product_id: 999, quantity: 1 })).rejects.toThrow(NotFoundException);
    });

    it('cộng quantity khi product đã có trong cart', async () => {
      const inlineItem = { id: 1, product: { id: 1 }, quantity: 2, created_at: new Date(), updated_at: new Date() } as any;
      const cartWithItem = { id: 1, user: { id: 1 }, items: [inlineItem], updated_at: new Date() } as any;

      mockProductRepository.findOneBy.mockResolvedValue(mockProduct);
      mockCartItemRepository.save.mockResolvedValue({});
      mockCartRepository.update.mockResolvedValue({});

      jest.spyOn(service, 'getOrCreateCart').mockResolvedValue(cartWithItem);

      await service.addItem(1, { product_id: 1, quantity: 1 });

      expect(mockCartItemRepository.create).not.toHaveBeenCalled();
      expect(mockCartItemRepository.save).toHaveBeenCalledTimes(1);
      expect(inlineItem.quantity).toBe(3);
    });

    it('tạo CartItem mới khi product chưa có trong cart', async () => {
      const emptyCart = { ...mockCart, items: [] };
      mockProductRepository.findOneBy.mockResolvedValue(mockProduct);
      mockCartRepository.findOne.mockResolvedValue(emptyCart);
      mockCartItemRepository.create.mockReturnValue({ product: { id: 2 }, quantity: 1 });
      mockCartItemRepository.save.mockResolvedValue({});
      mockCartRepository.update.mockResolvedValue({});

      await service.addItem(1, { product_id: 2, quantity: 1 });

      expect(mockCartItemRepository.create).toHaveBeenCalled();
      expect(mockCartItemRepository.save).toHaveBeenCalled();
    });
  });

  describe('updateItem', () => {
    it('throw NotFoundException khi item không tồn tại', async () => {
      mockCartItemRepository.findOne.mockResolvedValue(null);
      await expect(service.updateItem(1, 999, { quantity: 2 })).rejects.toThrow(NotFoundException);
    });

    it('throw NotFoundException khi item không thuộc user', async () => {
      mockCartItemRepository.findOne.mockResolvedValue(null);
      await expect(service.updateItem(1, 1, { quantity: 2 })).rejects.toThrow(NotFoundException);
    });

    it('xóa item khi quantity = 0', async () => {
      mockCartItemRepository.findOne.mockResolvedValue({
        ...mockCartItem,
        cart: { user: { id: 1 } },
      });
      mockCartItemRepository.delete.mockResolvedValue(undefined);
      mockCartRepository.findOne.mockResolvedValue(mockCart);

      await service.updateItem(1, 1, { quantity: 0 });

      expect(mockCartItemRepository.delete).toHaveBeenCalledWith(1);
    });

    it('cập nhật quantity khi quantity > 0', async () => {
      mockCartItemRepository.findOne.mockResolvedValue({
        ...mockCartItem,
        cart: { user: { id: 1 } },
      });
      mockCartItemRepository.save.mockResolvedValue({ ...mockCartItem, quantity: 5 });
      mockCartRepository.findOne.mockResolvedValue(mockCart);

      await service.updateItem(1, 1, { quantity: 5 });

      expect(mockCartItemRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 5 }),
      );
    });
  });

  describe('removeItem', () => {
    it('throw NotFoundException khi item không tồn tại', async () => {
      mockCartItemRepository.findOne.mockResolvedValue(null);
      await expect(service.removeItem(1, 999)).rejects.toThrow(NotFoundException);
    });

    it('xóa item thành công', async () => {
      mockCartItemRepository.findOne.mockResolvedValue({
        ...mockCartItem,
        cart: { user: { id: 1 } },
      });
      mockCartItemRepository.delete.mockResolvedValue(undefined);
      mockCartRepository.findOne.mockResolvedValue(mockCart);

      const result = await service.removeItem(1, 1);

      expect(mockCartItemRepository.delete).toHaveBeenCalledWith(1);
      expect(result).toBeDefined();
    });
  });

  describe('clearCart', () => {
    it('xóa toàn bộ items và trả về cart trống', async () => {
      const emptyCart = { ...mockCart, items: [] };
      mockCartRepository.findOne
        .mockResolvedValueOnce(mockCart)
        .mockResolvedValueOnce(emptyCart);
      mockCartItemRepository.delete.mockResolvedValue(undefined);
      mockCartRepository.update.mockResolvedValue({});

      const result = await service.clearCart(1);

      expect(mockCartItemRepository.delete).toHaveBeenCalledWith({ cart: { id: 1 } });
      expect(result.items).toEqual([]);
    });
  });
});
