import { Body, Controller, ForbiddenException, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { User } from '../common/decoratos/user.decorator';
import { AuthTokenGuard } from '../common/guards/auth-token.guard';
import { AuthUser } from '../common/types';
import { SetParticipantsDto } from './dto/create-session.dto';
import { InvoicesByMonthQueryDto } from './dto/invoices-by-month-query.dto';
import { InvoicesByMonthResponseDto } from './dto/invoices-by-month-response.dto';
import { DeactivateBody } from './entities/session.entity';
import { ResponseAttendeesSnapshot, SessionsService } from './sessions.service';

@Controller('sessions')
@UseGuards(AuthTokenGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) { }

  @Get()
  async findAll(
    @User() user: AuthUser,
    @Query('status') status?: 'active' | 'inactive' | 'all',
  ) { 
    return await this.sessionsService.findAll(user, status);
  }

  @Post('/upsert')
  async upsert(
    @Body() body: any, //UpsertClaseDto,
    @User() user: AuthUser,
  ) {
    const allowed = user?.role === UserRole.ADMIN || user?.role === UserRole.INSTRUCTOR;
    if (!allowed) {
      throw new ForbiddenException('No tienes permisos para crear o actualizar clases');
    }

    const { session, created } = await this.sessionsService.upsertSession(body, user?.id);
    return {
      message: created ? 'Clase creada correctamente' : 'Clase actualizada correctamente',
      data: session,
    };
  }

  @Get(':id/participants')
  async getParticipants(
    @Param('id') id: string,
    @User() user: AuthUser,
  ) {
    const allowed = user?.role === UserRole.ADMIN || user?.role === UserRole.INSTRUCTOR;
    if (!allowed) {
      return { message: 'No tienes permisos para actualizar participantes', data: null };
    }
    return this.sessionsService.getParticipantsLists(id);
  }

  @Put(':id/participants')
  async setParticipants(
    @Param('id') id: string,
    @Body() body: SetParticipantsDto,
    @User() user: AuthUser,
  ) {
    // Permisos: ADMIN o INSTRUCTOR de la sesión
    const allowed = user?.role === UserRole.ADMIN || user?.role === UserRole.INSTRUCTOR;
    if (!allowed) {
      return { message: 'No tienes permisos para actualizar participantes', data: null };
    }
    const session = await this.sessionsService.setParticipants(id, body.userIds, user);
    return { message: 'Participantes actualizados', data: session };
  }

  @Put(':id/snapshot')
  async setSubstituteInstructor(
    @Param('id') idSnapshot: string,
    @Body('substituteInstructorId') substituteInstructorId: string[],
    @User() user: AuthUser,
  ) {
    const allowed = user?.role === UserRole.ADMIN

    if (!allowed) {
      return { message: 'No tienes permisos para actualizar el instructor suplente', data: null };
    }

    const session = await this.sessionsService.setSubstituteInstructor(
      idSnapshot, substituteInstructorId);
    return { message: 'Instructor suplente actualizado', data: session };
  }

  @Get(':id/attendees')
  async getAttendeesSnapshot(
    @Param('id') id: string,
    @User() user: AuthUser,
  ): Promise<ResponseAttendeesSnapshot> {
    const allowed = user?.role === UserRole.ADMIN || user?.role === UserRole.INSTRUCTOR;
    if (!allowed) {
      throw new ForbiddenException('No tienes permisos para ver los asistentes');
    }
    return this.sessionsService.getAttendeesSnapshot(id);
  }

  @Post('/deactivate')
  async deactivate(
    @Body() body: DeactivateBody,
    @User() user: AuthUser,
  ) {
    const allowed = user?.role === UserRole.ADMIN
    if (!allowed) {
      throw new ForbiddenException('No tienes permisos para desactivar');
    }
    return await this.sessionsService.deactivate(body, user);
  }

  @Get(':sessionId/invoices-by-month')
  async getInvoicesByMonth(
    @Param('sessionId') sessionId: string,
    @Query() query: InvoicesByMonthQueryDto,
    @User() user: AuthUser,
  ): Promise<InvoicesByMonthResponseDto> {
    // Permitir acceso a ADMIN e INSTRUCTOR
    const allowed = user?.role === UserRole.ADMIN || user?.role === UserRole.INSTRUCTOR;
    if (!allowed) {
      throw new ForbiddenException('No tienes permisos para ver las facturas');
    }
    
    return await this.sessionsService.getInvoicesByMonth(
      sessionId,
      query.month,
      query.year
    );
  }

}


