import { ConflictException, ForbiddenException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, User, UserRole } from '@prisma/client';
import { CustomIdService } from '../custom-id/custom-id.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpsertUserDto, UserDataUpdate, UserFilter } from './user.dto.js';
import { NotFoundError } from 'rxjs';


@Injectable()
export class UserService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly customIdService: CustomIdService
  ) { }
  private readonly logger = new Logger(UserService.name);

  async findById(id: string): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({ where: { id } });
    } catch (error: any) {
      this.logger.error(`Error al buscar usuario por id: ${id}`, error);
      throw new NotFoundException('Usuario no encontrado');
    }
  }

  async upsert(dto: UpsertUserDto) {
    this.logger.log(`Iniciando upsert de usuario: ${JSON.stringify(dto)}`);
    const id = dto.id ?? undefined;
    const customId = dto.customId?.trim() || undefined;

    const where = id ? { id } : null;

    const base = {
      name: dto.name,
      dni: dto.dni ?? '',
      phone: dto.phone ?? '',
      rfid: dto.rfid ?? '',
      birth: dto.birth ? new Date(dto.birth) : null,
      deleted: dto.deleted ? new Date(dto.deleted) : null,
      role: dto.role ?? UserRole.USER,
    } as const;

    try {
      if (!where) {
        return await this.prisma.user.create({
          data: {
            ...base,
            customId: customId ?? '',
          },
        });
      }

      const exists = await this.prisma.user.findUnique({ where });
      if (exists) {
        return await this.prisma.user.update({
          where,
          data: {
            ...base,
            ...(customId !== undefined ? { customId } : {}),
          },
        });
      } else {
        return await this.prisma.user.create({
          data: {
            ...base,
            customId: customId ?? '',
          },
        });
      }
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (
          error.code === 'P2002' &&
          String(error.meta?.target).includes('phone')
        ) {
          throw new ConflictException('El teléfono ya está registrado, debe ser único.');
        }
      }

      this.logger.error(`Error al realizar upsert del usuario: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error interno al guardar el usuario');
    }
  }


  async findAllProfesors(): Promise<User[]> {

    try {
      const profesors = await this.prisma.user.findMany({
        where: {
          role: UserRole.INSTRUCTOR,
        }
      })

      return profesors
    }
    catch (error: any) {
      this.logger.error('No pude listar los profesores', error);
      throw new InternalServerErrorException('No pude listar los profesores');

    }
  }
  async findByPhone(phone: string): Promise<User | null> {
    try {
      if (!phone) return null;

      // Debe empezar con 549 (Argentina)
      if (!phone.startsWith('549')) {
        this.logger.error(`El número no empieza con 549 (Argentina): ${phone}`);
        return null;
      }

      const normalized = phone.replace(/^549/, '');

      return await this.prisma.user.findFirst({
        where: { phone: { equals: normalized, mode: 'insensitive' } },
      });
    } catch (err) {
      this.logger.error(`No pude encontrar usuario con teléfono ${phone}`, err);
      return null;
    }
  }

  async findByRfid(rfid: string): Promise<User | null> {
    try {
      // Primero intentar encontrar usuarios con teléfono
      const userWithPhone = await this.prisma.user.findFirst({
        where: {
          rfid: { equals: rfid },
          phone: { not: '' }  // Que tengan teléfono (no vacío)
        },
        orderBy: { createdAt: 'desc' }
      });

      if (userWithPhone) {
        return userWithPhone;
      }
      this.logger.log({
        action: 'findByRfid',
        message: `No se encontró usuario con RFID ${rfid} que tenga teléfono registrado.`
      });
      // Si no hay ninguno con teléfono, devolver cualquiera con ese RFID
      return await this.prisma.user.findFirst({
        where: { rfid: { equals: rfid } },
        orderBy: { createdAt: 'desc' }
      });
    } catch (err) {
      this.logger.error(`No pude encontro usuario con RFID ${rfid}`, err);
      return null
    }
  }

  async getUserAdmin(): Promise<User | null> {
    try {
      this.logger.log('Buscando usuario administrador...');
      return await this.prisma.user.findFirst({
        where: { 
          role: { equals: UserRole.ADMIN },
          phone: { not: { in: [''] } }
        },
      });
    } catch (err) {
      this.logger.error('No pude encontrar el usuario administrador', err);
      return null
      //throw new InternalServerErrorException('No pude encontrar el usuario administrador');
    }
  }

  //NOTE Crea un usuario temporal con RFID
  async createUserTemporary(rfid: string): Promise<User> {
    try {
      const customId = await this.customIdService.generateCustomId('user', 'U')
      const name = `Desconocido ${customId}`

      return await this.prisma.user.create({
        data: {
          rfid,
          customId,
          name,
          role: UserRole.GUEST,
        },
      });
    }
    catch (err: any) {
      throw new InternalServerErrorException(`No pude crear el usuario temporal: ${err.message}`);
    }
  }

  async findByCustomId(customId: string): Promise<User | null> {
    try {
      this.logger.log(`Buscando usuario por customId: ${customId}`);
      return await this.prisma.user.findFirst({
        where: {
          customId: { equals: customId, mode: 'insensitive' } // Buscar por customId
        }
      });
    } catch (err) {
      this.logger.error(`No pude encontrar usuario con customId ${customId}`, err);
      return null;
    }
  }

  async deleteUser(customId: string): Promise<User> {
    try {
      const targetUser = await this.prisma.user.findFirst({
        where: {
          customId,
        },
      });
      if (!targetUser) {
        throw new InternalServerErrorException(`No se encontró un usuario con el customId: ${customId}`);
      }
      const updatedUser = await this.prisma.user.update({
        where: {
          id: targetUser.id,
        },
        data: {
          deleted: new Date(), // Marcar como eliminado
        },
      })
      return updatedUser
    }
    catch (error: any) {
      this.logger.error(`No pude eliminar el usuario con customId ${customId}`, error);
      throw new InternalServerErrorException(`No pude eliminar el usuario con customId ${customId}`);
    }
  }

  //Necesito buscar el usuario que esta haciendo la accion , con el currentUserId , cuando el usuario sea instructor , solo puede modificar el nombre y el teléfono

  async updateUserByCustomId(
    userData: UserDataUpdate,
    currentUserId?: string
  ): Promise<User> {
    try {
      /* 1️⃣ Obtener el usuario que está realizando la acción */
      const currentUser = await this.prisma.user.findUnique({
        where: { id: currentUserId },
      });

      if (!currentUser) {
        throw new InternalServerErrorException(
          `No se encontró el usuario que está realizando la acción (id: ${currentUserId})`
        );
      }

      /* 2️⃣ Buscar el usuario objetivo por customId */
      const targetUser = await this.prisma.user.findFirst({
        where: {
          customId: userData.customId,
        },
      });

      this.logger.log(
        `Actualizando usuario: ${targetUser?.name} por hash: ${userData.customId}`
      );

      if (!targetUser) {
        throw new InternalServerErrorException(
          `No se encontró un usuario con el hash: ${userData.customId}`
        );
      }

      /* 3️⃣ Definir los campos que el usuario actual puede modificar */
      const isInstructor =
        currentUser.role === UserRole.INSTRUCTOR;

      // Campos que cualquier usuario puede cambiar
      const instructorAllowed = ['name', 'phone'];

      // Si el que ejecuta la acción es instructor, restringimos a los
      // campos permitidos; de lo contrario, dejamos que modifique todo
      const allowedKeys: readonly string[] = isInstructor
        ? instructorAllowed
        : Object.keys(userData);

      /* 4️⃣ Validar que no se estén intentando actualizar campos no
         permitidos (solo para instructors) */
      const disallowed = Object.keys(userData).filter(
        (k) => !allowedKeys.includes(k as keyof UserDataUpdate)
      );

      if (disallowed.length > 0) {
        // Se lanza una excepción indicando falta de permisos
        throw new ForbiddenException(
          'no tienes permisos para actualizar estos campos'
        );
      }

      /* 5️⃣ Construir el objeto de datos a actualizar */
      const data: any = {};
      for (const key of allowedKeys) {
        const value = (userData as any)[key];
        if (value !== undefined) {
          data[key] = value;
        }
      }

      if (Object.keys(data).length === 0) {
        throw new InternalServerErrorException(
          'No se proporcionaron campos válidos para actualizar'
        );
      }

      /* 6️⃣ Ejecutar la actualización */
      return await this.prisma.user.update({
        where: { id: targetUser.id },
        data,
      });
    } catch (err) {
      this.logger.error('No pude actualizar el usuario por hash', err);
      throw new InternalServerErrorException(
        'No pude actualizar el usuario por hash'
      );
    }
  }

  async findAll(): Promise<User[]> {
    try {
      return await this.prisma.user.findMany();
    } catch (err) {
      // loggear o transformar el error
      throw new InternalServerErrorException('No pude listar usuarios');
    }
  }

  //TODO: implementar cuando se use IA
  async findUserWithNaturalFilters(filters: UserFilter) {
    const { nombre, birthdayMonth } = filters;

    let query = `SELECT * FROM "User" WHERE 1=1`;

    const params: any[] = [];

    if (nombre) {
      query += ` AND LOWER("name") LIKE LOWER($${params.length + 1})`;
      params.push(`%${nombre}%`);
    }

    if (birthdayMonth) {
      query += ` AND EXTRACT(MONTH FROM "birth") = $${params.length + 1}`;
      params.push(birthdayMonth);
    }

    const users = await this.prisma.$queryRawUnsafe<User[]>(query, ...params);


    return users;
  }





  //getInfoForProfessor
  async getInfoForProfessor(professorId: string): Promise<any> {

  }

  async toogleActivateUser(id: string, body: { deleted: Date | null }): Promise<User> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          deleted: body.deleted,
        },
      });
      return user;
    } catch (error: any) {
      this.logger.error(`No pude ${body.deleted ? 'activar' : 'desactivar'} el usuario con id ${id}`, error);
      throw new InternalServerErrorException(`No se pudo ${body.deleted ? 'activar' : 'desactivar'} el usuario`);
    }
  }

  /**
   * Actualiza la foto de perfil de un usuario si es necesario
   * @param userId ID del usuario
   * @param profilePictureBase64 Foto en base64
   * @param intervalDays Intervalo de días para actualizar (por defecto obtiene de config)
   * @returns true si se actualizó, false si no era necesario
   */
  async updateProfilePictureIfNeeded(
    userId: string,
    profilePictureBase64: string,
    intervalDays?: number
  ): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { profilePictureUpdatedAt: true }
      });

      if (!user) {
        this.logger.warn(`Usuario no encontrado para actualizar foto: ${userId}`);
        return false;
      }

      const now = new Date();
      const lastUpdate = user.profilePictureUpdatedAt;

      // Si nunca se actualizó, actualizar
      if (!lastUpdate) {
        this.logger.log(`Primera vez actualizando foto de perfil para usuario: ${userId}`);
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            profilePicture: profilePictureBase64,
            profilePictureUpdatedAt: now
          }
        });
        return true;
      }

      // Calcular días desde la última actualización
      const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
      const daysInterval = intervalDays ?? 2; // Por defecto 2 días

      // Si pasó el intervalo, actualizar
      if (daysSinceUpdate >= daysInterval) {
        this.logger.log(`Actualizando foto de perfil para usuario ${userId} (${daysSinceUpdate} días desde última actualización)`);
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            profilePicture: profilePictureBase64,
            profilePictureUpdatedAt: now
          }
        });
        return true;
      }

      this.logger.debug(`No es necesario actualizar foto de perfil para usuario ${userId} (solo ${daysSinceUpdate} días desde última actualización)`);
      return false;
    } catch (error: any) {
      this.logger.error(`Error actualizando foto de perfil para usuario ${userId}:`, error);
      return false;
    }
  }
}

type ResponseInfoProfessor = {
  //clases donde esta inscripto como profesor => Session[]
  //horas trabajadas de este mes => number
  //usuarios que asisten a sus clases => User[]

}