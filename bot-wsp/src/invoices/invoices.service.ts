import { forwardRef, Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { Invoice, InvoiceStatus } from '@prisma/client';
import dayjs from 'dayjs';
import { OdooInvoiceInput } from '../odoo/entities/odoo.entity';
import { OdooService } from '../odoo/odoo.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '~/common/types';

@Injectable()
export class InvoicesService {
  private logger = new Logger(InvoicesService.name);
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => OdooService))
    private readonly odooService: OdooService,
  ) { }

  /**
 * Comprueba si el usuario tiene alguna factura no pagada en el mes actual.
 * @param userId ID del usuario
 * @returns true si existe al menos una factura con status PENDING o CANCELED dentro del mes en curso
 */
  async hasUnpaidInvoiceThisMonth(userId: string): Promise<boolean> {
    this.logger.log(`Checking unpaid invoices for user ${userId} in the current month`);
    const startOfMonth = dayjs().startOf('month').toDate();
    const endOfMonth = dayjs().endOf('month').toDate();

    const unpaidInvoice = await this.prisma.invoice.findFirst({
      where: {
        userId,
        status: {
          in: [InvoiceStatus.PENDING]
        },
        dateInvoice: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    });

    return !!unpaidInvoice;
  }

  async getLinkPayment(userId: string): Promise<string | null> {
    try {
      return 'www.mercadopago.com.ar/asd'
    }
    catch (error: any) {
      this.logger.error(`Error getting payment link for user ${userId}: ${error.message}`);
      return null;
    }
  }
  /**
 * Devuelve la suma de los precios efectivos de todas las sesiones
 * en las que el usuario es asistente y que tienen al menos un día
 * dentro del mes actual.
 *
 * @param userId ID del usuario
 * @returns total en la moneda del sistema (Float)
 */
  async getTotalAssistantSessionAmount(userId: string): Promise<number> {
    const startOfMonth = dayjs().startOf('month').toDate();
    const endOfMonth = dayjs().endOf('month').toDate();

    // 1️⃣  Obtener todas las sesiones donde el usuario es asistente
    const sessions = await this.prisma.session.findMany({
      where: {
        assistants: { some: { id: userId } },
      },
      include: {
        priceHistories: true,   // historial de precios
      },
    });

    let total = 0;

    // 2️⃣  Para cada sesión, encontrar el precio que estaba vigente
    //      en el rango del mes y sumarlo
    for (const s of sessions) {
      // Usar la nueva lógica corregida para obtener el precio del mes
      const priceForMonth = this.getCurrentPriceForDate(s, startOfMonth);
      total += priceForMonth;
    }

    this.logger.log(
      `Total effective amount for assistants of user ${userId} this month: ${total}`,
    );
    return total;
  }

  async newInvoiceForSession(userId: string, sessionId: string, dateInvoice: Date = new Date(), prismaClient?: any) {
    try {
      // Usar el cliente de transacción si se proporciona, o el cliente normal
      const client = prismaClient || this.prisma;

      // Obtener información de la sesión para el monto y descripción
      const session = await client.session.findUnique({
        where: { id: sessionId },
        include: { priceHistories: true }
      });

      if (!session) {
        this.logger.error(`Session not found: ${sessionId}`);
        throw new InternalServerErrorException('Sesión no encontrada');
      }

      // Obtener el precio efectivo para el mes de la factura
      const currentPrice = this.getCurrentPriceForDate(session, dateInvoice);

      const invoice = await client.invoice.create({
        data: {
          userId,
          sessionId,
          amount: currentPrice,
          dateInvoice,
          status: InvoiceStatus.PENDING,
        }
      });

      if (!invoice) {
        this.logger.error(`Failed to create invoice for user ${userId} and session ${sessionId}`);
        throw new InternalServerErrorException('Error al crear la factura');
      }

      // Crear factura en Odoo
      const user = await client.user.findUnique({ where: { id: userId } });
      if (!user) {
        this.logger.error(`User not found: ${userId}`);
        throw new InternalServerErrorException('Usuario no encontrado');
      }

      const data: OdooInvoiceInput = {
        product: {
          amount: currentPrice,
          description: session.description,
          invoiceId: invoice.id,
          sessionId: session.id
        },
        user: {
          dni: user.dni || '000000',
          id: user.id
        }
      };

      const facturaOdoo = await this.odooService.createInvoice(data);

      if (!facturaOdoo) {
        this.logger.error(`Error creating invoice in Odoo for user ${userId} and session ${sessionId}`);
        throw new InternalServerErrorException('Error al crear la factura en Odoo');
      }

      const updatedInvoice = await client.invoice.update({
        where: { id: invoice.id },
        data: {
          base64Invoice: facturaOdoo.result.base64Invoice,
          linkPayment: facturaOdoo.result.linkPayment,
        }
      });

      this.logger.log(`Invoice created successfully for user ${userId} and session ${sessionId} with invoice ID ${updatedInvoice.id} , amount: ${updatedInvoice.amount}, dateService : ${dateInvoice}`);
      return updatedInvoice;
    } catch (error: any) {
      this.logger.error(`Error creating invoice: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al crear la factura');
    }
  }

  /**
   * Obtiene el precio vigente de una sesión para una fecha determinada
   */
  private getCurrentPriceForDate(session: any, targetDate: Date): number {
    if (!session.priceHistories?.length) {
      return session.amount || 0;
    }

    // Ordenar por fecha de inicio (más reciente primero)
    const sortedHistory = session.priceHistories
      .sort((a: any, b: any) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());

    // Buscar el precio aplicable para la fecha objetivo
    const applicablePrice = sortedHistory.find((h: any) => {
      const from = new Date(h.effectiveFrom);
      const to = h.effectiveTo ? new Date(h.effectiveTo) : null;

      // Si es el precio vigente (effectiveTo = null) y la fecha es posterior al inicio
      if (!to && from <= targetDate) {
        return true;
      }

      // Si tiene fecha de fin, verificar que esté en el rango
      if (to && from <= targetDate && targetDate < to) {
        return true;
      }

      return false;
    });

    return applicablePrice ? applicablePrice.amount : session.amount || 0;
  }

  async findInvoiceThisMonthByUserId(userId: string): Promise<(Invoice & { description: string })[] | null> {
    try {
      const startOfMonth = dayjs().startOf('month').toDate();
      const endOfMonth = dayjs().endOf('month').toDate();

      const invoices = await this.prisma.invoice.findMany({
        where: {
          userId,
          OR: [
            {
              dateInvoice: {
                gte: startOfMonth,
                lte: endOfMonth
              }
            },
            {
              status: InvoiceStatus.PENDING
            }
          ]
        },
        include: {
          session: true
        }
      });

      const facturas: (Invoice & { description: string })[] = invoices.map(invoice => ({
        ...invoice,
        description: invoice.session.description
      }));

      return facturas || null;
    } catch (error: any) {
      this.logger.error(`Error fetching invoices for user ${userId}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al buscar las facturas');
    }
  }

  async findInvoicesByUserId(userId: string): Promise<(Invoice & { description: string })[] | null> {
    try {
      const invoices = await this.prisma.invoice.findMany({
        where: { userId },
        include: {
          session: true
        }
      });

      const facturas: (Invoice & { description: string })[] = invoices.map(invoice => ({
        ...invoice,
        description: invoice.session.description
      }));

      return facturas || null;
    } catch (error: any) {
      this.logger.error(`Error fetching invoices for user ${userId}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al buscar las facturas');
    }
  }

  async updateStatus(invoiceId: string, status: InvoiceStatus) {
    try {
      const invoice = await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { status }
      });

      return invoice;
    }
    catch (error: any) {
      this.logger.error(`Error updating invoice status: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al actualizar el estado de la factura');
    }
  }

  async findById(id: string) {
    try {
      return await this.prisma.invoice.findUnique({
        where: { id },
        include: {
          user: true,
          session: true
        }
      });
    } catch (error: any) {
      this.logger.error('Error al buscar invoice por id', error?.message);
      throw new InternalServerErrorException('Error al buscar la factura');
    }
  }

  async updateInvoiceStatus(userId: string, invoiceId: string, status: InvoiceStatus, actionBy?: AuthUser): Promise<Invoice> {
    const actionByInfo = actionBy ? `${actionBy.name || actionBy.id} (${actionBy.role})` : 'Unknown';
    this.logger.log(`Updating invoice status - userId: ${userId}, invoiceId: ${invoiceId}, newStatus: ${status}, actionBy: ${actionByInfo}`);
    
    try {
      // Verificar que la factura existe y pertenece al usuario
      const invoice = await this.prisma.invoice.findFirst({
        where: {
          id: invoiceId,
          userId: userId
        }
      });

      if (!invoice) {
        this.logger.warn(`Invoice not found or doesn't belong to user - invoiceId: ${invoiceId}, userId: ${userId}, attemptedBy: ${actionByInfo}`);
        throw new InternalServerErrorException('Factura no encontrada o no pertenece al usuario');
      }

      this.logger.log(`Found invoice - currentStatus: ${invoice.status}, updating to: ${status}, actionBy: ${actionByInfo}`);

      // Si el estado es PAID o CANCELED, actualizar en Odoo primero
      if (status === InvoiceStatus.PAID || status === InvoiceStatus.CANCELED) {
        this.logger.log(`Updating invoice status in Odoo - invoiceId: ${invoiceId}, status: ${status}`);
        
        try {
          await this.odooService.updateInvoiceStatus(invoiceId, status);
          this.logger.log(`Invoice status updated in Odoo successfully - invoiceId: ${invoiceId}`);
        } catch (odooError: any) {
          this.logger.error(`Failed to update invoice status in Odoo - invoiceId: ${invoiceId}, error: ${odooError.message}`);
          throw new InternalServerErrorException(`Error al actualizar el estado en Odoo: ${odooError.message}`);
        }
      }

      // Actualizar el estado en la base de datos
      const updatedInvoice = await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { status },
        include: {
          user: true,
          session: true
        }
      });

      this.logger.log(`Invoice status updated successfully - invoiceId: ${invoiceId}, from: ${invoice.status} to: ${status}, by: ${actionByInfo}`);
      
      return updatedInvoice;
    } catch (error: any) {
      this.logger.error(`Error updating invoice status by ${actionByInfo}: ${error.message}`, error.stack);
      
      // Si el error ya es de Odoo, re-lanzarlo
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      
      throw new InternalServerErrorException('Error al actualizar el estado de la factura');
    }
  }

  /**
   * Crea facturas para todos los usuarios asistentes de sesiones activas
   * para el mes especificado (o mes actual si no se especifica)
   */
  async createMonthlyInvoicesForActiveAssistants(month?: Date) {
    try {
      const targetMonth = month || new Date();
      const startOfMonth = dayjs(targetMonth).startOf('month').toDate();

      this.logger.log(`Creating monthly invoices for ${dayjs(targetMonth).format('YYYY-MM')}`);

      // Obtener todas las sesiones activas con sus asistentes
      const activeSessions = await this.prisma.session.findMany({
        where: { isActive: true },
        include: {
          assistants: true,
          priceHistories: true
        }
      });

      const invoicesCreated = [];

      for (const session of activeSessions) {
        for (const assistant of session.assistants) {
          // Verificar que no exista ya una factura para este usuario, sesión y mes
          const existingInvoice = await this.prisma.invoice.findFirst({
            where: {
              userId: assistant.id,
              sessionId: session.id,
              dateInvoice: {
                gte: startOfMonth,
                lt: dayjs(targetMonth).endOf('month').toDate()
              }
            }
          });

          if (!existingInvoice) {
            const invoice = await this.newInvoiceForSession(
              assistant.id,
              session.id,
              startOfMonth
            );
            invoicesCreated.push(invoice);
          }
        }
      }

      this.logger.log(`Created ${invoicesCreated.length} invoices for ${dayjs(targetMonth).format('YYYY-MM')}`);
      return invoicesCreated;
    }
    catch (error: any) {
      this.logger.error(`Error creating monthly invoices: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error en la creación masiva de facturas');
    }
  }


}
