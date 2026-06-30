import { forwardRef, Module } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CustomIdModule } from '../custom-id/custom-id.module';
import { InvoicesModule } from '~/invoices/invoices.module';

@Module({
  controllers: [SessionsController],
  providers: [SessionsService],
  imports: [PrismaModule, CustomIdModule, forwardRef(() => InvoicesModule)],
  exports: [SessionsService],

})
export class SessionsModule { }
