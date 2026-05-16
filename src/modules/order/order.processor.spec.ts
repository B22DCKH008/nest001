import { Test } from '@nestjs/testing';
import { Job } from 'bullmq';
import { OrderProcessor, OrderCreatedPayload } from './order.processor';
import { MailService } from 'src/modules/mail/mail.service';

const mockMailService = { sendOrderConfirmation: jest.fn() };

describe('OrderProcessor', () => {
  let processor: OrderProcessor;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        OrderProcessor,
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();
    processor = module.get(OrderProcessor);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  it('process() gọi mailService.sendOrderConfirmation với đúng args', async () => {
    mockMailService.sendOrderConfirmation.mockResolvedValue(undefined);
    const job = {
      id: 'j1',
      data: { orderId: 42, email: 'user@example.com' } as OrderCreatedPayload,
    } as Job<OrderCreatedPayload>;

    await processor.process(job);

    expect(mockMailService.sendOrderConfirmation).toHaveBeenCalledWith(
      'user@example.com',
      42,
    );
  });
});
