import { forwardRef, Module } from '@nestjs/common';
import { OdooService } from './odoo.service';
import { OdooController } from './odoo.controller';
import { HttpModule } from '@nestjs/axios';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  controllers: [OdooController],
  providers: [OdooService],
  imports: [HttpModule,
    forwardRef(() => InvoicesModule),
  ],
  exports: [OdooService],
})
export class OdooModule { }
