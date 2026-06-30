import { Controller, ForbiddenException, Get, Param, Res, NotFoundException, UseGuards, Put, Body } from '@nestjs/common';
import { Response } from 'express';
import { InvoicesService } from './invoices.service';
import { User } from '~/common/decoratos/user.decorator';
import { AuthUser } from '~/common/types';
import { Invoice, UserRole, InvoiceStatus } from '@prisma/client';
import { AuthTokenGuard } from '~/common/guards/auth-token.guard';

@Controller('invoices')
@UseGuards(AuthTokenGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) { }

  @Get(':userId')
  async getAttendeesSnapshot(
    @Param('userId') userId: string,
    @User() user: AuthUser,
  ): Promise<(Invoice & { description: string })[] | null> {
    const allowed = user?.role === UserRole.ADMIN || user?.role === UserRole.INSTRUCTOR || user?.id === userId;
    if (!allowed) {
      throw new ForbiddenException('No tienes permisos para ver facturas');
    }
    return this.invoicesService.findInvoicesByUserId(userId);
  }

  @Get('download/:invoiceId')
  async downloadInvoicePdf(
    @Param('invoiceId') invoiceId: string,
    @User() user: AuthUser,
    @Res() res: Response,
  ): Promise<void> {
    // Buscar la factura con las relaciones necesarias
    const invoice = await this.invoicesService.findById(invoiceId);
    if (!invoice) {
      throw new NotFoundException('Factura no encontrada');
    }

    // Verificar permisos - debe ser admin, instructor o el dueño de la factura
    const allowed = user?.role === UserRole.ADMIN || 
                   user?.role === UserRole.INSTRUCTOR || 
                   invoice.userId === user?.id;
    
    if (!allowed) {
      throw new ForbiddenException('No tienes permisos para descargar esta factura');
    }

    // Verificar que la factura tiene contenido PDF
    if (!invoice.base64Invoice) {
      throw new NotFoundException('La factura no tiene contenido PDF disponible');
    }

    try {
      // Decodificar el base64
      const pdfBuffer = Buffer.from(invoice.base64Invoice, 'base64');
      
      // Configurar headers para la descarga
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="factura-${invoice.id}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      // Enviar el archivo
      res.send(pdfBuffer);
    } catch (error) {
      throw new NotFoundException('Error al procesar el archivo PDF');
    }
  }

  @Put(':userId/:invoiceId')
  async updateInvoiceStatus(
    @Param('userId') userId: string,
    @Param('invoiceId') invoiceId: string,
    @Body('status') status: InvoiceStatus,
    @User() user: AuthUser,
  ): Promise<Invoice> {
    // Verificar permisos - solo admin o instructor pueden actualizar facturas
    const allowed = user?.role === UserRole.ADMIN || user?.role === UserRole.INSTRUCTOR;
    if (!allowed) {
      throw new ForbiddenException('No tienes permisos para actualizar facturas');
    }

    return this.invoicesService.updateInvoiceStatus(userId, invoiceId, status, user);
  }

}