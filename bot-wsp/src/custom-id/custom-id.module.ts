import { Module } from '@nestjs/common';
import { CustomIdService } from './custom-id.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  providers: [CustomIdService],
  imports: [PrismaModule],
  exports: [CustomIdService],
})
export class CustomIdModule { }
