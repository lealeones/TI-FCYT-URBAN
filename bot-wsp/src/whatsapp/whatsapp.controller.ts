import { Controller, Get, Param, Query, Sse, UseGuards, MessageEvent as NestMessageEvent } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WhatsappService, WhatsappStatus } from './whatsapp.service.js';
import { AuthTokenGuard } from '../common/guards/auth-token.guard.js';
import { AuthUser } from '../common/types.js';
import { User } from '../common/decoratos/user.decorator.js';
import { distinctUntilChanged, from, interval, map, Observable, share, switchMap } from 'rxjs';

@ApiTags('WhatsApp')
@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) { }

  @Get('status')
  @ApiOperation({ 
    summary: 'Obtener estado del sistema WhatsApp',
    description: 'Retorna el estado de conexión de WhatsApp, información del sistema, URL del frontend y otros datos relevantes'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Estado del sistema obtenido correctamente',
    schema: {
      example: {
        status: 'Correcto',
        phone: '5491112345678',
        qr: 'data:image/png;base64,iVBORw0KGgo...',
        uptime: 3600,
        environment: 'production',
        frontUrl: 'https://app.example.com',
        apiVersion: '1.0.0',
        timestamp: '2025-12-10T21:30:00.000Z'
      }
    }
  })
  async getStatus(): Promise<WhatsappStatus> {
    return await this.whatsappService.status();
  }

  @Get('send/:number/:message')
  async sendMessage(
    @Param('number') number: string,
    @Param('message') message: string
  ): Promise<any> {
    return await this.whatsappService.sendText(number, message);
  }

  @UseGuards(AuthTokenGuard)
  @Get('profile-picture/:phone')
  async getProfilePicture(
    @Param('phone') phone: string,
    @Query('format') format?: 'url' | 'base64',
    @User() user?: AuthUser,
  ): Promise<{ url: string | null } | { base64: string | null }> {
    const allowed = user?.role === 'ADMIN' || user?.role === 'INSTRUCTOR';
    if (!allowed) {
      throw new Error('No tienes permisos para obtener fotos de perfil');
    }

    if (format === 'base64') {
      const base64 = await this.whatsappService.getProfilePictureBase64(phone);
      return { base64 };
    }

    const url = await this.whatsappService.getProfilePicture(phone);
    return { url };
  }

  // @UseGuards(AuthTokenGuard)
  @Sse('events')
  events(): Observable<NestMessageEvent> {
    return interval(2000).pipe(
      switchMap(() => from(this.whatsappService.status())), // Promise -> Observable<WhatsappStatus>
      distinctUntilChanged(
        (a, b) => a.status === b.status && a.phone === b.phone && a.qr === b.qr
      ),
      map((payload: WhatsappStatus): NestMessageEvent => ({ data: payload })), // 👈 devolvé el tipo de Nest
      share(),
    );
  }

}
