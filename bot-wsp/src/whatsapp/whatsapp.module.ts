import { forwardRef, Module } from '@nestjs/common';
import { InvoicesModule } from '../invoices/invoices.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { IaModule } from '../ia/ia.module.js';
import { OdooModule } from '../odoo/odoo.module.js';
import { SessionsModule } from '../sessions/sessions.module.js';
import { UserModule } from '../user/user.module.js';
import { QueueService } from './queue.service.js';
import { WhatsappController } from './whatsapp.controller.js';
import { WhatsappService } from './whatsapp.service.js';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module.js';


@Module({
  controllers: [WhatsappController],
  providers: [WhatsappService, QueueService],
  exports: [WhatsappService],
  imports: [UserModule, SessionsModule, OdooModule, forwardRef(() => AuthModule), InvoicesModule, SubscriptionsModule],
})
export class WhatsappModule { }
