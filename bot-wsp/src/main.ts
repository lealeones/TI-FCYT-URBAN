import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import 'reflect-metadata';
import { AppModule } from './app.module.js';

// ─── Silenciar logs verbosos de libsignal-node ────────────────────────────────
// @whiskeysockets/libsignal-node emite console.info hardcodeado para gestión
// interna de sesiones E2E (Closing/Opening session, etc.). Es comportamiento
// normal del protocolo Signal; no aporta valor en producción.
const _originalConsoleInfo = console.info.bind(console);
const LIBSIGNAL_PATTERNS = [
  'Closing session:',
  'Opening session:',
  'Removing old closed session:',
  'Migrating session to:',
];
console.info = (...args: any[]) => {
  const msg = String(args[0] ?? '');
  if (LIBSIGNAL_PATTERNS.some((p) => msg.includes(p))) return;
  _originalConsoleInfo(...args);
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Pipes de validación
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // CORS
  app.enableCors({
    origin: '*',
    credentials: true,
  });

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('Bot WhatsApp API')
    .setDescription('API de gestión de usuarios, sesiones, asistencia, facturación y configuración del sistema')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Ingresa tu token de autenticación',
      },
      'bearer',
    )
    .addTag('Configuración del Sistema', 'Endpoints para gestionar la configuración dinámica del sistema')
    .addTag('Autenticación', 'Endpoints de autenticación y gestión de tokens')
    .addTag('Usuarios', 'Gestión de usuarios del sistema')
    .addTag('Sesiones', 'Gestión de sesiones y clases')
    .addTag('Facturas', 'Gestión de facturación')
    .addTag('Asistencia', 'Control de asistencia')
    .addTag('WhatsApp', 'Estado y gestión del bot de WhatsApp')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Bot WhatsApp API - Documentación',
    customfavIcon: 'https://nestjs.com/img/logo-small.svg',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  const port = process.env.PORT || 3001;
  await app.listen(Number(port), '0.0.0.0');
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Swagger documentation available at http://localhost:${port}/api/docs`);
}
bootstrap().catch((err) => {
  console.error('Error starting application:', err);
  process.exit(1);
});
