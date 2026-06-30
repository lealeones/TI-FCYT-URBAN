import { forwardRef, Module } from '@nestjs/common';
import { SchedulingService } from './scheduling.service';
import { SchedulingController } from './scheduling.controller';
import { SessionsModule } from '~/sessions/sessions.module';
import { ScheduleModule } from '@nestjs/schedule';
import { InvoicesModule } from '~/invoices/invoices.module';
import { SystemConfigService } from '~/common/system-config.service';
import { PrismaModule } from '~/prisma/prisma.module';
import { UserModule } from '~/user/user.module';
import { AuthModule } from '~/auth/auth.module';

@Module({
  controllers: [SchedulingController],
  providers: [SchedulingService, SystemConfigService],
  imports: [
  ScheduleModule.forRoot(),
  SessionsModule,
  InvoicesModule,
  PrismaModule,
  forwardRef(() => UserModule),
  forwardRef(() => AuthModule),
]
})
export class SchedulingModule { }
