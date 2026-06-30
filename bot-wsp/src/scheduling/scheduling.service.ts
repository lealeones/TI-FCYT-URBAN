import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InvoicesService } from '~/invoices/invoices.service';
import { PrismaService } from '~/prisma/prisma.service';
import { SessionsService } from '~/sessions/sessions.service';
import { SystemConfigService } from '~/common/system-config.service';

@Injectable()
export class SchedulingService {
    private readonly logger = new Logger(SchedulingService.name);
    private lastSessionCleanup: number = 0;
    private lastTokenCleanup: number = 0;

    constructor(
        private readonly sessions: SessionsService,
        private readonly invoices: InvoicesService,
        private readonly prisma: PrismaService,
        private readonly systemConfig: SystemConfigService,
    ) { }

    // Desactiva sesiones vencidas cada 30 minutos (configurable)
    @Cron(CronExpression.EVERY_MINUTE, { name: 'deactivateExpiredSessions' })
    async deactivateExpiredSessionsJob() {
        // Verificar si debe ejecutarse según la configuración
        const intervalMinutes = this.systemConfig.getSessionCleanupInterval();
        const now = Date.now();

        if (now - this.lastSessionCleanup < intervalMinutes * 60 * 1000) {
            return; // Aún no es tiempo de ejecutar
        }

        this.lastSessionCleanup = now;

        try {
            const count = await this.sessions.deactivateExpiredActives();
            if (count > 0) {
                this.logger.log(`Desactivadas ${count} sesiones vencidas.`);
            } else {
                this.logger.verbose('No había sesiones vencidas para desactivar.');
            }
        } catch (err: any) {
            this.logger.error('Error desactivando sesiones vencidas', err?.stack || err);
        }
    }


    // Todos los meses se deben de generar las facturas y enlaces de pagos 
    // para que el usuario pueda pagar la clase que este inscripto y activa.
    // Se ejecuta diariamente y verifica si es el día configurado del mes
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { name: 'generateMonthlyInvoices' })
    async generateMonthlyInvoicesAndPaymentLinksJob() {
        const today = new Date().getDate();
        const configuredDay = this.systemConfig.getInvoiceGenerationDay();

        // Solo ejecutar si es el día configurado del mes
        if (today !== configuredDay) {
            return;
        }

        let totalProcessed = 0;
        let totalSuccess = 0;
        let totalFailed = 0;
        const errors: Array<{ sessionId: string; assistantId: string; error: string }> = [];

        try {
            const sessions = await this.sessions.findAllSessionInThisMonth();
            this.logger.log(`Iniciando generación de facturas para ${sessions.length} sesiones`);

            for (const session of sessions) {
                const { id: sessionId, assistants } = session;

                for (const assistant of assistants) {
                    totalProcessed++;

                    try {
                        await this.invoices.newInvoiceForSession(
                            assistant.id,
                            sessionId,
                            new Date()
                        );
                        totalSuccess++;
                        this.logger.verbose(
                            `✓ Factura creada: session=${sessionId}, assistant=${assistant.id}`
                        );
                    } catch (invoiceErr: any) {
                        totalFailed++;
                        const errorMsg = invoiceErr?.message || String(invoiceErr);

                        errors.push({
                            sessionId,
                            assistantId: assistant.id,
                            error: errorMsg
                        });

                        this.logger.warn(
                            `✗ Error creando factura: session=${sessionId}, assistant=${assistant.id}, error=${errorMsg}`
                        );
                    }
                }
            }

            // Resumen final
            this.logger.log(
                `Generación de facturas completada: ` +
                `Total=${totalProcessed}, Éxito=${totalSuccess}, Fallos=${totalFailed}`
            );

            if (errors.length > 0) {
                this.logger.error(
                    `Se encontraron ${errors.length} errores durante la generación:`,
                    JSON.stringify(errors, null, 2)
                );
            }

        } catch (err: any) {
            this.logger.error(
                'Error crítico generando facturas mensuales y enlaces de pago',
                err?.stack || err
            );
        }
    }

    // Limpia tokens expirados cada hora (configurable)
    @Cron(CronExpression.EVERY_MINUTE, { name: 'cleanupExpiredTokens' })
    async cleanupExpiredTokensJob() {
        // Verificar si debe ejecutarse según la configuración
        const intervalMinutes = this.systemConfig.getTokenCleanupInterval();
        const now = Date.now();

        if (now - this.lastTokenCleanup < intervalMinutes * 60 * 1000) {
            return; // Aún no es tiempo de ejecutar
        }

        this.lastTokenCleanup = now;

        try {
            const result = await this.prisma.token.deleteMany({
                where: {
                    expiresAt: {
                        lt: new Date(), // Eliminar los expirados
                    },
                },
            });

            if (result.count > 0) {
                this.logger.log(`Eliminados ${result.count} tokens expirados`);
            } else {
                this.logger.verbose('No había tokens expirados para eliminar.');
            }
        } catch (err: any) {
            this.logger.error('Error limpiando tokens expirados', err?.stack || err);
        }
    }

}
