import { BadRequestException, ForbiddenException, forwardRef, Inject, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { $Enums, Session, SessionType, UserRole } from '@prisma/client';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { AuthUser } from '~/common/types';
import { CustomIdService } from '../custom-id/custom-id.service';
import { InvoicesService } from '../invoices/invoices.service';
import { PrismaService } from '../prisma/prisma.service';
import { DeactivateBody } from './entities/session.entity';
dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'America/Argentina/Buenos_Aires';

type RecurrencePayload = {
  startDate: string;               // 'YYYY-MM-DD'
  endDate: string;                 // 'YYYY-MM-DD'
  days: number[];                  // 0..6 (dom..sáb)
  startTime?: string;              // 'HH:mm' (opcional si hay dayTimes)
  endTime?: string;                // 'HH:mm' (opcional si hay dayTimes)
  dayTimes?: Record<
    string,                        // "0".."6"
    { startTime: string; endTime: string }
  >;
};

type UpsertPayload = {
  id?: string;
  title: string;
  type: $Enums.SessionType | 'RECURRING' | 'ONE_TIME';
  instructorId: string;
  amount?: number;
  recurrence?: RecurrencePayload;
  dates?: Array<{ start: string | Date; end: string | Date }>;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
};


export type SessionFilter = {
  modo?: string
  descripcion?: string;
  instructor?: string;
  assistant?: string;
  temporalReference?: string;
  daysOfWeek?: string[];
};


@Injectable()
export class SessionsService {
  private logger = new Logger(SessionsService.name);

  constructor(
    private prisma: PrismaService,
    private customIdService: CustomIdService,
    @Inject(forwardRef(() => InvoicesService))
    private readonly invoicesService: InvoicesService
  ) { }

  async findById(id: string) {
    try {
      return await this.prisma.session.findUnique({ where: { id }, include: { instructors: true, assistants: true } });
    } catch (error: any) {
      this.logger.error('Error al buscar session por id', error?.message);
      throw new NotFoundException('Sesión no encontrada');
    }
  }

  async findAll(user: AuthUser, status?: 'active' | 'inactive' | 'all'): Promise<Session[]> {
    try {
      // Determinar el filtro de isActive basado en el parámetro status
      const isActiveFilter = status === 'active' 
        ? true 
        : status === 'inactive' 
        ? false 
        : undefined; // 'all' o sin especificar = no filtrar por isActive

      const response = await this.prisma.session.findMany({
        where: {
          ...(isActiveFilter !== undefined ? { isActive: isActiveFilter } : {}),
          ...(user.role === UserRole.INSTRUCTOR ? { instructors: { some: { id: user.id } } } : {}),
        },
        include: {
          instructors: true,
          SessionDateSnapshot: { include: { dateRange: true, substituteInstructors: true } },
        }
      })
      return response
    }
    catch (error: any) {
      this.logger.error('Error al buscar todas las sessions', error?.message);
      throw error;
    }
  }

  //NOTE se va a usar en el crone job para generar las facturas mensuales
  // sesiones activas que tengan fechas en el mes actual
  // con la relacion de assistants (id, dni)
  async findAllSessionInThisMonth(): Promise<(Session & {
    assistants: { id: string; dni: string | null }[]
  })[]> {
    try {

      const startOfMonth = dayjs().startOf('month').toDate();
      const endOfMonth = dayjs().endOf('month').toDate();
      const response = await this.prisma.session.findMany({
        where: {
          isActive: true,
          startDate: { lte: endOfMonth },
          endDate: { gte: startOfMonth },
        },
        include: {
          assistants: {
            select: { id: true, dni: true },
            where: { role: UserRole.USER }
          },
        }
      });

      return response;
    }
    catch (error: any) {
      this.logger.error('Error al buscar todas las sessions del mes', error?.message);
      throw error;
    }
  }


  async findAllsSessionByProfessorId(professorId: string): Promise<Session[]> {
    try {
      const sessions = await this.prisma.session.findMany({
        where: {
          isActive: true,                     // solo sesiones activas
          instructors: {                      // profesor debe estar en la relación
            some: { id: professorId }
          }
        },
        include: {                            // opcional: traer los profesores y asistentes
          instructors: true,
          assistants: true,
        },
      });

      return sessions;
    } catch (error: any) {
      this.logger.error(
        `Error al buscar sesiones por professorId (${professorId})`,
        error?.message
      );
      throw error;
    }
  }



  async findAllByUserId(userId: string , onlyAssistants: boolean): Promise<Session[]> {
    try {
      const sessions = await this.prisma.session.findMany({
        where: {
          isActive: true,
          OR: [
            { assistants: { some: { id: userId } } },
            onlyAssistants ? {} :  { instructors: { some: { id: userId } } }
          ],
        },
        include: {
          instructors: true,
          assistants: true,
          dates: true,
          priceHistories: true,
        },
      });

      return sessions;
    } catch (error: any) {
      this.logger.error('Error al buscar sessions por userId', error?.message);
      throw error;
    }
  }

  //Necesito buscar todas a las que no este inscripto como assistants 
  async findAllNotAssistantByUserId(userId: string, now: boolean = false) {
    try {
      const currentDate = new Date();

      const sessions = await this.prisma.session.findMany({
        where: {
          isActive: true,
          assistants: { none: { id: userId }, },
          ...(now && {
            dates: {
              some: {
                end: { gte: currentDate }
              }
            }
          })
        },
        include: {
          instructors: true,
          assistants: true,
          dates: true, // ✅ Incluir las fechas para sesiones RECURRING
          priceHistories: true,
        },
      });

      return sessions;
    } catch (error: any) {
      this.logger.error('Error al buscar sessions por userId', error?.message);
      throw error;
    }
  }

  async transactionAddAssistantAndCreateInvoice(
    sessionId: string,
    userId: string,
  ) {
    try {
      this.logger.log(`Iniciando transacción: agregar asistente ${userId} a sesión ${sessionId} y crear factura`);

      return await this.prisma.$transaction(async (tx) => {
        // 1) Verificar que la sesión existe y traer sus fechas
        const session = await tx.session.findUnique({
          where: { id: sessionId },
          include: { 
            assistants: true,
            dates: true  // Necesitamos las fechas para saber cuándo inicia
          }
        });
        if (!session) {
          throw new Error('Session not found');
        }

        // 2) Verificar que el usuario exists
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user) {
          throw new Error('User not found');
        }

        // 3) Verificar que el usuario no esté ya inscrito
        const isAlreadyAssistant = session.assistants.some(assistant => assistant.id === userId);
        if (isAlreadyAssistant) {
          throw new Error('User is already an assistant in this session');
        }

        // 4) Agregar asistente a la sesión
        const updatedSession = await tx.session.update({
          where: { id: sessionId },
          data: {
            assistants: {
              connect: { id: userId }
            }
          },
          include: { assistants: true }
        });

        // 5) Determinar el mes de facturación según cuándo inicia la clase
        let invoiceMonth: Date;
        
        this.logger.log(`Determinando mes de factura - sessionType: ${session.type}, startDate: ${session.startDate}, datesCount: ${session.dates?.length || 0}`);
        
        if (session.type === 'ONE_TIME' && session.startDate) {
          // Para clases ONE_TIME, usar el mes de la startDate
          invoiceMonth = dayjs(session.startDate).startOf('month').toDate();
          this.logger.log(`ONE_TIME detectada - usando startDate: ${session.startDate}, invoiceMonth: ${dayjs(invoiceMonth).format('YYYY-MM-DD')}`);
        } else if (session.dates && session.dates.length > 0) {
          // Para clases RECURRING, usar el mes de la primera fecha
          const sortedDates = session.dates.sort((a, b) => 
            new Date(a.start).getTime() - new Date(b.start).getTime()
          );
          invoiceMonth = dayjs(sortedDates[0].start).startOf('month').toDate();
          this.logger.log(`RECURRING detectada - primera fecha: ${sortedDates[0].start}, invoiceMonth: ${dayjs(invoiceMonth).format('YYYY-MM-DD')}`);
        } else if (session.startDate) {
          // Fallback: usar startDate de la sesión
          invoiceMonth = dayjs(session.startDate).startOf('month').toDate();
          this.logger.log(`Fallback usando startDate: ${session.startDate}, invoiceMonth: ${dayjs(invoiceMonth).format('YYYY-MM-DD')}`);
        } else {
          // Último fallback: mes actual
          invoiceMonth = dayjs().startOf('month').toDate();
          this.logger.log(`Último fallback - usando mes actual: ${dayjs(invoiceMonth).format('YYYY-MM-DD')}`);
        }

        this.logger.log(`Generando factura para el mes: ${dayjs(invoiceMonth).format('YYYY-MM-DD')}`);

        // 6) Crear factura para el mes correcto
        const invoice = await this.invoicesService.newInvoiceForSession(
          userId,
          sessionId,
          invoiceMonth,
          tx
        );

        this.logger.log(`Transacción completada exitosamente: sesión ${sessionId}, usuario ${userId}, factura ${invoice.id}`);

        return {
          session: updatedSession,
          invoice: invoice
        };
      }, {
        timeout: 15000 // 15 segundos para permitir llamadas a Odoo
      });

    } catch (error: any) {
      this.logger.error('Error en transacción addAssistantAndCreateInvoice:', error.message);
      throw new InternalServerErrorException(`Error en la transacción: ${error.message}`);
    }
  }


  async addAssistantToSession(sessionId: string, userId: string): Promise<Boolean> {
    try {
      const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
      if (!session) throw new Error('Session not found');

      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('User not found');

      // Opción: evitar agregar duplicados manualmente (o Prisma lo controla si usás clave única)
      await this.prisma.session.update({
        where: { id: sessionId },
        data: {
          assistants: {
            connect: { id: userId }
          }
        },
        include: { assistants: true }
      });
      return true;
    }
    catch (error: any) {
      this.logger.error('Error al agregar asistente a la sesión', error?.message);
      throw new InternalServerErrorException('Error al agregar asistente a la sesión');
    }

  }

  async addInstructorToSession(sessionId: string, userId: string) {
    // Verificar que la sesión exista
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new Error('Session not found');

    // Verificar que el usuario exista
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new Error('User not found');

    // Actualizar la sesión agregando el instructor
    const updatedSession = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        instructors: {
          connect: { id: userId },
        },
      },
      include: {
        instructors: true,
        assistants: true,

      },
    });

    return updatedSession;
  }

  async removeUserFromSession(sessionId: string, userId: string) {
    // Verificar que la sesión exista
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        instructors: { select: { id: true } },
        assistants: { select: { id: true } },
      },
    });

    if (!session) throw new Error('Session not found');

    const isInstructor = session.instructors.some((user) => user.id == userId);
    const isAssistant = session.assistants.some((user) => user.id == userId);

    if (!isInstructor && !isAssistant) {
      throw new Error('User is not assigned to this session');
    }

    const updates: any = {};

    if (isInstructor) {
      updates.instructors = { disconnect: { id: userId } };
    }

    if (isAssistant) {
      updates.assistants = { disconnect: { id: userId } };
    }

    const updatedSession = await this.prisma.session.update({
      where: { id: sessionId },
      data: updates,
      include: {
        instructors: true,
        assistants: true,
      },
    });

    return updatedSession;
  }

  /**
     * Actualiza una sesión.
     *
     * @param sessionId      ID de la sesión a modificar.
     * @param updateData     Un objeto parcial con los campos que se quieren
     *                       actualizar (tipo `Partial<Session>`).
     * @param currentUserId  ID del usuario que está realizando la mutación.
     *
     * Si el usuario que ejecuta la operación es un `INSTRUCTOR`, se comprueba
     * que esté incluido en la relación `instructors` de la sesión. En caso
     * contrario se lanza `ForbiddenException`.
     */
  async updateSession(
    sessionId: string,
    updateData: Partial<Session>,
    currentUserId: string,
  ): Promise<Session> {
    try {
      // 1️⃣ Obtener el usuario que está haciendo la mutación
      const currentUser = await this.prisma.user.findUnique({
        where: { id: currentUserId },
      });

      if (!currentUser) {
        throw new InternalServerErrorException(
          `Usuario con id ${currentUserId} no encontrado`,
        );
      }

      // 2️⃣ Obtener la sesión que se va a actualizar
      const session = await this.prisma.session.findUnique({
        where: { id: sessionId },
        include: { instructors: true }, // traer la relación para la validación
      });

      if (!session) {
        throw new InternalServerErrorException(
          `Sesión con id ${sessionId} no encontrada`,
        );
      }

      // 3️⃣ Si el usuario es profesor, verificar que esté incluido en la relación
      if (currentUser.role === UserRole.INSTRUCTOR) {
        const isInstructorInSession = session.instructors.some(
          (inst) => inst.id === currentUserId,
        );

        if (!isInstructorInSession) {
          throw new ForbiddenException(
            'no tienes permisos para actualizar esta sesión',
          );
        }
      }

      // 4️⃣ Actualizar la sesión con los datos parciales
      const updatedSession = await this.prisma.session.update({
        where: { id: sessionId },
        data: updateData,
      });

      return updatedSession;
    } catch (err) {
      throw new InternalServerErrorException(
        'No se pudo actualizar la sesión',
      );
    }

  }

  /**
  * Crea o actualiza una sesión.
  * - Si dto.id existe: update (reemplaza dates y snapshots).
  * - Si dto.id no existe: create (genera customId y snapshots).
  * Valida que el profesor exista por customId.
  * Si quien edita es INSTRUCTOR, valida que pertenezca a la sesión.
  */
  async upsertSession(payload: UpsertPayload, currentUserId?: string) {
    const {
      id,
      title,
      type,
      instructorId,
      amount,
      recurrence,
      dates,
      startDate,
      endDate,
    } = payload;

    const typeStr = String(type); // evita TS2367
    const isUpdate = !!id;
    const now = new Date();

    // 1) Cargar sesión si es update + permisos
    const sessionOld = isUpdate
      ? await this.prisma.session.findUnique({
        where: { id: id! },
        include: { instructors: true, dates: true },
      })
      : null;

    if (isUpdate && !sessionOld) {
      throw new NotFoundException(`Sesión ${id} no encontrada`);
    }

    if (currentUserId && isUpdate) {
      const currentUser = await this.prisma.user.findUnique({ where: { id: currentUserId } });
      if (!currentUser) throw new ForbiddenException('Usuario inválido');
      // si tenés role como string, podés comparar con 'INSTRUCTOR'
      if (currentUser.role === ($Enums.UserRole?.INSTRUCTOR ?? 'INSTRUCTOR')) {
        const allowed = sessionOld!.instructors.some((i) => i.id === currentUserId);
        if (!allowed) throw new ForbiddenException('No tienes permisos para actualizar esta sesión');
      }
    }

    // 2) Construir desiredRanges a partir de recurrence/dayTimes o dates
    const desiredRanges: { start: Date; end: Date }[] = [];

    if (recurrence && typeStr === SessionType.RECURRING) {
      const { startDate: sd, endDate: ed, days, startTime, endTime, dayTimes } = recurrence;
      const dStart = dayjs(sd, 'YYYY-MM-DD');
      const dEnd = dayjs(ed, 'YYYY-MM-DD');
      if (!dStart.isValid() || !dEnd.isValid() || dEnd.isBefore(dStart) || !days?.length) {
        throw new BadRequestException('Recurrence inválido');
      }

      const perDay = dayTimes && Object.keys(dayTimes).length > 0;

      for (
        let d = dStart.clone();
        d.isSame(dEnd, 'day') || d.isBefore(dEnd, 'day');
        d = d.add(1, 'day')
      ) {
        const idx = d.day(); // 0..6
        if (!days.includes(idx)) continue;

        let sHHmm: string, eHHmm: string;
        if (perDay) {
          const conf = dayTimes[String(idx)];
          if (!conf?.startTime || !conf?.endTime) {
            throw new BadRequestException(`Falta horario para el día ${idx}`);
          }
          sHHmm = conf.startTime;
          eHHmm = conf.endTime;
        } else {
          if (!startTime || !endTime) {
            throw new BadRequestException('Faltan startTime/endTime en recurrence');
          }
          sHHmm = startTime;
          eHHmm = endTime;
        }

        const dateStr = d.format('YYYY-MM-DD');
        desiredRanges.push({
          start: dayjs.tz(`${dateStr} ${sHHmm}`, 'YYYY-MM-DD HH:mm', TZ).toDate(),
          end: dayjs.tz(`${dateStr} ${eHHmm}`, 'YYYY-MM-DD HH:mm', TZ).toDate()
        });
      }

      if (desiredRanges.length === 0) {
        throw new BadRequestException(
          'El rango (startDate..endDate) no contiene ninguno de los días seleccionados.'
        );
      }
    } else if (Array.isArray(dates) && dates.length) {
      for (const r of dates) {
        const s = new Date(r.start);
        const e = new Date(r.end);
        if (isNaN(s.getTime()) || isNaN(e.getTime())) {
          throw new BadRequestException('Alguna fecha enviada en "dates" es inválida');
        }
        desiredRanges.push({ start: s, end: e });
      }
    } else {
      throw new BadRequestException('Debe enviar recurrence o dates');
    }

    // 3) Transacción: upsert Session + diff rangos + snapshots + price history
    const result = await this.prisma.$transaction(async (tx) => {
      // Para el campo Session.startDate/endDate, si vino recurrence, usamos esas fechas
      const dStartForSession =
        recurrence && typeStr === SessionType.RECURRING
          ? dayjs(recurrence.startDate, 'YYYY-MM-DD').toDate()
          : desiredRanges[0]?.start ?? sessionOld?.startDate ?? null;

      const dEndForSession =
        recurrence && typeStr === SessionType.RECURRING
          ? dayjs(recurrence.endDate, 'YYYY-MM-DD').toDate()
          : desiredRanges.at(-1)?.end ?? sessionOld?.endDate ?? null;

      // 3.1) Crear/actualizar Session base
      const session = isUpdate
        ? await tx.session.update({
          where: { id: id! },
          data: {
            description: title,
            type: type as any,
            ...(amount !== undefined ? { amount } : {}),
            startDate: startDate != null ? new Date(startDate as any) : dStartForSession,
            endDate: endDate != null ? new Date(endDate as any) : dEndForSession,
            instructors: { set: [{ id: instructorId }] },
          },
        })
        : await tx.session.create({
          data: {
            description: title,
            type: type as any,
            customId: await this.customIdService.generateCustomId('session', 'S'),
            amount: amount ?? null,
            startDate: startDate ? new Date(startDate as any) : dStartForSession,
            endDate: endDate ? new Date(endDate as any) : dEndForSession,
            instructors: { connect: [{ id: instructorId }] },
          },
        });

      // 3.2) Ranges actuales
      const currentRanges = await tx.sessionDateRange.findMany({
        where: { sessionId: session.id },
        select: { id: true, start: true, end: true },
      });

      // 3.3) Diff por clave (startISO__endISO)
      const key = (d: { start: Date; end: Date }) =>
        `${d.start.toISOString()}__${d.end.toISOString()}`;

      const desiredMap = new Map(desiredRanges.map((d) => [key(d), d]));
      const currentMap = new Map(currentRanges.map((d) => [key(d), d]));

      // Crear faltantes (+ snapshot)
      for (const [k, d] of desiredMap) {
        if (!currentMap.has(k)) {
          const created = await tx.sessionDateRange.create({
            data: { sessionId: session.id, start: d.start, end: d.end },
          });
          await tx.sessionDateSnapshot.create({
            data: {
              sessionId: session.id,
              dateRangeId: created.id,
            },
          });
        }
      }

      // Eliminar sobrantes (y sus snapshots)
      const toDelete = currentRanges.filter((cr) => !desiredMap.has(key(cr))).map((cr) => cr.id);
      if (toDelete.length) {
        await tx.sessionDateSnapshot.deleteMany({ where: { dateRangeId: { in: toDelete } } });
        await tx.sessionDateRange.deleteMany({ where: { id: { in: toDelete } } });
      }

      // 3.4) Si cambia el precio: cerrar vigente y crear uno nuevo en PriceHistory
      if (isUpdate && amount !== undefined && amount !== sessionOld!.amount) {
        await tx.sessionPriceHistory.updateMany({
          where: { sessionId: session.id, effectiveTo: null },
          data: { effectiveTo: now },
        });
        await tx.sessionPriceHistory.create({
          data: { sessionId: session.id, amount, effectiveFrom: now, effectiveTo: null },
        });
      }

      // 3.5) devolver todo lo que el front usa
      return tx.session.findUnique({
        where: { id: session.id },
        include: {
          dates: true,
          instructors: true,
          SessionDateSnapshot: { include: { dateRange: true } },
          priceHistories: true,
        },
      });
    });

    return { session: result, created: !isUpdate };
  }




  async getParticipantsLists(sessionId: string)
    : Promise<{ selected: UserSession[], available: UserSession[] }> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { assistants: true },
    });
    if (!session) throw new NotFoundException('Sesión no encontrada');

    const selected = session.assistants.map(u => ({
      id: u.id, customId: u.customId, name: u.name, role: u.role,
    }));

    // Disponibles: todos menos los ya seleccionados (podés filtrar roles si querés)
    const selectedIds = selected.map(u => u.id);
    const availableUsers = await this.prisma.user.findMany({
      where: {
        id: { notIn: selectedIds.length ? selectedIds : [''] },
        // opcional: limitar a ciertos roles como “alumnos”
        // role: { in: [UserRole.USER, UserRole.GUEST] },
        deleted: null,
      },
      select: { id: true, customId: true, name: true, role: true },
      orderBy: { name: 'asc' },
    });

    const available = availableUsers.map(u => ({
      id: u.id, customId: u.customId, name: u.name, role: u.role,
    }));

    return { selected, available };
  }

  async setParticipants(sessionId: string, userIds: string[], currentUser?: { id: string; role: UserRole }) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { instructors: true },
    });
    if (!session) throw new NotFoundException('Clase no encontrada');

    // Si el que modifica es INSTRUCTOR, debe pertenecer a la sesión
    if (currentUser?.role === UserRole.INSTRUCTOR) {
      const allowed = session.instructors.some(i => i.id === currentUser.id);
      if (!allowed) throw new ForbiddenException('No tienes permisos para esta clase');
    }

    // Reemplazar toda la lista de asistentes
    const updated = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        assistants: {
          set: userIds.map(id => ({ id })),
        },
      },
      include: { assistants: true },
    });

    return {
      id: updated.id,
      assistants: updated.assistants.map(u => ({ id: u.id, customId: u.customId, name: u.name })),
    };
  }

  async setSubstituteInstructor(idSnapshot: string, substituteInstructorId: string[]) {

    const snapshot = await this.prisma.sessionDateSnapshot.findUnique({
      where: {
        id: idSnapshot
      }
    })

    if (!snapshot) throw new NotFoundException('Snapshot no encontrado');

    const updated = await this.prisma.sessionDateSnapshot.update({
      where: { id: idSnapshot },
      data: {
        substituteInstructors: {
          set: substituteInstructorId.map(id => ({ id })),
        },
      },
      include: {
        substituteInstructors: true,
      },
    });

    return !!updated
  }

  async getAttendeesSnapshot(snapshotId: string): Promise<ResponseAttendeesSnapshot> {
    try {
      const snapshot = await this.prisma.sessionDateSnapshot.findUnique({
        where: {
          id: snapshotId
        },
        select: {
          presentAssistants: { select: { id: true, name: true } },
          presentInstructors: { select: { id: true, name: true } },
          dateRange: { select: { start: true, end: true } },
          session: { include: { instructors: { select: { id: true, name: true } }, assistants: { select: { id: true, name: true } } } }
        }
      })

      if (!snapshot) {
        throw new NotFoundException('Snapshot no encontrado');
      }

      const response: ResponseAttendeesSnapshot = {
        dateRange: snapshot.dateRange,
        instructors: snapshot.session.instructors,
        assistants: snapshot.session.assistants,
        attendance: [...snapshot.presentAssistants.map(a => ({ id: a.id, name: a.name })), ...snapshot.presentInstructors.map(a => ({ id: a.id, name: a.name }))]
      };

      return response
    }
    catch (error: any) {

      this.logger.error('Error al obtener asistentes del snapshot', error?.message);
      throw new InternalServerErrorException('Error al obtener asistentes del snapshot');
    }

  }


  async findByCustomId(customId: string): Promise<Session | null> {
    try {
      this.logger.log(`Buscando sesión con customId: ${customId}`);
      return await this.prisma.session.findUnique({
        where: { customId },
      });

    }
    catch (error: any) {
      this.logger.error('Error al buscar sesión por customId', error?.message);
      throw new InternalServerErrorException('Error al buscar sesión por customId');
    }
  }


  async deactivate(data: DeactivateBody, actionBy?: AuthUser) {
    const actionByInfo = actionBy ? `${actionBy.name || actionBy.id} (${actionBy.role})` : 'Unknown';
    this.logger.log(`Deactivate request - model: ${data.model}, modelId: ${data.modelId}, actionBy: ${actionByInfo}`);
    
    try {
      const { model, modelId } = data

      if (model === 'session') {
        this.logger.log(`Deactivating session - id: ${modelId}, actionBy: ${actionByInfo}`);
        
        const session = await this.prisma.session.findUnique({ where: { id: modelId } });
        if (!session) {
          this.logger.warn(`Session not found for deactivation - id: ${modelId}, attemptedBy: ${actionByInfo}`);
          throw new BadRequestException('Sesión no encontrada');
        }
        
        const desactivate = await this.prisma.session.update({
          where: { id: modelId },
          data: { isActive: false }
        });
        
        this.logger.log(`Session deactivated successfully - id: ${modelId}, by: ${actionByInfo}`);
        return !!desactivate
      }

      if (model === 'snapshot') {
        this.logger.log(`Deactivating snapshot - id: ${modelId}, actionBy: ${actionByInfo}`);
        
        const snapshot = await this.prisma.sessionDateSnapshot.findUnique({ where: { id: modelId } });
        if (!snapshot) {
          this.logger.warn(`Snapshot not found for deactivation - id: ${modelId}, attemptedBy: ${actionByInfo}`);
          throw new BadRequestException('Snapshot no encontrado');
        }
        
        const desactivate = await this.prisma.sessionDateSnapshot.update({
          where: { id: modelId },
          data: { isActive: false }
        });
        
        this.logger.log(`Snapshot deactivated successfully - id: ${modelId}, by: ${actionByInfo}`);
        return !!desactivate
      }

      this.logger.warn(`Invalid model for deactivation - model: ${model}, attemptedBy: ${actionByInfo}`);
      throw new BadRequestException('No se encontro el modelo')
    } catch (error: any) {
      this.logger.error(`Error in deactivate by ${actionByInfo} - model: ${data.model}, modelId: ${data.modelId}, error: ${error.message}`, error.stack);
      throw new InternalServerErrorException('No se pudo desactivar')
    }
  }

  /**
   * Programa un cambio de precio futuro para una sesión
   * @param sessionId ID de la sesión
   * @param newAmount Nuevo monto a aplicar
   * @param effectiveFrom Fecha desde cuando será efectivo el nuevo precio
   */
  async scheduleSessionPriceChange(
    sessionId: string,
    newAmount: number,
    effectiveFrom: Date
  ): Promise<void> {
    this.logger.log(`Scheduling price change for session ${sessionId}: ${newAmount} from ${effectiveFrom}`);

    await this.prisma.$transaction(async (tx) => {
      // Verificar que la sesión existe
      const session = await tx.session.findUnique({ where: { id: sessionId } });
      if (!session) {
        throw new NotFoundException('Sesión no encontrada');
      }

      // Verificar que la fecha sea futura
      if (effectiveFrom <= new Date()) {
        throw new BadRequestException('La fecha efectiva debe ser futura');
      }

      // Buscar precios que puedan conflictuar
      const conflictingPrices = await tx.sessionPriceHistory.findMany({
        where: {
          sessionId,
          OR: [
            {
              // Precios que inician antes pero no tienen fecha de fin (vigentes)
              effectiveFrom: { lte: effectiveFrom },
              effectiveTo: null
            },
            {
              // Precios que se solapan con la nueva fecha
              effectiveFrom: { lte: effectiveFrom },
              effectiveTo: { gt: effectiveFrom }
            }
          ]
        }
      });

      // Ajustar precios conflictivos
      if (conflictingPrices.length > 0) {
        // Cerrar el precio vigente actual para que termine justo antes del nuevo
        await tx.sessionPriceHistory.updateMany({
          where: {
            sessionId,
            effectiveTo: null,
            effectiveFrom: { lt: effectiveFrom }
          },
          data: { effectiveTo: effectiveFrom }
        });

        // Si hay otros precios programados que se solapan, eliminarlos
        await tx.sessionPriceHistory.deleteMany({
          where: {
            sessionId,
            effectiveFrom: { gte: effectiveFrom },
            effectiveTo: { not: null }
          }
        });
      }

      // Crear el nuevo precio programado
      await tx.sessionPriceHistory.create({
        data: {
          sessionId,
          amount: newAmount,
          effectiveFrom,
          effectiveTo: null
        }
      });

      this.logger.log(`Price change scheduled successfully for session ${sessionId}`);
    });
  }

  /**
   * Obtiene el cronograma completo de precios de una sesión
   * @param sessionId ID de la sesión
   * @returns Cronograma de precios con precio actual y historial
   */
  async getSessionPriceSchedule(sessionId: string) {
    this.logger.log(`Getting price schedule for session ${sessionId}`);

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        priceHistories: {
          orderBy: { effectiveFrom: 'asc' }
        }
      }
    });

    if (!session) {
      throw new NotFoundException('Sesión no encontrada');
    }

    const now = new Date();
    const currentPriceHistory = session.priceHistories.find(ph =>
      ph.effectiveFrom <= now && (!ph.effectiveTo || ph.effectiveTo > now)
    );

    return {
      sessionId: session.id,
      currentPrice: currentPriceHistory?.amount || session.amount || 0,
      fallbackPrice: session.amount,
      priceHistory: session.priceHistories.map(ph => ({
        id: ph.id,
        amount: ph.amount,
        effectiveFrom: ph.effectiveFrom,
        effectiveTo: ph.effectiveTo,
        isCurrent: ph.effectiveFrom <= now && (!ph.effectiveTo || ph.effectiveTo > now),
        isPending: ph.effectiveFrom > now
      }))
    };
  }

  /**
   * Actualiza inmediatamente el precio de una sesión
   * @param sessionId ID de la sesión
   * @param newAmount Nuevo monto
   */
  async updateSessionPriceImmediate(sessionId: string, newAmount: number) {
    this.logger.log(`Updating immediate price for session ${sessionId}: ${newAmount}`);

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      // Verificar que la sesión existe
      const session = await tx.session.findUnique({ where: { id: sessionId } });
      if (!session) {
        throw new NotFoundException('Sesión no encontrada');
      }

      // Cerrar el precio anterior (si existe)
      await tx.sessionPriceHistory.updateMany({
        where: {
          sessionId,
          effectiveTo: null,          // solo el registro "vigente"
        },
        data: { effectiveTo: now },
      });

      // Crear el nuevo registro de precio
      await tx.sessionPriceHistory.create({
        data: {
          sessionId,
          amount: newAmount,
          effectiveFrom: now,
          effectiveTo: null,
        },
      });

      // Actualizar el campo Session.amount como fallback
      await tx.session.update({
        where: { id: sessionId },
        data: { amount: newAmount },
      });

      this.logger.log(`Price updated immediately for session ${sessionId}`);
    });
  }

  async deactivateExpiredActives(): Promise<number> {
    const now = new Date();
    const { count } = await this.prisma.session.updateMany({
      where: {
        isActive: true,
        endDate: { lt: now, not: null },
      },
      data: { isActive: false },
    });
    return count;
  }

  /**
   * Obtiene las facturas de todos los asistentes de una sesión para un mes/año específico
   * @param sessionId ID de la sesión
   * @param month Mes (01-12)
   * @param year Año (YYYY)
   * @returns Información de la sesión y estado de facturas de cada asistente
   */
  async getInvoicesByMonth(sessionId: string, month: string, year: string) {
    this.logger.log(`Getting invoices for session ${sessionId}, month: ${month}, year: ${year}`);

    // 1. Verificar que la sesión existe y obtener sus datos básicos
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        assistants: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Sesión no encontrada');
    }

    // 2. Construir el rango de fechas para el mes solicitado
    const startOfMonth = dayjs(`${year}-${month}-01`, 'YYYY-MM-DD')
      .startOf('month')
      .toDate();
    const endOfMonth = dayjs(`${year}-${month}-01`, 'YYYY-MM-DD')
      .endOf('month')
      .toDate();

    // 3. Buscar todas las facturas de esta sesión en ese mes
    const invoices = await this.prisma.invoice.findMany({
      where: {
        sessionId,
        dateInvoice: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      select: {
        id: true,
        userId: true,
        status: true,
        amount: true,
      },
    });

    // 4. Crear un mapa de userId -> invoice para búsqueda rápida
    const invoiceMap = new Map(
      invoices.map((inv) => [
        inv.userId,
        {
          id: inv.id,
          status: inv.status,
          amount: inv.amount,
        },
      ])
    );

    // 5. Construir el array de asistentes con su información de factura
    const assistants = session.assistants.map((assistant) => {
      const invoice = invoiceMap.get(assistant.id);
      
      return {
        id: assistant.id,
        name: assistant.name,
        hasInvoice: !!invoice,
        invoiceStatus: invoice?.status ?? null,
        invoiceId: invoice?.id ?? null,
        amount: invoice?.amount ?? null,
      };
    });

    // 6. Construir la respuesta
    return {
      sessionId: session.id,
      sessionCustomId: session.customId,
      sessionDescription: session.description,
      sessionType: session.type,
      month,
      year,
      assistants,
    };
  }
}

export type ResponseAttendeesSnapshot = {
  dateRange: {
    start: Date;
    end: Date;
  };
  instructors: { id: string; name: string; }[];
  assistants: { id: string; name: string; }[];
  attendance: { id: string; name: string; }[];
}

type UserSession = {
  id: string;
  customId: string | null;
  name: string;
  role: $Enums.UserRole;
}

