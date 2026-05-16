import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const user = config.get<string>('MAIL_USER', '');
    const pass = config.get<string>('MAIL_PASS', '');
    if (user && pass) {
      this.transporter = createTransport({
        host: config.get<string>('MAIL_HOST', 'smtp.gmail.com'),
        port: config.get<number>('MAIL_PORT', 587),
        secure: false,
        auth: { user, pass },
      });
    }
  }

  async sendOrderConfirmation(email: string, orderId: number): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[MAIL] Order #${orderId} confirmation → ${email} (SMTP chưa cấu hình)`);
      return;
    }
    await this.transporter.sendMail({
      from: this.config.get<string>('MAIL_FROM', 'noreply@shopapp.com'),
      to: email,
      subject: `Xác nhận đơn hàng #${orderId} — ShopApp`,
      html: `
        <h2>Cảm ơn bạn đã đặt hàng!</h2>
        <p>Đơn hàng <strong>#${orderId}</strong> của bạn đã được tiếp nhận.</p>
        <p>Chúng tôi sẽ xử lý và giao hàng sớm nhất có thể.</p>
        <br><p style="color:#888;font-size:12px">ShopApp — đừng reply email này</p>
      `,
    });
    this.logger.log(`[MAIL] Đã gửi email xác nhận đơn #${orderId} → ${email}`);
  }
}
