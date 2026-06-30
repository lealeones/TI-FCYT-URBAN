import { forwardRef, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '~/prisma/prisma.service';
import { AuthUser } from './types';
import { InvoicesService } from '~/invoices/invoices.service';
import dayjs from 'dayjs';
import { UserService } from '~/user/user.service';
import { UpsertUserDto } from '~/user/user.dto';
import { AuthService } from '~/auth/auth.service';

@Injectable()
export class SystemConfigService implements OnModuleInit {
    private readonly logger = new Logger(SystemConfigService.name);
    private config: {
        sessionCleanupIntervalMinutes: number;
        invoiceGenerationDayOfMonth: number;
        tokenExpirationMinutes: number;
        tokenCleanupIntervalMinutes: number;
        profilePictureUpdateIntervalDays: number;
    } | null = null;

    private firstUrl: string | null = null;

    constructor(
        private readonly prisma: PrismaService,
        @Inject(forwardRef(() => InvoicesService))
        private readonly invoicesService: InvoicesService,
        private readonly userService: UserService,
        @Inject(forwardRef(() => AuthService))
        private readonly authService: AuthService,

    ) { }

    async onModuleInit() {
        await this.loadConfig();
    }

    /**
     * Carga la configuración desde la base de datos.
     * Si no existe, crea una configuración por defecto.
     */
    private async loadConfig() {
        try {
            let config = await this.prisma.systemConfig.findFirst();

            if (!config) {
                //NOTE cREO EL PRIMER USUARIO DEL SISTEMA

                const dataUser: UpsertUserDto = {
                    name: 'ADMIN',
                    role: 'ADMIN',
                    customId: ''
                }

                const user = await this.userService.upsert(dataUser)

                const token = await this.authService.generarToken(user.id, undefined, 1440); // Token válido por 24 horas

                this.logger.log(`Primer usuario ADMIN creado. token para iniciar sesión: ${token}`);

                this.firstUrl = `${process.env.URL_FRONT}?t=${token}`;

                this.logger.log('No se encontró configuración del sistema, creando valores por defecto...');
                config = await this.prisma.systemConfig.create({
                    data: {
                        sessionCleanupIntervalMinutes: 30,
                        invoiceGenerationDayOfMonth: 1,
                        tokenExpirationMinutes: 30,
                        tokenCleanupIntervalMinutes: 60,
                        profilePictureUpdateIntervalDays: 2,
                    },
                });
            }

            this.config = {
                sessionCleanupIntervalMinutes: config.sessionCleanupIntervalMinutes,
                invoiceGenerationDayOfMonth: config.invoiceGenerationDayOfMonth,
                tokenExpirationMinutes: config.tokenExpirationMinutes,
                tokenCleanupIntervalMinutes: config.tokenCleanupIntervalMinutes,
                profilePictureUpdateIntervalDays: config.profilePictureUpdateIntervalDays,
            };

            this.logger.log('Configuración del sistema cargada exitosamente');
        } catch (err: any) {
            this.logger.error('Error cargando configuración del sistema', err?.stack || err);
            // Valores por defecto en caso de error
            this.config = {
                sessionCleanupIntervalMinutes: 30,
                invoiceGenerationDayOfMonth: 1,
                tokenExpirationMinutes: 30,
                tokenCleanupIntervalMinutes: 60,
                profilePictureUpdateIntervalDays: 2,
            };
        }
    }

    /**
     * Recarga la configuración desde la base de datos
     */
    async reloadConfig() {
        await this.loadConfig();
    }

    /**
     * Obtiene el intervalo de limpieza de sesiones en minutos
     */
    getSessionCleanupInterval(): number {
        return this.config?.sessionCleanupIntervalMinutes ?? 30;
    }

    /**
     * Obtiene el día del mes para generar facturas (1-28)
     */
    getInvoiceGenerationDay(): number {
        return this.config?.invoiceGenerationDayOfMonth ?? 1;
    }

    /**
     * Obtiene el tiempo de expiración de tokens en minutos
     */
    getTokenExpirationMinutes(): number {
        return this.config?.tokenExpirationMinutes ?? 30;
    }

    /**
     * Obtiene el intervalo de limpieza de tokens en minutos
     */
    getTokenCleanupInterval(): number {
        return this.config?.tokenCleanupIntervalMinutes ?? 60;
    }

    /**
     * Obtiene el intervalo de actualización de fotos de perfil en días
     */
    getProfilePictureUpdateInterval(): number {
        return this.config?.profilePictureUpdateIntervalDays ?? 2;
    }

    /**
     * Actualiza la configuración del sistema
     */
    async updateConfig(data: {
        sessionCleanupIntervalMinutes?: number;
        invoiceGenerationDayOfMonth?: number;
        tokenExpirationMinutes?: number;
        tokenCleanupIntervalMinutes?: number;
        profilePictureUpdateIntervalDays?: number;
    }, actionBy?: AuthUser) {
        const actionByInfo = actionBy ? `${actionBy.name || actionBy.id} (${actionBy.role})` : 'Unknown';
        this.logger.log(`Update system config request - data: ${JSON.stringify(data)}, actionBy: ${actionByInfo}`);

        try {
            // Validaciones
            if (data.invoiceGenerationDayOfMonth !== undefined) {
                if (data.invoiceGenerationDayOfMonth < 1 || data.invoiceGenerationDayOfMonth > 28) {
                    this.logger.warn(`Invalid invoiceGenerationDayOfMonth: ${data.invoiceGenerationDayOfMonth}, attemptedBy: ${actionByInfo}`);
                    throw new Error('El día de generación de facturas debe estar entre 1 y 28');
                }
            }

            if (data.sessionCleanupIntervalMinutes !== undefined && data.sessionCleanupIntervalMinutes < 1) {
                this.logger.warn(`Invalid sessionCleanupIntervalMinutes: ${data.sessionCleanupIntervalMinutes}, attemptedBy: ${actionByInfo}`);
                throw new Error('El intervalo de limpieza de sesiones debe ser mayor a 0');
            }

            if (data.tokenExpirationMinutes !== undefined && data.tokenExpirationMinutes < 1) {
                this.logger.warn(`Invalid tokenExpirationMinutes: ${data.tokenExpirationMinutes}, attemptedBy: ${actionByInfo}`);
                throw new Error('El tiempo de expiración de tokens debe ser mayor a 0');
            }

            if (data.tokenCleanupIntervalMinutes !== undefined && data.tokenCleanupIntervalMinutes < 1) {
                this.logger.warn(`Invalid tokenCleanupIntervalMinutes: ${data.tokenCleanupIntervalMinutes}, attemptedBy: ${actionByInfo}`);
                throw new Error('El intervalo de limpieza de tokens debe ser mayor a 0');
            }

            if (data.profilePictureUpdateIntervalDays !== undefined && data.profilePictureUpdateIntervalDays < 1) {
                this.logger.warn(`Invalid profilePictureUpdateIntervalDays: ${data.profilePictureUpdateIntervalDays}, attemptedBy: ${actionByInfo}`);
                throw new Error('El intervalo de actualización de fotos debe ser mayor a 0');
            }

            this.logger.log(`Validations passed, searching for existing config - actionBy: ${actionByInfo}`);

            // Buscar configuración existente
            const existing = await this.prisma.systemConfig.findFirst();

            if (!existing) {
                this.logger.error(`System config not found in database - attemptedBy: ${actionByInfo}`);
                throw new Error('No se encontró configuración del sistema');
            }

            this.logger.log(`Found existing config - id: ${existing.id}, updating with data: ${JSON.stringify(data)}, by: ${actionByInfo}`);
            this.logger.log(`Current values in DB - sessionCleanup: ${existing.sessionCleanupIntervalMinutes}, invoiceDay: ${existing.invoiceGenerationDayOfMonth}, tokenExp: ${existing.tokenExpirationMinutes}, tokenCleanup: ${existing.tokenCleanupIntervalMinutes}`);

            console.log('=== SERVICE BEFORE PRISMA UPDATE ===');
            console.log('Existing ID:', existing.id);
            console.log('Data to update:', JSON.stringify(data, null, 2));
            console.log('Data keys:', Object.keys(data));
            console.log('Data values:', Object.values(data));
            console.log('Data object type:', typeof data);
            console.log('Is data empty?', Object.keys(data).length === 0);

            // Construir el objeto de actualización explícitamente
            const updateData: any = {};
            if (data.sessionCleanupIntervalMinutes !== undefined) {
                updateData.sessionCleanupIntervalMinutes = data.sessionCleanupIntervalMinutes;
                console.log('Adding sessionCleanupIntervalMinutes:', data.sessionCleanupIntervalMinutes);
            }
            if (data.invoiceGenerationDayOfMonth !== undefined) {
                updateData.invoiceGenerationDayOfMonth = data.invoiceGenerationDayOfMonth;
                console.log('Adding invoiceGenerationDayOfMonth:', data.invoiceGenerationDayOfMonth);
            }
            if (data.tokenExpirationMinutes !== undefined) {
                updateData.tokenExpirationMinutes = data.tokenExpirationMinutes;
                console.log('Adding tokenExpirationMinutes:', data.tokenExpirationMinutes);
            }
            if (data.tokenCleanupIntervalMinutes !== undefined) {
                updateData.tokenCleanupIntervalMinutes = data.tokenCleanupIntervalMinutes;
                console.log('Adding tokenCleanupIntervalMinutes:', data.tokenCleanupIntervalMinutes);
            }
            if (data.profilePictureUpdateIntervalDays !== undefined) {
                updateData.profilePictureUpdateIntervalDays = data.profilePictureUpdateIntervalDays;
                console.log('Adding profilePictureUpdateIntervalDays:', data.profilePictureUpdateIntervalDays);
            }

            console.log('Final updateData object:', JSON.stringify(updateData, null, 2));
            console.log('UpdateData keys:', Object.keys(updateData));
            console.log('====================================');

            // Actualizar configuración
            const updated = await this.prisma.systemConfig.update({
                where: { id: existing.id },
                data: updateData,
            });

            console.log('=== SERVICE AFTER PRISMA UPDATE ===');
            console.log('Updated result:', JSON.stringify(updated, null, 2));
            console.log('===================================');

            this.logger.log(`Database updated successfully - configId: ${existing.id}, newValues: ${JSON.stringify(updated)}, by: ${actionByInfo}`);

            // Recargar configuración en memoria
            await this.loadConfig();

            this.logger.log(`Configuration reloaded in memory - by: ${actionByInfo}`);
            this.logger.log(`System config update completed successfully - by: ${actionByInfo}`);

            return updated;
        } catch (err: any) {
            this.logger.error(`Error updating system config by ${actionByInfo}: ${err.message}`, err?.stack || err);
            throw err;
        }
    }

    /**
     * Obtiene toda la configuración
     */
    async getConfig() {
        return this.prisma.systemConfig.findFirst();
    }

    /**
     * Fuerza la generación de facturas para un mes específico
     */
    async forceGenerateMonthlyInvoices(targetMonth: Date, actionBy?: AuthUser) {
        const actionByInfo = actionBy ? `${actionBy.name || actionBy.id} (${actionBy.role})` : 'Unknown';
        const monthStr = dayjs(targetMonth).format('YYYY-MM');

        this.logger.log(`Forzando generación de facturas para ${monthStr} - actionBy: ${actionByInfo}`);

        try {
            const invoices = await this.invoicesService.createMonthlyInvoicesForActiveAssistants(targetMonth);

            this.logger.log(`Facturas generadas exitosamente para ${monthStr} - total: ${invoices.length}, by: ${actionByInfo}`);

            return {
                message: `Facturas generadas exitosamente para ${monthStr}`,
                totalCreated: invoices.length,
                details: invoices.map(inv => ({
                    sessionId: inv.sessionId,
                    userId: inv.userId,
                    invoiceId: inv.id,
                    amount: inv.amount
                }))
            };
        } catch (err: any) {
            this.logger.error(`Error forzando generación de facturas para ${monthStr} by ${actionByInfo}: ${err.message}`, err?.stack || err);
            throw err;
        }
    }

    getFirstUrl(): string | null {
        const url = this.firstUrl;
        this.firstUrl = null; // consumir: solo válido una vez
        return url;
    }
}
