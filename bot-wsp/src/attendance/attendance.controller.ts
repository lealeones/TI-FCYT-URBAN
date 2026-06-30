import { Controller, ForbiddenException, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { User } from '~/common/decoratos/user.decorator';
import { AuthTokenGuard } from '~/common/guards/auth-token.guard';
import { AuthUser } from '~/common/types';
import { AttendanceService } from './attendance.service';

@Controller('attendance')
@UseGuards(AuthTokenGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) { }

  @Get()
  async getAccessLogsByDate(
    @Query('userId') userId: string,
    @Query('date') date: string,
    @User() user: AuthUser,
  ) {
    const allowed = user?.role === UserRole.ADMIN || user?.role === UserRole.INSTRUCTOR || user?.id === userId;
    if (!allowed) {
      throw new ForbiddenException('No tienes permisos para ver esta información');
    }

    if (!userId || !date) {
      throw new Error('userId and date are required');
    }

    return await this.attendanceService.getAccessLogsByDate(userId, date);
  }

  @Put('/:userId/:snapshotId')
  async updateAttendanceSnapshot(
    @Param('userId') userId: string,
    @Param('snapshotId') snapshotId: string,
    @Query('unmark') unmark: string | undefined,
    @User() user: AuthUser,
  ) {
    const allowed = user?.role === UserRole.ADMIN || user?.role === UserRole.INSTRUCTOR;
    if (!allowed) {
      throw new ForbiddenException('No tienes permisos para actualizar asistencias');
    }

    const shouldUnmark = unmark === 'true';
    
    if (shouldUnmark) {
      return await this.attendanceService.unmarkAttendance(userId, snapshotId);
    } else {
      return await this.attendanceService.markAttendance(userId, snapshotId);
    }
  }

}
