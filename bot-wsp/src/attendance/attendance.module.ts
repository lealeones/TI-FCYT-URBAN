import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  controllers: [AttendanceController],
  providers: [AttendanceService],
  imports: [PrismaModule, InvoicesModule],
  exports: [AttendanceService],
})
export class AttendanceModule {}
