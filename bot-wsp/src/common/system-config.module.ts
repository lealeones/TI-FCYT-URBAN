import { forwardRef, Module } from '@nestjs/common';
import { SystemConfigService } from './system-config.service';
import { SystemConfigController } from './system-config.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { InvoicesModule } from '~/invoices/invoices.module';
import { UserModule } from '~/user/user.module';
import { AuthModule } from '~/auth/auth.module';

@Module({
  controllers: [SystemConfigController],
  providers: [SystemConfigService],
  imports: [
    PrismaModule,
    forwardRef(() => InvoicesModule),
    forwardRef(() => UserModule),
    forwardRef(() => AuthModule),
  ],
  exports: [SystemConfigService],
})
export class SystemConfigModule { }
