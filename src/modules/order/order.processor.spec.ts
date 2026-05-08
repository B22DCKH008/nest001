import { Test } from '@nestjs/testing';
import { Job } from 'bullmq';
import { OrderProcessor, OrderCreatedPayload } from './order.processor';

describe('OrderProcessor', () => {
  let processor: OrderProcessor;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [OrderProcessor],
    }).compile();
    processor = module.get(OrderProcessor);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  it('process() logs email confirmation message', async () => {
    const logSpy = jest.spyOn((processor as any).logger, 'log');
    const job = {
      id: 'j1',
      data: { orderId: 42, email: 'user@example.com' } as OrderCreatedPayload,
    } as Job<OrderCreatedPayload>;

    await processor.process(job);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('user@example.com'),
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('42'),
    );
  });
});
