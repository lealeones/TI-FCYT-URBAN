import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { SystemConfigModule } from '../common/system-config.module';
import { SystemConfigService } from '../common/system-config.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  controllers: [AuthController],
  providers: [AuthService],
  imports: [
    JwtModule.registerAsync({
      imports: [SystemConfigModule],
      useFactory: async (systemConfig: SystemConfigService) => {
        // Esperar a que se cargue la configuración
        await new Promise(resolve => setTimeout(resolve, 100));
        const expirationMinutes = systemConfig.getTokenExpirationMinutes();
        return {
          secret: process.env.SECRET_JWT,
          signOptions: { expiresIn: `${expirationMinutes}m` },
        };
      },
      inject: [SystemConfigService],
    }),
    PrismaModule,
    SystemConfigModule,
    forwardRef(() => WhatsappModule),
  ],
  exports: [AuthService],
})
export class AuthModule { }
