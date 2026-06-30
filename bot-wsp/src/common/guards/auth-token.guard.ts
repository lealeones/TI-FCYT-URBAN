import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthTokenGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      throw new UnauthorizedException('Token no proporcionado');
    }

    const token = authHeader.substring(7).trim(); // lo que viene después de "Bearer "

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

    // guardamos el usuario en request para que @User() lo pueda leer
    request.user = found?.user || undefined;
    return true;
  }
}
