import { Body, Controller, Post, Res } from '@nestjs/common';
import { OdooWebhook } from './entities/odoo.entity';
import { OdooService } from './odoo.service';
import { Response } from 'express';

@Controller('odoo')
export class OdooController {
  constructor(private readonly odooService: OdooService) { }

  @Post('/webhook')
  async webhook(
    @Body() data: OdooWebhook,
    @Res() res: Response
  ) {
    await this.odooService.webhook(data);
    return res.status(200).send('OK');
  }

}
