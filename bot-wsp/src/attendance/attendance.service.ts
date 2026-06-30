import { Injectable, Logger } from '@nestjs/common';
import { AccessLog, LogDirection } from '@prisma/client';
import dayjs from 'dayjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttendanceService {
  private logger = new Logger(AttendanceService.name);
  constructor(private prisma: PrismaService) { }


  /**
     * Registra un ingreso o egreso alternando según el último registro del día.
     */
  async logAccess(userId: string): Promise<AccessLog> {
    const startOfDay = dayjs().startOf('day').toDate();
    const endOfDay = dayjs().endOf('day').toDate();
    const timestamp = new Date();

    // 2) Buscamos el último log de hoy
    const lastLog = await this.prisma.accessLog.findFirst({
      where: {
        userId,
        timestamp: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    // 3) Inferimos la dirección
    const direction: LogDirection =
      lastLog?.direction === LogDirection.INGRESS
        ? LogDirection.EGRESS
        : LogDirection.INGRESS;

    // 4) Creamos el registro
    const accesLog = await this.prisma.accessLog.create({
      data: { userId, direction, timestamp },
    });

    // 5) Si es un INGRESS, intentar marcar asistencia automáticamente
    if (direction === LogDirection.INGRESS) {
      await this.autoMarkAttendance(userId, timestamp);
    }

    return accesLog
  }

  /**
   * Marca automáticamente la asistencia cuando un usuario hace INGRESS.
   * Busca sesiones activas (como asistente o instructor) dentro de una ventana de ±1 hora.
   * @param userId ID del usuario
   * @param timestamp Momento del ingreso
   */
  private async autoMarkAttendance(userId: string, timestamp: Date): Promise<void> {
    try {
      // Ventana de ±1 hora
      const oneHourBefore = dayjs(timestamp).subtract(1, 'hour').toDate();
      const oneHourAfter = dayjs(timestamp).add(1, 'hour').toDate();

      // Buscar snapshots activos donde:
      // 1. El dateRange.start <= oneHourAfter
      // 2. El dateRange.end >= oneHourBefore
      // 3. El usuario es asistente o instructor de la sesión
      const candidateSnapshots = await this.prisma.sessionDateSnapshot.findMany({
        where: {
          isActive: true,
          dateRange: {
            start: { lte: oneHourAfter },
            end: { gte: oneHourBefore }
          },
          session: {
            OR: [
              { assistants: { some: { id: userId } } },
              { instructors: { some: { id: userId } } }
            ]
          }
        },
        include: {
          session: {
            include: {
              assistants: { where: { id: userId }, select: { id: true } },
              instructors: { where: { id: userId }, select: { id: true } }
            }
          },
          presentAssistants: { where: { id: userId }, select: { id: true } },
          presentInstructors: { where: { id: userId }, select: { id: true } }
        }
      });

      if (candidateSnapshots.length === 0) {
        this.logger.log(`No active snapshots found for user ${userId} within ±1 hour window`);
        return;
      }

      // Marcar en cada snapshot encontrado
      for (const snapshot of candidateSnapshots) {
        const isAlreadyMarked = 
          snapshot.presentAssistants.length > 0 || 
          snapshot.presentInstructors.length > 0;

        if (isAlreadyMarked) {
          this.logger.log(`User ${userId} already marked in snapshot ${snapshot.id} - skipping`);
          continue;
        }

        // Determinar si es instructor o asistente en esta sesión
        const isInstructor = snapshot.session.instructors.length > 0;
        const isAssistant = snapshot.session.assistants.length > 0;

        if (isInstructor) {
          await this.prisma.sessionDateSnapshot.update({
            where: { id: snapshot.id },
            data: {
              presentInstructors: {
                connect: { id: userId }
              }
            }
          });
          this.logger.log(`Auto-marked user ${userId} as instructor in snapshot ${snapshot.id}`);
        } else if (isAssistant) {
          await this.prisma.sessionDateSnapshot.update({
            where: { id: snapshot.id },
            data: {
              presentAssistants: {
                connect: { id: userId }
              }
            }
          });
          this.logger.log(`Auto-marked user ${userId} as assistant in snapshot ${snapshot.id}`);
        }
      }

    } catch (error: any) {
      this.logger.error(`Error in autoMarkAttendance for user ${userId}: ${error.message}`, error.stack);
      // No lanzamos el error para no interrumpir el flujo del logAccess
    }
  }

  /**
 * Obtiene los últimos N registros de acceso de un usuario.
 * @param userId ID del usuario
 * @param limit  Número máximo de registros a devolver (por defecto 5)
 */
  async getLastAccesses(
    userId: string,
    limit = 5,
  ): Promise<AccessLog[]> {
    return this.prisma.accessLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  async attendanceSnapshotSession(userId: string) {
    const lastAccesses = await this.getLastAccesses(userId);
    // Aquí puedes agregar lógica adicional para crear un snapshot de la asistencia
    return lastAccesses;
  }

  /**
   * Obtiene todos los registros de acceso de un usuario en una fecha específica
   * @param userId ID del usuario
   * @param date Fecha en formato ISO string
   * @returns Objeto con información del usuario y sus registros de acceso
   */
  async getAccessLogsByDate(userId: string, date: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const targetDate = dayjs(date);
    const startOfDay = targetDate.startOf('day').toDate();
    const endOfDay = targetDate.endOf('day').toDate();

    const accessLogs = await this.prisma.accessLog.findMany({
      where: {
        userId,
        timestamp: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      orderBy: { timestamp: 'asc' }
    });

    return {
      userId: user.id,
      name: user.name,
      accessLogs
    };
  }

  async updateAttendanceSnapshot(userId: string, snapShotId: string) {
    try {

      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new Error(`User not found`);
      }
      const snapshot = await this.prisma.sessionDateSnapshot.findUnique({ where: { id: snapShotId } });

      if (!snapshot) {
        throw new Error(`Snapshot not found`);
      }

      const updatedSnapshot = await this.prisma.sessionDateSnapshot.update({
        where: { id: snapShotId },
        data: {
          presentAssistants: {
            connect: {
              id: userId
            }
          }
        },
      });

      return !!updatedSnapshot;
    }
    catch (error: any) {
      this.logger.error(`Error updating attendance snapshot: ${error.message}`);
      throw new Error(`Error updating attendance snapshot: ${error.message}`);

    }
  }

  /**
   * Marca la asistencia de un usuario en un snapshot específico
   * @param userId ID del usuario
   * @param snapshotId ID del snapshot de sesión
   * @returns Objeto con el estado de la operación
   */
  async markAttendance(userId: string, snapshotId: string) {
    try {
      // Verificar que el usuario existe
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, role: true }
      });

      if (!user) {
        this.logger.warn(`Attempt to mark attendance for non-existent user: ${userId}`);
        throw new Error('User not found');
      }

      // Verificar que el snapshot existe y obtener información de asistentes presentes
      const snapshot = await this.prisma.sessionDateSnapshot.findUnique({
        where: { id: snapshotId },
        include: {
          presentAssistants: { select: { id: true } },
          presentInstructors: { select: { id: true } }
        }
      });

      if (!snapshot) {
        this.logger.warn(`Attempt to mark attendance for non-existent snapshot: ${snapshotId}`);
        throw new Error('Snapshot not found');
      }

      // Verificar si el usuario ya está marcado como presente
      const isAssistantPresent = snapshot.presentAssistants.some(a => a.id === userId);
      const isInstructorPresent = snapshot.presentInstructors.some(i => i.id === userId);
      const isAlreadyMarked = isAssistantPresent || isInstructorPresent;

      if (isAlreadyMarked) {
        this.logger.log(`User ${userId} already marked as present in snapshot ${snapshotId} - idempotent behavior`);
        return {
          status: 'marked',
          userId,
          snapshotId,
          message: 'User already marked as present',
          alreadyMarked: true
        };
      }

      // Determinar si es instructor o asistente basado en el rol
      if (user.role === 'INSTRUCTOR' || user.role === 'ADMIN') {
        await this.prisma.sessionDateSnapshot.update({
          where: { id: snapshotId },
          data: {
            presentInstructors: {
              connect: { id: userId }
            }
          }
        });
        this.logger.log(`Instructor ${userId} marked as present in snapshot ${snapshotId}`);
      } else {
        await this.prisma.sessionDateSnapshot.update({
          where: { id: snapshotId },
          data: {
            presentAssistants: {
              connect: { id: userId }
            }
          }
        });
        this.logger.log(`Assistant ${userId} marked as present in snapshot ${snapshotId}`);
      }

      return {
        status: 'marked',
        userId,
        snapshotId,
        message: 'Attendance marked successfully',
        alreadyMarked: false
      };

    } catch (error: any) {
      this.logger.error(`Error marking attendance: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Desmarca la asistencia de un usuario en un snapshot específico
   * @param userId ID del usuario
   * @param snapshotId ID del snapshot de sesión
   * @returns Objeto con el estado de la operación
   */
  async unmarkAttendance(userId: string, snapshotId: string) {
    try {
      // Verificar que el usuario existe
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, role: true }
      });

      if (!user) {
        this.logger.warn(`Attempt to unmark attendance for non-existent user: ${userId}`);
        throw new Error('User not found');
      }

      // Verificar que el snapshot existe y obtener información de asistentes presentes
      const snapshot = await this.prisma.sessionDateSnapshot.findUnique({
        where: { id: snapshotId },
        include: {
          presentAssistants: { select: { id: true } },
          presentInstructors: { select: { id: true } }
        }
      });

      if (!snapshot) {
        this.logger.warn(`Attempt to unmark attendance for non-existent snapshot: ${snapshotId}`);
        throw new Error('Snapshot not found');
      }

      // Verificar si el usuario está marcado como presente
      const isAssistantPresent = snapshot.presentAssistants.some(a => a.id === userId);
      const isInstructorPresent = snapshot.presentInstructors.some(i => i.id === userId);
      const isMarked = isAssistantPresent || isInstructorPresent;

      if (!isMarked) {
        this.logger.log(`User ${userId} not marked as present in snapshot ${snapshotId} - idempotent behavior`);
        return {
          status: 'unmarked',
          userId,
          snapshotId,
          message: 'User was not marked as present',
          wasMarked: false
        };
      }

      // Desconectar de la relación correspondiente usando set con el array filtrado
      if (isInstructorPresent) {
        const remainingInstructors = snapshot.presentInstructors
          .filter(i => i.id !== userId)
          .map(i => ({ id: i.id }));

        await this.prisma.sessionDateSnapshot.update({
          where: { id: snapshotId },
          data: {
            presentInstructors: {
              set: remainingInstructors
            }
          }
        });
        this.logger.log(`Instructor ${userId} unmarked from snapshot ${snapshotId}`);
      } else {
        const remainingAssistants = snapshot.presentAssistants
          .filter(a => a.id !== userId)
          .map(a => ({ id: a.id }));

        await this.prisma.sessionDateSnapshot.update({
          where: { id: snapshotId },
          data: {
            presentAssistants: {
              set: remainingAssistants
            }
          }
        });
        this.logger.log(`Assistant ${userId} unmarked from snapshot ${snapshotId}`);
      }

      return {
        status: 'unmarked',
        userId,
        snapshotId,
        message: 'Attendance unmarked successfully',
        wasMarked: true
      };

    } catch (error: any) {
      this.logger.error(`Error unmarking attendance: ${error.message}`, error.stack);
      throw error;
    }
  }
}
