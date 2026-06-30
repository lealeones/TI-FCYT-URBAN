import { Controller, Get, NotFoundException, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { Inject, forwardRef } from '@nestjs/common';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject(forwardRef(() => WhatsappService))
    private readonly whatsappService: WhatsappService,
  ) { }

  @Get('verify')
  verificar(@Query('t') token: string) {
    return this.authService.verificarToken(token);
  }

  @Get('getToken')
  async getToken() {
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException();
    }
    return await this.authService.getTokenDev();
  }

  @Get('init')
  async redirectDynamic(@Res() res: Response) {
    const whatsappStatus = await this.whatsappService.status().catch(() => null);
    return await this.authService.init(res, whatsappStatus?.status ?? null);
  }
}

//650030