import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionsService } from '../sessions/sessions.service';
import { UserService } from '~/user/user.service';

@Injectable()
export class SubscriptionsService {
  private logger = new Logger(SubscriptionsService.name);
  constructor(
    private prismaService: PrismaService,
    private sessionsService: SessionsService,
    private userService: UserService,
  ) { }

  /**
   * Suscribe un usuario a una sesión como asistente
   * @param userId ID del usuario
   * @param sessionId ID de la sesión
   * @returns información de la inscripción
   */
  async subscribeUserToSession(userId: string, sessionId: string) {
    try {
      this.logger.log(`Subscribing user ${userId} to session ${sessionId}`);

      const session = await this.sessionsService.findById(sessionId);
      const user = await this.userService.findById(userId);
      
      if (!session || !user) {
        this.logger.warn(`Session or user not found (userId: ${userId}, sessionId: ${sessionId})`);
        throw new BadRequestException('Usuario o sesión no encontrados');
      }

      // Verificar si el usuario ya es asistente de esta sesión
      const isAlreadyAssistant = session?.assistants.some(assistant => assistant.id === userId);
      
      if (isAlreadyAssistant) {
        this.logger.warn(`User ${userId} is already an assistant in session ${sessionId}`);
        throw new BadRequestException('El usuario ya es asistente en esta sesión');
      }

      // Agregar el usuario como asistente a la sesión
      const updatedSession = await this.prismaService.session.update({
        where: { id: sessionId },
        data: {
          assistants: {
            connect: { id: userId }
          }
        },
        include: {
          assistants: true
        }
      });

      return {
        message: 'Usuario suscrito exitosamente',
        sessionId: sessionId,
        userId: userId,
        sessionDescription: session?.description
      };

    } catch (error: any) {
      // Si es una excepción HTTP específica, no la transformamos
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        this.logger.error(`Error subscribing user ${userId} to session ${sessionId}: ${error.message}`);
        throw error;
      }

      // Solo para errores no controlados
      this.logger.error(`Unexpected error subscribing user ${userId} to session ${sessionId}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al suscribir al usuario');
    }
  }

  /**
   * Desuscribe un usuario de una sesión
   * @param userId ID del usuario
   * @param sessionId ID de la sesión
   */
  async unsubscribeUserFromSession(userId: string, sessionId: string) {
    try {
      this.logger.log(`Unsubscribing user ${userId} from session ${sessionId}`);

      const session = await this.sessionsService.findById(sessionId);
      
      if (!session) {
        this.logger.warn(`Session not found: ${sessionId}`);
        throw new BadRequestException('Sesión no encontrada');
      }

      // Verificar si el usuario es asistente de esta sesión
      const isAssistant = session.assistants.some(assistant => assistant.id === userId);
      
      if (!isAssistant) {
        this.logger.warn(`User ${userId} is not an assistant in session ${sessionId}`);
        throw new BadRequestException('El usuario no es asistente en esta sesión');
      }

      // Remover el usuario como asistente de la sesión
      await this.prismaService.session.update({
        where: { id: sessionId },
        data: {
          assistants: {
            disconnect: { id: userId }
          }
        }
      });

      return {
        message: 'Usuario desuscrito exitosamente',
        sessionId: sessionId,
        userId: userId
      };

    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        this.logger.error(`Error unsubscribing user ${userId} from session ${sessionId}: ${error.message}`);
        throw error;
      }

      this.logger.error(`Unexpected error unsubscribing user ${userId} from session ${sessionId}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al desuscribir al usuario');
    }
  }

  /**
   * Obtiene todas las sesiones en las que un usuario es asistente
   * @param userId ID del usuario
   */
  async getUserSessions(userId: string) {
    try {
      this.logger.log(`Getting sessions for user ${userId}`);
      
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
        include: {
          assistantSessions: {
            include: {
              instructors: true,
              dates: true
            }
          }
        }
      });

      if (!user) {
        throw new BadRequestException('Usuario no encontrado');
      }

      return user.assistantSessions;
    } catch (error: any) {
      this.logger.error(`Error getting sessions for user ${userId}: ${error.message}`);
      throw new InternalServerErrorException('Error al obtener las sesiones del usuario');
    }
  }
}
