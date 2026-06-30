import { forwardRef, Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { OdooModule } from '../odoo/odoo.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => OdooModule),
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule { }
