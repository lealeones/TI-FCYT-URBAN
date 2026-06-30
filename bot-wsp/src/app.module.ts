import { Module } from '@nestjs/common';
import { WhatsappModule } from './whatsapp/whatsapp.module.js';
import { UserModule } from './user/user.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RfidModule } from './rfid/rfid.module';
import { AttendanceModule } from './attendance/attendance.module';
import { SessionsModule } from './sessions/sessions.module';
import { IaModule } from './ia/ia.module';
import { CustomIdModule } from './custom-id/custom-id.module';
import { OdooModule } from './odoo/odoo.module';
import { AuthModule } from './auth/auth.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { InvoicesModule } from './invoices/invoices.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { BackupModule } from './backup/backup.module';
import { SchedulingModule } from './scheduling/scheduling.module';
import { SystemConfigModule } from './common/system-config.module';


@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60, // Tiempo en segundos
          limit: 5, // Máximo 5 requests por IP
        },
      ],
    }),
    PrismaModule,
    WhatsappModule,
    UserModule,
    RfidModule,
    AttendanceModule,
    SessionsModule,
    IaModule,
    CustomIdModule,
    OdooModule,
    AuthModule,
    InvoicesModule,
    DashboardModule,
    SubscriptionsModule,
    BackupModule,
    SchedulingModule,
    SystemConfigModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ]
})
export class AppModule { }
