// src/whatsapp/queue.service.ts
import { Injectable, Logger } from '@nestjs/common';

interface QueueJob {
  /** Función que contiene la lógica concreta a ejecutar para este mensaje */
  handler: () => Promise<void>;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  /** Map de userId → lista de jobs pendientes */
  private queues = new Map<string, QueueJob[]>();

  /** Map de userId → flag de lock (true mientras procesa) */
  private locks  = new Map<string, boolean>();

  /**
   * Encola un Job para el userId dado, y si no hay procesamiento en curso lo dispara.
   * @param userId Identificador único del usuario (ctx.from)
   * @param job    Un objeto con un método handler() que retorna una promesa
   */
  enqueue(userId: string, job: QueueJob) {
    if (!this.queues.has(userId)) {
      this.queues.set(userId, []);
    }
    this.queues.get(userId)!.push(job);
    // Si no está bloqueado, arranca el procesamiento
    if (!this.locks.get(userId)) {
      this.processQueue(userId);
    }
  }

  /**
   * Procesa en orden todos los jobs de la cola de un usuario,
   * asegurándose de no correr dos a la vez.
   */
  private async processQueue(userId: string) {
    const queue = this.queues.get(userId);
    if (!queue || queue.length === 0) return;

    while (queue.length > 0) {
      this.locks.set(userId, true);
      const { handler } = queue.shift()!;
      try {
        await handler();
      } catch (err) {
        this.logger.error(`Error ejecutando job de ${userId}`, err as any);
      } finally {
        this.locks.set(userId, false);
      }
    }

    // Una vez vacía, limpiamos
    this.queues.delete(userId);
    this.locks.delete(userId);
  }
}
