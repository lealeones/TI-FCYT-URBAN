import { Module } from '@nestjs/common';
// import { IaService } from './ia.service';
import { IaController } from './ia.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';
import { IaSubscriptionService } from './services/ia.subscription.service';

@Module({
  controllers: [IaController],
   providers: [
  //   // IaService, 
     IaSubscriptionService],
  imports: [PrismaModule, HttpModule],
   exports: [
  //   // IaService,
     IaSubscriptionService],
})
export class IaModule { }
