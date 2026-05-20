import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface OrderConfirmationItem {
  product_name: string;
  product_price: number;
  quantity: number;
  subtotal: number;
}

export interface OrderConfirmationMail {
  orderId: number;
  total_amount: number;
  items: OrderConfirmationItem[];
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const user = config.get<string>('MAIL_USER', '');
    const pass = config.get<string>('MAIL_PASS', '');

    if (user && pass) {
      const port = config.get<number>('MAIL_PORT', 587);
      this.transporter = createTransport({
        host: config.get<string>('MAIL_HOST', 'smtp.gmail.com'),
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    }
  }

  private formatCurrency(value: number): string {
    return `${Number(value).toLocaleString('vi-VN')} VND`;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private buildOrderHtml(order: OrderConfirmationMail): string {
    const rows = order.items
      .map((item) => `
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #eee">${this.escapeHtml(item.product_name)}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:right">${this.formatCurrency(item.product_price)}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:right">${this.formatCurrency(item.subtotal)}</td>
        </tr>
      `)
      .join('');

    return `
      <div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.5">
        <h2 style="margin:0 0 12px;color:#2563eb">Xac nhan don hang #${order.orderId}</h2>
        <p>Cam on ban da dat hang tai ShopApp. Don hang cua ban da duoc tiep nhan va dang cho xac nhan.</p>
        <table style="width:100%;border-collapse:collapse;margin:18px 0">
          <thead>
            <tr style="background:#f9fafb">
              <th style="padding:10px 8px;text-align:left">San pham</th>
              <th style="padding:10px 8px;text-align:center">SL</th>
              <th style="padding:10px 8px;text-align:right">Don gia</th>
              <th style="padding:10px 8px;text-align:right">Thanh tien</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="font-size:16px;font-weight:700;text-align:right">Tong cong: ${this.formatCurrency(order.total_amount)}</p>
        <p>Chung toi se xu ly va giao hang som nhat co the.</p>
        <p style="color:#6b7280;font-size:12px;margin-top:24px">ShopApp - vui long khong reply email nay.</p>
      </div>
    `;
  }

  private buildOrderText(order: OrderConfirmationMail): string {
    const items = order.items
      .map((item) => `- ${item.product_name} x ${item.quantity}: ${this.formatCurrency(item.subtotal)}`)
      .join('\n');

    return [
      `Xac nhan don hang #${order.orderId}`,
      '',
      'Cam on ban da dat hang tai ShopApp.',
      items,
      '',
      `Tong cong: ${this.formatCurrency(order.total_amount)}`,
    ].join('\n');
  }

  async sendOrderConfirmation(email: string, order: OrderConfirmationMail): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[MAIL] Order #${order.orderId} confirmation -> ${email} (SMTP not configured)`);
      return;
    }

    await this.transporter.sendMail({
      from: this.config.get<string>('MAIL_FROM', 'noreply@shopapp.com'),
      to: email,
      subject: `Xac nhan don hang #${order.orderId} - ShopApp`,
      text: this.buildOrderText(order),
      html: this.buildOrderHtml(order),
    });

    this.logger.log(`[MAIL] Sent order #${order.orderId} confirmation -> ${email}`);
  }
}
