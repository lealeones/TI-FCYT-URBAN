import {
  Controller,
  Get,
  Post,
  Res,
  UseGuards,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
  UseInterceptors,
  UploadedFile,
  BadRequestException
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { BackupService } from './backup.service';
import { AuthTokenGuard } from '~/common/guards/auth-token.guard';
import { User } from '~/common/decoratos/user.decorator';
import { AuthUser } from '~/common/types';
import { UserRole } from '@prisma/client';
import * as fs from 'fs';
import { AuthService, TokenRedirectURL } from '~/auth/auth.service';

@Controller('backup')
@UseGuards(AuthTokenGuard)
export class BackupController {
  private readonly logger = new Logger(BackupController.name);

  constructor(
    private readonly backupService: BackupService,
    private readonly authService: AuthService
  ) { }

  @Get('download')
  async downloadBackup(
    @User() user: AuthUser,
    @Res() res: Response,
  ): Promise<void> {
    // Solo administradores pueden descargar backups
    if (user?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Solo los administradores pueden descargar backups');
    }

    let backupInfo: { filePath: string; fileName: string } | null = null;

    try {
      this.logger.log(`Admin ${user.id} solicitó backup de la base de datos`);

      // Limpiar backups antiguos antes de crear uno nuevo
      await this.backupService.cleanupOldBackups();

      // Crear el backup
      backupInfo = await this.backupService.createBackup();

      // Verificar que el archivo existe
      if (!fs.existsSync(backupInfo.filePath)) {
        throw new Error('El archivo de backup no se encontró');
      }

      const stats = fs.statSync(backupInfo.filePath);

      // Configurar headers para la descarga
      res.setHeader('Content-Type', 'application/sql');
      res.setHeader('Content-Disposition', `attachment; filename="${backupInfo.fileName}"`);
      res.setHeader('Content-Length', stats.size);

      // Crear stream para enviar el archivo
      const fileStream = fs.createReadStream(backupInfo.filePath);

      // Manejar errores del stream
      fileStream.on('error', (error) => {
        this.logger.error('Error leyendo archivo de backup:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error al leer el archivo de backup' });
        }
      });

      // Enviar el archivo
      fileStream.pipe(res);

      // Limpiar el archivo después de enviarlo
      fileStream.on('end', () => {
        if (backupInfo) {
          this.logger.log(`Backup enviado exitosamente: ${backupInfo.fileName}`);
          // Eliminar el archivo después de un pequeño delay para asegurar que se envió completamente
          setTimeout(() => {
            this.backupService.deleteBackupFile(backupInfo!.filePath);
          }, 1000);
        }
      });

    } catch (error: any) {
      this.logger.error('Error generando o enviando backup:', error.message);

      // Limpiar archivo si se creó pero hubo error
      if (backupInfo?.filePath) {
        this.backupService.deleteBackupFile(backupInfo.filePath);
      }

      if (!res.headersSent) {
        throw new InternalServerErrorException('Error al generar el backup de la base de datos');
      }
    }
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('backup', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = path.join(process.cwd(), 'tmp');
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `restore-${timestamp}-${file.originalname}`;
          cb(null, filename);
        },
      }),
      fileFilter: (req, file, cb) => {
        // Solo permitir archivos .sql
        if (file.mimetype === 'application/sql' ||
          file.originalname.endsWith('.sql') ||
          file.mimetype === 'text/plain') {
          cb(null, true);
        } else {
          cb(new BadRequestException('Solo se permiten archivos .sql'), false);
        }
      },
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB máximo
      },
    })
  )
  async uploadBackup(
    @UploadedFile() file: Express.Multer.File,
    @User() user: AuthUser,
  ) {
    // Solo administradores pueden restaurar backups
    if (user?.role && user?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Solo los administradores pueden restaurar backups');
    }

    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    try {
      this.logger.log(`Admin ${user?.id} subió backup: ${file.originalname} (${file.size} bytes)`);

      const result = await this.backupService.restoreBackup(file.path, file.originalname);

      // El usuario actual puede no existir en el backup restaurado (si el backup es de un
      // estado anterior)
      let urlCallback = `${process.env.BACKEND_URL ?? ''}/auth/init`;
      try {
        const token = await this.authService.generarToken(user?.id, TokenRedirectURL.FRONT);
        urlCallback = `${process.env.URL_FRONT}?t=${token}`;
      } catch {
        this.logger.warn('El usuario actual no existe en el backup restaurado. Redirigiendo a /auth/init.');
      }

      return {
        success: true,
        message: 'Backup restaurado exitosamente',
        urlCallback,
        details: result,
        timestamp: new Date().toISOString(),
      };

    } catch (error: any) {
      this.logger.error('Error restaurando backup:', error.message);

      // Limpiar archivo en caso de error
      this.backupService.deleteBackupFile(file.path);

      throw new InternalServerErrorException('Error al restaurar el backup');
    }
  }

  @Get('status')
  async getBackupStatus(@User() user: AuthUser) {
    // Solo administradores pueden ver el estado
    if (user?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Solo los administradores pueden ver el estado de backups');
    }

    return {
      message: 'Servicio de backup disponible',
      timestamp: new Date().toISOString(),
      databaseUrl: process.env.DATABASE_URL ? 'Configurado' : 'No configurado',
    };
  }

  @Post('validate')
  @UseInterceptors(
    FileInterceptor('backup', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = path.join(process.cwd(), 'tmp');
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `validate-${timestamp}-${file.originalname}`;
          cb(null, filename);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/sql' ||
          file.originalname.endsWith('.sql') ||
          file.mimetype === 'text/plain') {
          cb(null, true);
        } else {
          cb(new BadRequestException('Solo se permiten archivos .sql'), false);
        }
      },
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB máximo
      },
    })
  )
  async validateBackupFile(
    @UploadedFile() file: Express.Multer.File,
    @User() user: AuthUser,
  ) {
    // Solo administradores pueden validar backups
    if (user?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Solo los administradores pueden validar backups');
    }

    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    try {
      const isValid = await this.backupService.validateBackupFile(file.path);

      return {
        valid: isValid.valid,
        message: isValid.message,
        details: isValid.details,
      };

    } catch (error: any) {
      throw new BadRequestException('Error al validar el archivo');
    } finally {
      // Siempre limpiar el archivo de validación
      this.backupService.deleteBackupFile(file.path);
    }
  }
}