import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardUser } from './dto/dashboard.dto';
import { AuthUser } from '../common/types';
import { LogDirection, UserRole } from '@prisma/client';
import dayjs from 'dayjs';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) { }

  async getDashboard(user: AuthUser): Promise<DashboardUser> {
    const now = dayjs().startOf('day').toDate()  //new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    //NOTE Primer INGRESS de hoy (inicio del día)
    const currentAccess = await this.prisma.accessLog.findFirst({
      where: {
        userId: user.id,
        direction: LogDirection.INGRESS,
        timestamp: { gte: start, lte: end },
      },
      orderBy: { timestamp: 'asc' },
    });

    const previousIngress = await this.prisma.accessLog.findFirst({
      where: {
        userId: user.id,
        direction: LogDirection.INGRESS,
        timestamp: currentAccess
          ? { lt: currentAccess.timestamp } // anterior al primer INGRESS de hoy
          : { lt: start },                  // si hoy no hubo, el último antes de hoy
      },
      orderBy: { timestamp: 'desc' },       // el más reciente anterior
    });


    const nextSessions = await this.prisma.sessionDateSnapshot.findMany({
      where: {
        session: { isActive: true },
        AND: {
          dateRange: { start: { gte: now } },
          session: {
            ...(user.role === UserRole.INSTRUCTOR ? { instructors: { some: { id: user.id } } } : {}),
          }
        }
      },
      orderBy: { dateRange: { start: 'asc' } },
      take: 10,
      select: {
        id: true,
        dateRange: { select: { start: true } },
        session: {
          select: {
            id: true,
            description: true,
            instructors: { select: { name: true } },
          },
        },
      },
    });

    // Calcular sesiones activas e inactivas
    const sessionsFilter = user.role === UserRole.INSTRUCTOR 
      ? { instructors: { some: { id: user.id } } } 
      : {};

    const [activeSessions, inactiveSessions] = await Promise.all([
      this.prisma.session.count({
        where: { isActive: true, ...sessionsFilter }
      }),
      this.prisma.session.count({
        where: { isActive: false, ...sessionsFilter }
      })
    ]);

    // Calcular usuarios activos e inactivos (solo para admin)
    let usersData = { total: 0, active: 0, inactive: 0 };
    if (user.role !== UserRole.INSTRUCTOR) {
      const [activeUsers, inactiveUsers] = await Promise.all([
        this.prisma.user.count({ where: { deleted: null } }),
        this.prisma.user.count({ where: { deleted: { not: null } } })
      ]);
      usersData = {
        total: activeUsers + inactiveUsers,
        active: activeUsers,
        inactive: inactiveUsers
      };
    }

    // Contar asistentes en sesiones activas
    const assistantsCount = user.role === UserRole.INSTRUCTOR 
      ? await this.prisma.user.count({
          where: {
            assistantSessions: {
              some: {
                isActive: true,
                instructors: { some: { id: user.id } }
              }
            }
          }
        })
      : await this.prisma.user.count({
          where: {
            assistantSessions: {
              some: { isActive: true }
            }
          }
        });

    // Calcular facturas del mes actual: total, pagadas y adeudadas
    const startOfMonth = dayjs().startOf('month').toDate();
    const endOfMonth = dayjs().endOf('month').toDate();

    const [totalInvoices, paidInvoices, pendingInvoices] = await Promise.all([
      // Total de facturas del mes
      this.prisma.invoice.count({
        where: {
          dateInvoice: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        }
      }),
      // Facturas pagadas (PAID o CANCELED)
      this.prisma.invoice.count({
        where: {
          dateInvoice: {
            gte: startOfMonth,
            lte: endOfMonth
          },
          status: {
            in: ['PAID', 'CANCELED']
          }
        }
      }),
      // Facturas adeudadas (PENDING)
      this.prisma.invoice.count({
        where: {
          dateInvoice: {
            gte: startOfMonth,
            lte: endOfMonth
          },
          status: 'PENDING'
        }
      })
    ]);

    const reponse: DashboardUser = {
      message: 'OK',
      accessLog: {
        currentAccess: currentAccess?.timestamp ? currentAccess.timestamp.toISOString() : 'Sin registro',
        lastAccess: previousIngress?.timestamp ? previousIngress.timestamp.toISOString() : 'Sin registro',
      },
      cardDetails: {
        sessions: {
          total: activeSessions + inactiveSessions,
          active: activeSessions,
          inactive: inactiveSessions
        },
        users: usersData,
        assistants: assistantsCount,
        invoices: {
          total: totalInvoices,
          paid: paidInvoices,
          pending: pendingInvoices
        },
        revenue: 0, // TODO: sumarizar desde tu tabla de pagos/suscripciones
      },
      sessions: nextSessions.map(snapshot => ({
        id: snapshot.id,
        description: snapshot.session.description,
        instructors: snapshot.session.instructors.map(i => i.name).join(', '),
        startDate: snapshot.dateRange.start.toISOString(),
      })),
    };

    return reponse;
  }

}
