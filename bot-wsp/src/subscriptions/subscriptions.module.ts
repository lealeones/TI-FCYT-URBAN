import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SessionsModule } from '../sessions/sessions.module';
import { UserModule } from '../user/user.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  imports: [
    SessionsModule,
    UserModule,
    PrismaModule
  ],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule { }
