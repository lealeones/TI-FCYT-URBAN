import { Controller, ForbiddenException, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { AuthTokenGuard } from '../common/guards/auth-token.guard';
import { AuthUser } from '../common/types';
import { DashboardUser } from './dto/dashboard.dto';
import { User } from '../common/decoratos/user.decorator';

@UseGuards(AuthTokenGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) { }


  @Get()
  async getDashboard(@User() user: AuthUser): Promise<DashboardUser> {
    const allowed = user?.role === 'ADMIN' || user?.role === 'INSTRUCTOR';
    if (!allowed) {
      throw new ForbiddenException('No tienes permisos para ver el dashboard');
    }
    return this.dashboardService.getDashboard(user);
  }
}
