import { Injectable, Logger } from '@nestjs/common';
import { LogDirection } from '@prisma/client';
import dayjs from 'dayjs';
import { AuthService, TokenRedirectURL } from '~/auth/auth.service';
import { AttendanceService } from '../attendance/attendance.service';
import { InvoicesService } from '../invoices/invoices.service';
import { UserService } from '../user/user.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class RfidService {
  private logger = new Logger(RfidService.name);
  constructor(
    private readonly userService: UserService,
    private readonly whatsappService: WhatsappService,
    private readonly attendanceService: AttendanceService,
    private readonly invoicesService: InvoicesService,
    private readonly authService: AuthService,
  ) { }

  async ping(uid: string): Promise<void> {
    try {
      const usuario = await this.userService.findByRfid(uid);
      const admin = await this.userService.getUserAdmin();
      if (usuario) {
        if (!usuario.phone) {
          this.logger.debug(`El usuario ${usuario.name} no tiene un número de teléfono registrado.`);
          const number = admin?.phone ? `549${admin.phone}` : '5493435077510'
          this.logger.log({
            action: 'RFID ping',
            message: `El usuario ${usuario.name} con ID ${usuario.id} no tiene un número de teléfono registrado.`,
            uid: uid,
            userId: usuario.id,
          })
          await this.whatsappService.sendText(
            number,
            `El usuario ${usuario.name} con ID ${usuario.id} no tiene un número de teléfono registrado. Por favor, actualiza su información.`);
        } else {
          this.logger.log(`RFID ping recibido con id=${uid} del usuario ${usuario.name}`);
          const log = await this.attendanceService.logAccess(usuario.id);
          const tipo = log.direction === LogDirection.INGRESS ? 'ingreso' : 'egreso';
          const hora = dayjs(log.timestamp).format('HH:mm');

          // ---- Construir un único mensaje ----
          let message = `Hola ${usuario.name} ! \n`;

          if (log.direction === LogDirection.INGRESS) {
            this.logger.log(`Registro de ingreso para el usuario ${usuario.name} a las ${hora}`);
            message += `Registramos tu ${tipo} a las ${hora}. \n`;

            // Verificar factura pagada
            const unpaidInvoice = await this.invoicesService.hasUnpaidInvoiceThisMonth(usuario.id);
            if (unpaidInvoice) {
              this.logger.warn(`El usuario ${usuario.name} tiene facturas no pagadas este mes.`);
              message += `⚠️ Notamos que tienes facturas no pagadas este mes. Por favor, regulariza tu situación.`;
            }
          } else {
            // Si es egreso, solo avisamos el registro
            message += `Registramos tu ${tipo} a las ${hora}.`;
          }
          // Enviar el mensaje único
          await this.whatsappService.sendText('549' + usuario.phone, message);
        }
        return;
      } else {
        //NOTE mando al admin que se esta registrando un un nuevo usuario
        this.logger.error({
          action: 'RFID ping',
          message: `RFID ping recibido con id=${uid} pero no se encontró el usuario`,
          uid: uid,
        })
        const newUser = await this.userService.createUserTemporary(uid);
        this.logger.debug(`Usuario temporal creado: ${newUser.name} con ID ${newUser.id}`);
        if (!admin) {
          this.logger.error(`No se encontró un usuario administrador para notificar sobre el nuevo usuario con RFID ${uid}.`);
          return;
        }

        const token = await this.authService.generarToken(admin.id, TokenRedirectURL.USER);

        await this.whatsappService.sendText('549' + admin?.phone,
          `🆕 Se registro un *nuevo usuario* a travez de un nuevo *llavero*.\n
           🤔 Nombre: *${newUser.name}*\n 
           Porfavor actualiza su información ingresando al link 🙏\n
           ${process.env.URL_FRONT}?t=${token}
           `);
        return;
      }
    }
    catch (error: any) {
      this.logger.error(`Error al procesar el ping RFID: ${error}`);


    }
  }
}
