import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(private readonly prisma: PrismaService) {}

  private cleanDatabaseUrl(databaseUrl: string): string {
    try {
      const url = new URL(databaseUrl);
      // Remover parámetros de query que pg_dump no reconoce
      url.search = '';
      return url.toString();
    } catch (error) {
      // Si no es una URL válida, intentar limpiar manualmente
      return databaseUrl.split('?')[0];
    }
  }

  async createBackup(): Promise<{ filePath: string; fileName: string }> {
    try {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error('DATABASE_URL no está configurada');
      }

      // Limpiar la URL de parámetros que pg_dump no reconoce
      const cleanDatabaseUrl = this.cleanDatabaseUrl(databaseUrl);

      // Generar nombre único para el archivo
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `backup-${timestamp}.sql`;
      const backupDir = path.join(process.cwd(), 'tmp');
      const filePath = path.join(backupDir, fileName);

      // Crear directorio tmp si no existe
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Ejecutar pg_dump (instalado en el contenedor)
      this.logger.log('Iniciando backup de la base de datos...');
      
      const command = `pg_dump "${cleanDatabaseUrl}" -f "${filePath}"`;
      
      await execAsync(command);

      // Verificar que el archivo se creó correctamente
      if (!fs.existsSync(filePath)) {
        throw new Error('El archivo de backup no se creó correctamente');
      }

      const stats = fs.statSync(filePath);
      this.logger.log(`Backup creado exitosamente: ${fileName} (${stats.size} bytes)`);

      return { filePath, fileName };
    } catch (error: any) {
      this.logger.error('Error creando backup:', error.message);
      throw new InternalServerErrorException('Error al crear el backup de la base de datos');
    }
  }

  async restoreBackup(filePath: string, originalName: string): Promise<{ tablesRestored: string; fileSize: number }> {
    try {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error('DATABASE_URL no está configurada');
      }

      // Limpiar la URL de parámetros que psql no reconoce
      const cleanDatabaseUrl = this.cleanDatabaseUrl(databaseUrl);

      // Verificar que el archivo existe
      if (!fs.existsSync(filePath)) {
        throw new Error('Archivo de backup no encontrado');
      }

      const stats = fs.statSync(filePath);
      this.logger.log(`Iniciando restauración desde: ${originalName} (${stats.size} bytes)`);

      // DEBUG: Analizar contenido del backup
      await this.debugBackupContent(filePath);

      // **IMPORTANTE: Esto eliminará TODOS los datos actuales y desconectará la aplicación temporalmente**
      this.logger.log('Eliminando base de datos completa y recreando desde cero...');
      
      // Paso 1: Obtener el nombre de la base de datos de la URL
      const dbUrl = new URL(cleanDatabaseUrl);
      const dbName = dbUrl.pathname.substring(1); // Remover el "/"
      
      // Paso 2: Conectar a postgres (base de datos administrativa) para eliminar y recrear
      const adminUrl = cleanDatabaseUrl.replace(`/${dbName}`, '/postgres');
      
      // Paso 3: Terminar todas las conexiones activas a la base de datos (incluyendo la aplicación)
      this.logger.log(`⚠️  Terminando TODAS las conexiones a la base de datos ${dbName}...`);
      const terminateConnectionsCommand = `psql "${adminUrl}" -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${dbName}' AND pid <> pg_backend_pid();"`;
      
      try {
        const { stdout: terminated } = await execAsync(terminateConnectionsCommand);
        this.logger.log('Conexiones terminadas:', terminated.trim());
      } catch (error: any) {
        this.logger.warn('Error terminando conexiones (puede ser normal):', error.message);
      }
      
      // Paso 4: Esperar a que las conexiones se cierren
      this.logger.log('Esperando que las conexiones se cierren completamente...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Paso 5: Eliminar la base de datos actual
      this.logger.log(`🗑️  Eliminando base de datos ${dbName}...`);
      const dropCommand = `psql "${adminUrl}" -c "DROP DATABASE IF EXISTS \"${dbName}\";"`; 
      await execAsync(dropCommand);
      
      // Paso 6: Crear la base de datos nuevamente (vacía)
      this.logger.log(`🔨 Creando base de datos ${dbName} limpia...`);
      const createCommand = `psql "${adminUrl}" -c "CREATE DATABASE \"${dbName}\";"`; 
      await execAsync(createCommand);
      
      // Paso 7: Restaurar el backup completo en la base de datos limpia
      this.logger.log('📦 Restaurando backup completo en la nueva base de datos...');
      const restoreCommand = `psql "${cleanDatabaseUrl}" -f "${filePath}"`;
      
      const { stdout, stderr } = await execAsync(restoreCommand);
      
      // Paso 8: Verificar que TODAS las tablas fueron restauradas correctamente
      this.logger.log('Verificando que todas las tablas del schema fueron restauradas...');
      const verifyCommand = `psql "${cleanDatabaseUrl}" -c "
        SELECT 'User' as tabla, COUNT(*) as registros FROM \\"User\\"
        UNION ALL SELECT 'AccessLog', COUNT(*) FROM \\"AccessLog\\"
        UNION ALL SELECT 'Token', COUNT(*) FROM \\"Token\\"
        UNION ALL SELECT 'Session', COUNT(*) FROM \\"Session\\"
        UNION ALL SELECT 'SessionPriceHistory', COUNT(*) FROM \\"SessionPriceHistory\\"
        UNION ALL SELECT 'SessionDateRange', COUNT(*) FROM \\"SessionDateRange\\"
        UNION ALL SELECT 'SessionDateSnapshot', COUNT(*) FROM \\"SessionDateSnapshot\\"
        UNION ALL SELECT 'Invoice', COUNT(*) FROM \\"Invoice\\"
        UNION ALL SELECT 'SystemConfig', COUNT(*) FROM \\"SystemConfig\\"
        ORDER BY tabla;
      "`;
      
      try {
        const { stdout: verifyOutput } = await execAsync(verifyCommand);
        this.logger.log('✅ Verificación completa de todas las tablas:');
        this.logger.log(verifyOutput.trim());
      } catch (error: any) {
        this.logger.error('❌ Error en verificación de tablas:', error.message);
        throw new Error('La restauración no incluyó todas las tablas esperadas');
      }

      // Paso 9: Verificar integridad de relaciones many-to-many
      this.logger.log('Verificando tablas de relación many-to-many...');
      const verifyRelationsCommand = `psql "${cleanDatabaseUrl}" -c "
        SELECT 
          '_InstructorSessions' as relacion, COUNT(*) as registros 
        FROM \\"_InstructorSessions\\"
        UNION ALL 
        SELECT '_AssistantSessions', COUNT(*) 
        FROM \\"_AssistantSessions\\"
        UNION ALL
        SELECT '_PresentInstructorsOnDate', COUNT(*) 
        FROM \\"_PresentInstructorsOnDate\\"
        UNION ALL
        SELECT '_PresentAssistantsOnDate', COUNT(*) 
        FROM \\"_PresentAssistantsOnDate\\"
        UNION ALL
        SELECT '_SubstituteInstructorsOnDate', COUNT(*) 
        FROM \\"_SubstituteInstructorsOnDate\\";
      "`;
      
      try {
        const { stdout: relationsOutput } = await execAsync(verifyRelationsCommand);
        this.logger.log('✅ Verificación de relaciones many-to-many:');
        this.logger.log(relationsOutput.trim());
      } catch (error: any) {
        this.logger.warn('⚠️  Error verificando relaciones (puede ser normal si están vacías):', error.message);
      }

      // Extraer información del resultado
      const output = stdout + stderr;
      
      // Contar las operaciones procesadas con más detalle
      const createTableMatches = output.match(/CREATE TABLE/g) || [];
      const copyMatches = output.match(/COPY \d+/g) || [];
      const createIndexMatches = output.match(/CREATE INDEX/g) || [];
      const alterTableMatches = output.match(/ALTER TABLE/g) || [];
      
      this.logger.log(`📊 Resumen de operaciones completadas:`);
      this.logger.log(`- Tablas creadas: ${createTableMatches.length}`);
      this.logger.log(`- Operaciones COPY (datos): ${copyMatches.length}`);
      this.logger.log(`- Índices creados: ${createIndexMatches.length}`);
      this.logger.log(`- Constraints/FKs: ${alterTableMatches.length}`);
      
      // Verificar que tenemos al menos las 9 tablas principales + 5 tablas de relación
      const expectedMinTables = 14; // 9 modelos + 5 relaciones many-to-many
      if (createTableMatches.length < expectedMinTables) {
        this.logger.warn(`⚠️  Se esperaban al menos ${expectedMinTables} tablas, se encontraron ${createTableMatches.length}`);
      }
      
      if (output.includes('ERROR') || stderr.includes('ERROR')) {
        this.logger.error('❌ Se encontraron errores en la restauración:', stderr);
        throw new Error('La restauración completó con errores');
      }

      // Reconectar Prisma: el pool quedó roto porque se terminaron todas las
      // conexiones durante el DROP/CREATE DATABASE
      this.logger.log('🔌 Reconectando Prisma al nuevo estado de la base de datos...');
      await this.prisma.$disconnect();
      await this.prisma.$connect();
      this.logger.log('✅ Prisma reconectado exitosamente');

      // Limpiar archivo después de restaurar
      setTimeout(() => {
        this.deleteBackupFile(filePath);
      }, 1000);

      return {
        tablesRestored: `${createTableMatches.length} tablas, ${copyMatches.length} operaciones de datos`,
        fileSize: stats.size,
      };

    } catch (error: any) {
      this.logger.error('Error restaurando backup:', error.message);
      
      // Limpiar archivo en caso de error
      this.deleteBackupFile(filePath);
      
      throw new InternalServerErrorException('Error al restaurar el backup de la base de datos');
    }
  }

  async validateBackupFile(filePath: string): Promise<{ valid: boolean; message: string; details?: any }> {
    try {
      if (!fs.existsSync(filePath)) {
        return { valid: false, message: 'Archivo no encontrado' };
      }

      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        return { valid: false, message: 'El archivo está vacío' };
      }

      // Leer las primeras líneas del archivo para validar el formato
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const lines = fileContent.split('\n').slice(0, 20); // Primeras 20 líneas

      // Verificar que parece un dump de PostgreSQL
      const hasSQLHeader = lines.some(line => 
        line.includes('PostgreSQL database dump') || 
        line.includes('pg_dump') ||
        line.startsWith('--') ||
        line.includes('CREATE TABLE') ||
        line.includes('INSERT INTO') ||
        line.includes('COPY ')
      );

      if (!hasSQLHeader) {
        return { 
          valid: false, 
          message: 'El archivo no parece ser un backup válido de PostgreSQL' 
        };
      }

      return {
        valid: true,
        message: 'Archivo válido',
        details: {
          size: stats.size,
          sizeFormatted: this.formatBytes(stats.size),
          lines: fileContent.split('\n').length,
        }
      };

    } catch (error: any) {
      this.logger.error('Error validando archivo:', error.message);
      return { 
        valid: false, 
        message: 'Error al procesar el archivo' 
      };
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async cleanupOldBackups(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const backupDir = path.join(process.cwd(), 'tmp');
      if (!fs.existsSync(backupDir)) {
        return;
      }

      const files = fs.readdirSync(backupDir);
      const now = Date.now();

      for (const file of files) {
        if (file.startsWith('backup-') && file.endsWith('.sql')) {
          const filePath = path.join(backupDir, file);
          const stats = fs.statSync(filePath);
          
          if (now - stats.mtime.getTime() > maxAge) {
            fs.unlinkSync(filePath);
            this.logger.log(`Backup antiguo eliminado: ${file}`);
          }
        }
      }
    } catch (error: any) {
      this.logger.warn('Error limpiando backups antiguos:', error.message);
    }
  }

  async debugBackupContent(filePath: string): Promise<void> {
    try {
      this.logger.log('=== DEBUG: Analizando contenido del backup ===');
      
      // Verificar todas las tablas principales del schema
      const tables = [
        'User', 'AccessLog', 'Token', 'Session', 
        'SessionPriceHistory', 'SessionDateRange', 'SessionDateSnapshot',
        'Invoice', 'SystemConfig'
      ];
      
      for (const table of tables) {
        const grepCommand = `grep -c 'COPY public."${table}"' "${filePath}" || echo "0"`;
        
        try {
          const { stdout } = await execAsync(grepCommand);
          const count = parseInt(stdout.trim());
          if (count > 0) {
            this.logger.log(`✅ Tabla "${table}" encontrada en backup`);
          } else {
            this.logger.warn(`⚠️  Tabla "${table}" NO encontrada en backup`);
          }
        } catch (error: any) {
          this.logger.warn(`❌ Error verificando tabla "${table}":`, error.message);
        }
      }
      
      // Verificar tablas de relación many-to-many
      const relationTables = [
        '_InstructorSessions', '_AssistantSessions',
        '_PresentInstructorsOnDate', '_PresentAssistantsOnDate',
        '_SubstituteInstructorsOnDate'
      ];
      
      this.logger.log('--- Verificando tablas de relación ---');
      for (const table of relationTables) {
        const grepCommand = `grep -c 'COPY public."${table}"' "${filePath}" || echo "0"`;
        
        try {
          const { stdout } = await execAsync(grepCommand);
          const count = parseInt(stdout.trim());
          if (count > 0) {
            this.logger.log(`✅ Relación "${table}" encontrada en backup`);
          } else {
            this.logger.log(`ℹ️  Relación "${table}" vacía o no encontrada (normal si no hay datos)`);
          }
        } catch (error: any) {
          this.logger.warn(`Error verificando relación "${table}":`, error.message);
        }
      }
      
      // Contar líneas totales
      const wcCommand = `wc -l "${filePath}"`;
      const { stdout: lineCount } = await execAsync(wcCommand);
      this.logger.log(`📄 Total de líneas en backup: ${lineCount.trim()}`);
      
      // Verificar que tiene la estructura completa de PostgreSQL dump
      const structureChecks = [
        { pattern: 'PostgreSQL database dump', name: 'Header de PostgreSQL' },
        { pattern: 'CREATE TABLE', name: 'Definiciones de tablas' },
        { pattern: 'CREATE INDEX', name: 'Índices' },
        { pattern: 'ALTER TABLE.*ADD CONSTRAINT', name: 'Foreign Keys' },
        { pattern: 'CREATE TYPE', name: 'Enums (tipos personalizados)' },
      ];
      
      for (const check of structureChecks) {
        const grepCommand = `grep -c '${check.pattern}' "${filePath}" || echo "0"`;
        try {
          const { stdout } = await execAsync(grepCommand);
          const count = parseInt(stdout.trim());
          this.logger.log(`${count > 0 ? '✅' : '⚠️ '} ${check.name}: ${count} encontrados`);
        } catch (error: any) {
          this.logger.warn(`Error verificando ${check.name}`);
        }
      }
      
      this.logger.log('=== FIN DEBUG ===');
    } catch (error: any) {
      this.logger.error('Error en debug:', error.message);
    }
  }

  deleteBackupFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log(`Archivo de backup eliminado: ${path.basename(filePath)}`);
      }
    } catch (error: any) {
      this.logger.warn('Error eliminando archivo de backup:', error.message);
    }
  }
}