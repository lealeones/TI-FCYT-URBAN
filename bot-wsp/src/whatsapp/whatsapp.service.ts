// src/whatsapp/whatsapp.service.ts
import {
  addKeyword,
  createBot,
  createFlow,
  EVENTS,
  MemoryDB
} from '@builderbot/bot';
import {
  TFlow
} from '@builderbot/bot/dist/types.js';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { AuthService } from '../auth/auth.service.js';
import { IaSubscriptionService } from '../ia/services/ia.subscription.service.js';
import { InvoicesService } from '../invoices/invoices.service.js';
import { SessionsService } from '../sessions/sessions.service.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
import { UserService } from '../user/user.service.js';
import { getAdminFlows } from './flows/admin/adminFlows.js';
import { getProfessorFlows } from './flows/professor/professorFlows.js';
import { getUserFlows } from './flows/user/userFlows.js';
import { AnyProvider, createAdapterProvider } from './provider.factory.js';

@Injectable()
export class WhatsappService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappService.name);
  //@ts-ignore
  private provider: AnyProvider;
  private stateHandler: any;
  private readonly startTime: number = Date.now();

  constructor(
    private userService: UserService,
    private sessionService: SessionsService,
    private readonly authService: AuthService,
    private readonly invoicesService: InvoicesService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {
  }

  /** OnModuleInit: arranca el bot con tu flujo y lo expone como singleton */
  async onModuleInit(): Promise<void> {
    this.logger.log('Inicializando WhatsApp bot…');
    try {
      const { flows: adminFlows, references } = getAdminFlows({
        userService: this.userService,
        sessionService: this.sessionService,
        iaService: undefined,
        iaSubscription: {} as IaSubscriptionService,
        authService: this.authService,
      });

      const { references: referencesUser, flows: userFlows } = getUserFlows({
        authService: this.authService,
        userService: this.userService,
        invoicesService: this.invoicesService,
        sessionService: this.sessionService,
        subscriptionsService: this.subscriptionsService,
      })
      const { references: referencesProfessor, flows: professorFlows } = getProfessorFlows({
        authService: this.authService,
        userService: this.userService,
      })



      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const welcomeFlow: TFlow<any, MemoryDB> = addKeyword<any, MemoryDB>(EVENTS.WELCOME)
        .addAction(async (ctx, { flowDynamic, gotoFlow, state, fallBack, endFlow }) => {
          await flowDynamic('🙌 ¡Hola! Bienvenido al bot.');
          const userFound = await this.userService.findByPhone(ctx.from);
          if (!userFound) { return endFlow('❌ Todavia no estás registrado. Por favor, contacta al administrador.') }

          // Actualizar foto de perfil si es necesario
          try {
            const profilePicBase64 = await this.getProfilePictureBase64(ctx.from);
            if (profilePicBase64) {
              await this.userService.updateProfilePictureIfNeeded(userFound.id, profilePicBase64);
              this.logger.debug(`Foto de perfil procesada para usuario ${userFound.id}`);
            }
          } catch (error) {
            this.logger.warn(`No se pudo actualizar foto de perfil para ${ctx.from}:`, error);
            // No fallar el flujo si falla la foto
          }

          const role = userFound.role;

          const menuByRole: Record<UserRole, any> = {
            [UserRole.ADMIN]: references.adminMenu,
            [UserRole.USER]: referencesUser.userMenu,
            [UserRole.INSTRUCTOR]: referencesProfessor.professorMenu,
            [UserRole.GUEST]: undefined
          }

          //NOTE Detecto si es un usuario admin
          const userAdmin = await this.userService.getUserAdmin();
          const { phone } = userAdmin || {};

          const menu = menuByRole[role];

          if (!!phone && ctx.from.includes(phone)) {
            return gotoFlow(references.adminMenu);
          }

          return gotoFlow(menu);
        })

      // 1) Creamos el flows de usuarios
      const adapterFlow = createFlow([
        welcomeFlow,
        ...adminFlows,
        ...userFlows,
        ...professorFlows,
      ]);

      // 2) Creamos el provider según la variable de entorno PROVIDER
      const adapterProvider = await this.createAdapterProvider();

      // 3) Base de datos en memoria
      const adapterDB = new MemoryDB();

      // 4) Creamos el bot y levantamos su servidor HTTP
      const { httpServer, handleCtx, globalStateHandler, provider } = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
      });

      this.stateHandler = provider
      this.logger.log('Bot creado exitosamente');

      // Log del estado del provider para debugging
      this.logger.log('Estado del provider después de crear bot:', {
        hasProvider: !!provider,
        hasVendor: !!provider?.vendor,
        vendorKeys: provider?.vendor ? Object.keys(provider.vendor) : [],
      });

      // Escuchar eventos del adapterProvider (no del provider retornado)
      if (adapterProvider?.on) {
        this.logger.log('✅ Configurando listeners de eventos de Baileys...');

        adapterProvider.on('ready', () => {
          this.logger.log('✅ WhatsApp conectado exitosamente!');
        });

        adapterProvider.on('auth_failure', (error: any) => {
          this.logger.error('❌ Error de autenticación de WhatsApp:', error);
        });

        adapterProvider.on('message', async (msg) => {
          this.logger.debug('📨 Mensaje recibido de:', JSON.stringify(msg, null, 2));

          // Intentar obtener foto de perfil
          try {
            const jid = msg.key.remoteJid;
            if (jid && this.stateHandler?.vendor) {
              const profilePicUrl = await this.stateHandler.vendor.profilePictureUrl(jid, 'image');
              this.logger.debug('📸 URL de foto de perfil:', profilePicUrl);
            }
          } catch (error) {
            this.logger.debug('⚠️ No se pudo obtener foto de perfil:', error);
          }
        });
      } else {
        this.logger.warn('⚠️  El adapterProvider no tiene método "on" para escuchar eventos');
      }

      httpServer(+(process.env.PORT_WSP ?? 3008));
      this.logger.log('WhatsApp bot listo en puerto ' + (process.env.PORT_WSP ?? 3008));

      // 5) Guardamos el provider para uso futuro
      this.provider = adapterProvider;

    } catch (err) {
      this.logger.error('Error al inicializar WhatsApp bot', err);
    }
  }

  // ─── Provider factory ────────────────────────────────────────────────────────
  private async createAdapterProvider(): Promise<AnyProvider> {
    return createAdapterProvider(this.logger);
  }

  async status(): Promise<WhatsappStatus> {
    try {
      this.logger.debug('📊 Consultando estado de WhatsApp...');
      const qrDataUrl = await this.getQrDataUrl();

      const state = this.stateHandler?.vendor?.user;

      this.logger.debug('Estado del stateHandler:', {
        hasStateHandler: !!this.stateHandler,
        hasVendor: !!this.stateHandler?.vendor,
        hasUser: !!state,
        userId: state?.id,
      });

      const numberPhone = state?.id.split('@')[0].split(':')[0];

      const phone = numberPhone || null;
      const uptime = Math.floor((Date.now() - this.startTime) / 1000);

      const status: WhatsappStatus = {
        status: phone ? 'Correcto' : 'Sin session',
        phone: phone ?? 'No disponible',
        qr: qrDataUrl,
        uptime,
        environment: process.env.NODE_ENV || 'development',
        frontUrl: process.env.FRONT_URL || 'http://localhost:3000',
        apiVersion: '1.0.0',
        timestamp: new Date().toISOString(),
      };

      this.logger.debug(`Estado: ${status.status}, Phone: ${status.phone}, Has QR: ${!!qrDataUrl}`);
      return status;
    } catch (error: any) {
      this.logger.error('Error al obtener el estado de WhatsApp', error);
      throw new Error('No se pudo obtener el estado de WhatsApp');
    }
  }

  /** Devuelve `data:image/png;base64,...` o `null` si no existe */
  async getQrDataUrl(): Promise<string | null> {
    // ⚠️ Evitá __dirname confuso al compilar. process.cwd() apunta al root del proyecto.
    const possiblePaths = [
      join(process.cwd(), 'bot.qr.png'),
      join(process.cwd(), 'bot_sessions', 'bot.qr.png'),
      join(process.cwd(), '.baileys', 'bot.qr.png'),
      join('/tmp', 'bot.qr.png'),
    ];

    for (const qrPath of possiblePaths) {
      try {
        this.logger.debug(`🔍 Buscando QR en: ${qrPath}`);
        const buf = await readFile(qrPath);        // <Buffer ...>
        const base64 = buf.toString('base64');     // "iVBORw0KGgoAAA..."
        this.logger.log(`✅ QR encontrado en: ${qrPath}`);
        return `data:image/png;base64,${base64}`;
      } catch (e: any) {
        if (e?.code !== 'ENOENT') {
          this.logger.warn(`⚠️  Error leyendo ${qrPath}:`, e?.message);
        }
        // Si es ENOENT, simplemente continuar con la siguiente ruta
      }
    }
    // no hay QR generado aún
    this.logger.debug('❌ No se encontró bot.qr.png en ninguna ubicación');
    this.logger.debug('💡 BuilderBot puede estar mostrando el QR en http://localhost:3008/');
    return null;
  }


  /** Envia un texto */
  async sendText(to: string, text: string) {
    if (!this.provider) throw new Error('Bot no inicializado aún');
    const number = to.includes('549') ? to : `549${to}`;
    // Quitá todo lo que no sea dígito
    const onlyDigits = number.replace(/\D/g, '');
    // Si no viene con @c.us, lo agregas
    const jid = number.includes('@') ? number : `${onlyDigits}@c.us`;
    this.logger.log(`Enviando mensaje a ${jid}: ${text}`);
    return this.provider.sendText(jid, text);
  }

  /**
   * Obtiene la URL de la foto de perfil de un usuario
   * @param phone - Número de teléfono (puede incluir o no 549)
   * @param quality - 'image' para alta calidad, 'preview' para baja calidad
   * @returns URL de la foto o null si no existe
   */
  async getProfilePicture(phone: string, quality: 'image' | 'preview' = 'image'): Promise<string | null> {
    try {
      if (!this.stateHandler?.vendor) {
        throw new Error('WhatsApp no está conectado');
      }

      // Normalizar el número de teléfono
      const number = phone.includes('549') ? phone : `549${phone}`;
      const onlyDigits = number.replace(/\D/g, '');
      const jid = number.includes('@') ? number : `${onlyDigits}@s.whatsapp.net`;

      this.logger.log(`Obteniendo foto de perfil de ${jid}`);

      // Obtener la URL de la foto de perfil
      const profilePicUrl = await this.stateHandler.vendor.profilePictureUrl(jid, quality);

      this.logger.log(`Foto de perfil obtenida: ${profilePicUrl}`);
      return profilePicUrl;
    } catch (error: any) {
      this.logger.warn(`No se pudo obtener foto de perfil para ${phone}:`, error.message);
      return null;
    }
  }

  /**
   * Descarga la foto de perfil y la retorna como base64
   * @param phone - Número de teléfono
   * @returns Data URL (data:image/jpeg;base64,...) o null
   */
  async getProfilePictureBase64(phone: string): Promise<string | null> {
    try {
      const url = await this.getProfilePicture(phone, 'image');
      if (!url) return null;

      // Descargar la imagen
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');

      return `data:image/jpeg;base64,${base64}`;
    } catch (error: any) {
      this.logger.error(`Error descargando foto de perfil para ${phone}:`, error.message);
      return null;
    }
  }
}


export type WhatsappStatus = {
  status: 'Correcto' | 'Sin session';
  phone: string;
  qr: string | null; // Data URL o null
  uptime: number; // segundos desde que inició
  environment: string; // production, development, etc
  frontUrl: string; // URL del frontend
  apiVersion: string; // versión del API
  timestamp: string; // ISO timestamp
};