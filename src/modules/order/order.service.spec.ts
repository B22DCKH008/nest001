import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrderService } from './order.service';
import { Order } from 'src/entities/Order';
import { OrderItem } from 'src/entities/OrderItem';
import { User } from 'src/entities/User';
import { CartService } from 'src/modules/cart/cart.service';

const mockCart = {
  id: 1,
  items: [
    { product: { id: 1, name: 'Product A', price: 100 }, quantity: 2 },
    { product: { id: 2, name: 'Product B', price: 50 }, quantity: 1 },
  ],
};

const mockOrder = {
  id: 1,
  user: { id: 1 },
  status: 'pending',
  total_amount: 250,
  items: [],
  created_at: new Date(),
  updated_at: new Date(),
} as unknown as Order;

const mockUser = { id: 1, email: 'test@example.com' } as User;

const mockOrderRepository = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findAndCount: jest.fn(),
};

const mockOrderItemRepository = {
  create: jest.fn(),
  save: jest.fn(),
};

const mockUserRepository = {
  findOne: jest.fn(),
};

const mockCartService = {
  getOrCreateCart: jest.fn(),
  clearCart: jest.fn(),
};

const mockOrderQueue = {
  add: jest.fn(),
};

describe('OrderService', () => {
  let service: OrderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: getRepositoryToken(Order), useValue: mockOrderRepository },
        { provide: getRepositoryToken(OrderItem), useValue: mockOrderItemRepository },
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: CartService, useValue: mockCartService },
        { provide: getQueueToken('order'), useValue: mockOrderQueue },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    jest.clearAllMocks();
  });

  describe('checkout', () => {
    it('throw BadRequestException khi cart trống', async () => {
      mockCartService.getOrCreateCart.mockResolvedValue({ id: 1, items: [] });
      await expect(service.checkout(1)).rejects.toThrow(BadRequestException);
    });

    it('tạo order từ cart, push job order.created, xóa cart sau khi checkout', async () => {
      mockCartService.getOrCreateCart.mockResolvedValue(mockCart);
      mockOrderRepository.create.mockReturnValue({ ...mockOrder });
      mockOrderRepository.save.mockResolvedValue(mockOrder);
      mockOrderItemRepository.create.mockImplementation((dto) => dto);
      mockOrderItemRepository.save.mockResolvedValue([]);
      mockCartService.clearCart.mockResolvedValue(undefined);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockOrderQueue.add.mockResolvedValue({ id: 'job-1' });
      mockOrderRepository.findOne.mockResolvedValue(mockOrder);

      const result = await service.checkout(1);

      expect(mockOrderRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending', total_amount: 250 }),
      );
      expect(mockOrderItemRepository.save).toHaveBeenCalledTimes(1);
      expect(mockCartService.clearCart).toHaveBeenCalledWith(1);
      expect(mockOrderQueue.add).toHaveBeenCalledWith(
        'order.created',
        { orderId: mockOrder.id, email: mockUser.email },
      );
      expect(result).toEqual(mockOrder);
    });
  });

  describe('findAll', () => {
    it('trả về danh sách orders phân trang của user', async () => {
      mockOrderRepository.findAndCount.mockResolvedValue([[mockOrder], 1]);
      const result = await service.findAll(1, 1, 10);
      expect(result.data).toEqual([mockOrder]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(mockOrderRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { user: { id: 1 } } }),
      );
    });
  });

  describe('findOne', () => {
    it('trả về order khi tìm thấy', async () => {
      mockOrderRepository.findOne.mockResolvedValue(mockOrder);
      const result = await service.findOne(1, 1);
      expect(result).toEqual(mockOrder);
    });

    it('throw NotFoundException khi không tìm thấy', async () => {
      mockOrderRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne(1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancel', () => {
    it('hủy order thành công khi status là pending', async () => {
      const pendingOrder = { ...mockOrder, status: 'pending' };
      mockOrderRepository.findOne.mockResolvedValue(pendingOrder);
      mockOrderRepository.save.mockResolvedValue({ ...pendingOrder, status: 'cancelled' });

      const result = await service.cancel(1, 1);

      expect(result.status).toBe('cancelled');
      expect(mockOrderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'cancelled' }),
      );
    });

    it('throw BadRequestException khi order không phải pending', async () => {
      mockOrderRepository.findOne.mockResolvedValue({ ...mockOrder, status: 'confirmed' });
      await expect(service.cancel(1, 1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAllAdmin', () => {
    it('trả về tất cả orders phân trang', async () => {
      mockOrderRepository.findAndCount.mockResolvedValue([[mockOrder], 1]);
      const result = await service.findAllAdmin(1, 10);
      expect(result.data).toEqual([mockOrder]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(mockOrderRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ relations: ['items', 'user'] }),
      );
    });
  });

  describe('updateStatus', () => {
    it('cập nhật status thành công', async () => {
      mockOrderRepository.findOne.mockResolvedValue(mockOrder);
      mockOrderRepository.save.mockResolvedValue({ ...mockOrder, status: 'confirmed' });

      const result = await service.updateStatus(1, { status: 'confirmed' });

      expect(result.status).toBe('confirmed');
    });

    it('throw NotFoundException khi order không tồn tại', async () => {
      mockOrderRepository.findOne.mockResolvedValue(null);
      await expect(service.updateStatus(999, { status: 'confirmed' })).rejects.toThrow(NotFoundException);
    });
  });
});
