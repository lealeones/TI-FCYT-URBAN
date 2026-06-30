import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      throw new UnauthorizedException('Token no proporcionado');
    }

    const token = authHeader.substring(7).trim();

    const found = await this.prisma.token.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!found) {
      throw new UnauthorizedException('Token inválido');
    }

    if (new Date() > found.expiresAt) {
      throw new UnauthorizedException('Token expirado');
    }

    // Verificar que el usuario sea ADMIN
    // if (found?.user?.role !== UserRole.ADMIN) {
    //   throw new ForbiddenException('Acceso denegado: se requieren permisos de administrador');
    // }

    request.user = found.user;
    return true;
  }
}
