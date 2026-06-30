import { Module } from '@nestjs/common';
import { UserController } from './user.controller.js';
import { UserService } from './user.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CustomIdService } from '../custom-id/custom-id.service.js';
import { CustomIdModule } from '../custom-id/custom-id.module.js';


@Module({
  controllers: [UserController],
  providers: [UserService],
  imports: [PrismaModule , CustomIdModule],
  exports: [UserService],
})
export class UserModule {}
