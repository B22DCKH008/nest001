import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

export interface OrderCreatedPayload {
  orderId: number;
  email: string;
}

@Processor('order')
export class OrderProcessor extends WorkerHost {
  private readonly logger = new Logger(OrderProcessor.name);

  async process(job: Job<OrderCreatedPayload>): Promise<void> {
    const { orderId, email } = job.data;
    this.logger.log(
      `[Job ${job.id}] Email xác nhận gửi đến ${email} (orderId: ${orderId})`,
    );
  }
}
