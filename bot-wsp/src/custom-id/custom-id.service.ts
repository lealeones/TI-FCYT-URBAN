import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class CustomIdService {
  private readonly logger = new Logger(CustomIdService.name);

  constructor(private readonly prisma: PrismaService) { }

  async generateCustomId(modelName: keyof PrismaClient, prefix: string): Promise<string> {
    this.logger.log(`Creando nuevo Custom ID para modelo: ${String(modelName)}`);
    try {
      const model = (this.prisma as any)?.[modelName];

      const lastRecord = await model.findFirst({
        where: { customId: { startsWith: `${prefix}-` } },
        orderBy: { customId: 'desc' },
      });

      let nextNumber = 1;
      if (lastRecord?.customId) {
        const lastNumber = parseInt(lastRecord.customId.slice(prefix.length + 1), 36);
        nextNumber = lastNumber + 1;
      }

      const nextIdPart = nextNumber.toString(36).padStart(3, '0').toUpperCase();
      const customId = `${prefix}-${nextIdPart}`.toLocaleUpperCase();

      this.logger.log(`Custom ID generado: ${customId}`);
      return customId;
    } catch (error: any) {
      this.logger.error(
        `Error al generar Custom ID para modelo: ${String(modelName)}`,
        error.message
      );
      throw new Error('No se pudo generar el Custom ID.');
    }
  }
}
