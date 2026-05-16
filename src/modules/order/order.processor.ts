import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailService } from 'src/modules/mail/mail.service';

export interface OrderCreatedPayload {
  orderId: number;
  email: string;
}

@Processor('order')
export class OrderProcessor extends WorkerHost {
  private readonly logger = new Logger(OrderProcessor.name);

  constructor(private readonly mailService: MailService) {
    super();
  }

  async process(job: Job<OrderCreatedPayload>): Promise<void> {
    const { orderId, email } = job.data;
    this.logger.log(`[Job ${job.id}] Xử lý email xác nhận đơn #${orderId}`);
    await this.mailService.sendOrderConfirmation(email, orderId);
  }
}
