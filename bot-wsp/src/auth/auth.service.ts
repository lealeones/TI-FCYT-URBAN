import { forwardRef, Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { User } from '@prisma/client';
import { customAlphabet } from 'nanoid';
import { PrismaService } from '../prisma/prisma.service';
import { SystemConfigService } from '../common/system-config.service';
import { Response } from 'express';

export enum TokenRedirectURL {
  FRONT = 'FRONT',
  SESSION = 'SESSION',
  USER = 'USER',
  WHATSAPP = 'WHATSAPP',
  CONFIG = 'CONFIG',
}

const RedirectToUrlParams = {
  [TokenRedirectURL.FRONT]: '/',
  [TokenRedirectURL.SESSION]: 'clases',
  [TokenRedirectURL.USER]: 'usuarios',
  [TokenRedirectURL.WHATSAPP]: 'whatsapp',
  [TokenRedirectURL.CONFIG]: 'configuracion/sistema',
};

@Injectable()
export class AuthService {
  private readonly nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 10);

  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => SystemConfigService))
    private systemConfig: SystemConfigService
  ) { }

  async getTokenDev() {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          role: 'ADMIN',
          phone: { not: null }
        }
      });
      return await this.generarToken(user?.id, TokenRedirectURL.SESSION);
    }
    catch (error: any) {

    }
  }
  getLoginLink(user: User): Promise<string> {
    return this.generarToken(user.id).then(token => `${process.env.URL_FRONT}?t=${token}`);
  }

  //NOTE duration opcional para el primer arranque , MINUTOS
  async generarToken(userId?: string, redirectUrl?: TokenRedirectURL, duration?: number): Promise<string> {
    try {


      const now = Date.now();

      // Buscar token activo existente
      const existing = userId ? await this.prisma.token.findFirst({
        where: {
          userId,
          expiresAt: { gt: new Date(now) },
          isActive: { equals: true }
        },
      })
        : false

      if (existing) {
        return existing.token;
      }

      // Si no hay uno válido, crear uno nuevo
      const token = this.nanoid();
      const expirationMinutes = this.systemConfig.getTokenExpirationMinutes();
      const expiresAt = new Date(now + (duration ?? expirationMinutes) * 60 * 1000);

      await this.prisma.token.create({
        data: {
          token,
          userId,
          expiresAt,
          ...(redirectUrl
            ? { redirectUrl: RedirectToUrlParams[redirectUrl] }
            : { redirectUrl: RedirectToUrlParams[TokenRedirectURL.FRONT] })
        },
      });

      return token;
    }
    catch (error: any) {
      this.logger.error('Error generating token', error);
      throw new InternalServerErrorException('Error generating token');
    }
  }


  async verificarToken(token: string): Promise<{ autorizado: boolean; user?: User, redirectUrl?: string }> {
    try {
      const found = await this.prisma.token.findUnique({
        where: { token, isActive: { equals: true } },
        include: { user: true },
      });

      if (!found) return { autorizado: false };

      const expired = new Date() > found.expiresAt;
      if (expired) return { autorizado: false };

      await this.prisma.token.update({ where: { id: found.id }, data: { isActive: false } });
      return { autorizado: true, user: found?.user || undefined, redirectUrl: found.redirectUrl! };
    } catch {
      return { autorizado: false };
    }
  }

  async init(res: Response, whatsappStatus?: 'Correcto' | 'Sin session' | null) {
    try {
      // Caso 1: primera vez que arranca el sistema (admin creado, token listo)
      const firstUrl = this.systemConfig.getFirstUrl();
      if (firstUrl) {
        return res.redirect(302, firstUrl);
      }

      // Caso 2: WhatsApp sin sesión → redirigir al front en la sección de WhatsApp
      if (whatsappStatus === 'Sin session') {
        const admin = await this.prisma.user.findFirst({ where: { role: 'ADMIN' } });
        const token = await this.generarToken(admin?.id, TokenRedirectURL.WHATSAPP);
        return res.redirect(302, `${process.env.URL_FRONT}?t=${token}`);
      }


      // Caso 3: sistema normal no dar acceso
      return res.sendStatus(403);
    } catch (error: any) {
      this.logger.error('Error in init', error);
      return res.sendStatus(500);
    }
  }
}
