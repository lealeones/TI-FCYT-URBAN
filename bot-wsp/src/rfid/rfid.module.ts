import { Module } from '@nestjs/common';
import { InvoicesModule } from '../invoices/invoices.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { UserModule } from '../user/user.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { RfidController } from './rfid.controller';
import { RfidService } from './rfid.service';
import { AuthModule } from '~/auth/auth.module';

@Module({
  controllers: [RfidController],
  providers: [RfidService],
  imports: [UserModule,AttendanceModule,WhatsappModule,AttendanceModule,InvoicesModule,AuthModule]
})
export class RfidModule { }
