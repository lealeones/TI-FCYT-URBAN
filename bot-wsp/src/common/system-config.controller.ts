import { Body, Controller, Get, Patch, UseGuards, ValidationPipe, UsePipes, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { SystemConfigService } from './system-config.service';
import { AdminGuard } from './guards/admin.guard';
import { User } from './decoratos/user.decorator';
import { AuthUser } from './types';
import { IsOptional, IsInt, Min, Max, IsDateString } from 'class-validator';

class UpdateSystemConfigDto {
    @ApiProperty({
        description: 'Intervalo en minutos para desactivar sesiones vencidas',
        example: 30,
        required: false,
        minimum: 1,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    sessionCleanupIntervalMinutes?: number;

    @ApiProperty({
        description: 'Día del mes (1-28) en que se generan las facturas mensuales',
        example: 1,
        required: false,
        minimum: 1,
        maximum: 28,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(28)
    invoiceGenerationDayOfMonth?: number;

    @ApiProperty({
        description: 'Tiempo de expiración de los tokens en minutos',
        example: 30,
        required: false,
        minimum: 1,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    tokenExpirationMinutes?: number;

    @ApiProperty({
        description: 'Intervalo en minutos para limpiar tokens expirados',
        example: 60,
        required: false,
        minimum: 1,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    tokenCleanupIntervalMinutes?: number;

    @ApiProperty({
        description: 'Intervalo en días para actualizar fotos de perfil de WhatsApp',
        example: 2,
        required: false,
        minimum: 1,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    profilePictureUpdateIntervalDays?: number;
}

class ForceInvoicesDto {
    @ApiProperty({
        description: 'Fecha del mes para el cual generar facturas (formato ISO 8601)',
        example: '2025-11-01T00:00:00.000Z',
        required: true,
    })
    @IsDateString()
    targetMonth!: string;
}

@ApiTags('Configuración del Sistema')
@Controller('system-config')
export class SystemConfigController {
    constructor(private readonly systemConfigService: SystemConfigService) { }

    @Get()
    //@UseGuards(AdminGuard)
    @ApiOperation({ 
        summary: 'Obtener configuración actual del sistema',
        description: 'Retorna todos los parámetros de configuración actuales que controlan los trabajos programados y tokens'
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Configuración obtenida exitosamente',
        schema: {
            example: {
                id: 'clxxx123456',
                sessionCleanupIntervalMinutes: 30,
                invoiceGenerationDayOfMonth: 1,
                tokenExpirationMinutes: 30,
                tokenCleanupIntervalMinutes: 60,
                profilePictureUpdateIntervalDays: 2,
                createdAt: '2025-11-10T00:00:00.000Z',
                updatedAt: '2025-11-10T00:00:00.000Z'
            }
        }
    })
    @ApiResponse({ status: 401, description: 'No autorizado - Token no proporcionado o inválido' })
    @ApiResponse({ status: 403, description: 'Acceso denegado - Se requieren permisos de administrador' })
    //@ApiBearerAuth()
    async getConfig() {
        return this.systemConfigService.getConfig();
    }

    @Patch()
    @UseGuards(AdminGuard)
    @ApiOperation({ 
        summary: 'Actualizar configuración del sistema',
        description: 'Actualiza uno o más parámetros de configuración. Los cambios toman efecto inmediatamente, excepto tokenExpirationMinutes que requiere reinicio.'
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Configuración actualizada exitosamente',
        schema: {
            example: {
                id: 'clxxx123456',
                sessionCleanupIntervalMinutes: 45,
                invoiceGenerationDayOfMonth: 5,
                tokenExpirationMinutes: 60,
                tokenCleanupIntervalMinutes: 120,
                profilePictureUpdateIntervalDays: 3,
                createdAt: '2025-11-10T00:00:00.000Z',
                updatedAt: '2025-11-10T12:30:00.000Z',
                warnings: [
                    'El cambio en tokenExpirationMinutes requiere reiniciar la aplicación para que JwtModule lo tome en cuenta.'
                ]
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Datos inválidos - Revisa las validaciones de cada campo' })
    @ApiResponse({ status: 401, description: 'No autorizado - Token no proporcionado o inválido' })
    @ApiResponse({ status: 403, description: 'Acceso denegado - Se requieren permisos de administrador' })
    @ApiBearerAuth()
    @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
    async updateConfig(
        @Body() data: UpdateSystemConfigDto,
        @User() user: AuthUser,
    ) {
        console.log('=== CONTROLLER UPDATE CONFIG ===');
        console.log('Body received:', JSON.stringify(data, null, 2));
        console.log('Body type:', typeof data);
        console.log('Body constructor:', data.constructor.name);
        console.log('User:', JSON.stringify(user, null, 2));
        console.log('Body keys:', Object.keys(data));
        console.log('Body values:', Object.values(data));
        console.log('invoiceGenerationDayOfMonth type:', typeof data.invoiceGenerationDayOfMonth);
        console.log('invoiceGenerationDayOfMonth value:', data.invoiceGenerationDayOfMonth);
        console.log('================================');
        
        const result = await this.systemConfigService.updateConfig(data, user);
        
        // Advertencia si se cambió tokenExpirationMinutes
        const warnings = [];
        if (data.tokenExpirationMinutes !== undefined) {
            warnings.push('El cambio en tokenExpirationMinutes requiere reiniciar la aplicación para que JwtModule lo tome en cuenta.');
        }
        
        return {
            ...result,
            ...(warnings.length > 0 && { warnings })
        };
    }

    @Get('reload')
    @UseGuards(AdminGuard)
    @ApiOperation({ 
        summary: 'Recargar configuración desde la base de datos',
        description: 'Fuerza la recarga de la configuración desde la base de datos en memoria. Útil después de cambios manuales en la BD.'
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Configuración recargada exitosamente',
        schema: {
            example: {
                message: 'Configuración recargada exitosamente'
            }
        }
    })
    @ApiResponse({ status: 401, description: 'No autorizado - Token no proporcionado o inválido' })
    @ApiResponse({ status: 403, description: 'Acceso denegado - Se requieren permisos de administrador' })
    @ApiBearerAuth()
    async reloadConfig() {
        await this.systemConfigService.reloadConfig();
        return { message: 'Configuración recargada exitosamente' };
    }

    @Post('force-invoices')
    @UseGuards(AdminGuard)
    @ApiOperation({ 
        summary: 'Forzar generación de facturas para un mes específico',
        description: 'Genera facturas para todas las sesiones activas y sus asistentes en el mes especificado. Solo crea facturas que no existan previamente.'
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Facturas generadas exitosamente',
        schema: {
            example: {
                message: 'Facturas generadas exitosamente para 2025-11',
                totalCreated: 15,
                details: [
                    { sessionId: 'xxx', assistantId: 'yyy', invoiceId: 'zzz' }
                ]
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Datos inválidos - Fecha requerida' })
    @ApiResponse({ status: 401, description: 'No autorizado' })
    @ApiResponse({ status: 403, description: 'Acceso denegado' })
    @ApiBearerAuth()
    async forceGenerateInvoices(
        @Body() data: ForceInvoicesDto,
        @User() user: AuthUser,
    ) {
        const result = await this.systemConfigService.forceGenerateMonthlyInvoices(
            new Date(data.targetMonth),
            user
        );
        return result;
    }
}
