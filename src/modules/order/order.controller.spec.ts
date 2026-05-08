import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';

const mockOrder = {
  id: 1,
  user: { id: 1 },
  status: 'pending',
  total_amount: 250,
  items: [],
  created_at: new Date(),
  updated_at: new Date(),
};

const mockOrderService = {
  checkout: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  cancel: jest.fn(),
  findAllAdmin: jest.fn(),
  updateStatus: jest.fn(),
};

const mockRequest = { user: { id: 1, role: 'admin' } };

describe('OrderController', () => {
  let controller: OrderController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [{ provide: OrderService, useValue: mockOrderService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OrderController>(OrderController);
    jest.clearAllMocks();
  });

  describe('checkout', () => {
    it('tạo order và trả về kết quả', async () => {
      mockOrderService.checkout.mockResolvedValue(mockOrder);
      const result = await controller.checkout(mockRequest);
      expect(mockOrderService.checkout).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockOrder);
    });
  });

  describe('findAll', () => {
    it('trả về danh sách orders phân trang của user', async () => {
      const paginated = { data: [mockOrder], total: 1, page: 1, limit: 10, totalPages: 1 };
      mockOrderService.findAll.mockResolvedValue(paginated);
      const result = await controller.findAll(mockRequest, { page: 1, limit: 10 });
      expect(mockOrderService.findAll).toHaveBeenCalledWith(1, 1, 10);
      expect(result).toEqual(paginated);
    });
  });

  describe('findOne', () => {
    it('trả về chi tiết order', async () => {
      mockOrderService.findOne.mockResolvedValue(mockOrder);
      const result = await controller.findOne(mockRequest, 1);
      expect(mockOrderService.findOne).toHaveBeenCalledWith(1, 1);
      expect(result).toEqual(mockOrder);
    });
  });

  describe('cancel', () => {
    it('huỷ order và trả về order đã huỷ', async () => {
      const cancelled = { ...mockOrder, status: 'cancelled' };
      mockOrderService.cancel.mockResolvedValue(cancelled);
      const result = await controller.cancel(mockRequest, 1);
      expect(mockOrderService.cancel).toHaveBeenCalledWith(1, 1);
      expect(result).toEqual(cancelled);
    });
  });

  describe('findAllAdmin', () => {
    it('trả về tất cả orders', async () => {
      mockOrderService.findAllAdmin.mockResolvedValue([mockOrder]);
      const result = await controller.findAllAdmin();
      expect(mockOrderService.findAllAdmin).toHaveBeenCalledTimes(1);
      expect(result).toEqual([mockOrder]);
    });
  });

  describe('updateStatus', () => {
    it('cập nhật status và trả về order', async () => {
      const updated = { ...mockOrder, status: 'confirmed' };
      mockOrderService.updateStatus.mockResolvedValue(updated);
      const result = await controller.updateStatus(1, { status: 'confirmed' });
      expect(mockOrderService.updateStatus).toHaveBeenCalledWith(1, { status: 'confirmed' });
      expect(result).toEqual(updated);
    });
  });
});
