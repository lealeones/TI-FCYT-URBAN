// import { get_encoding, Tiktoken } from '@dqbd/tiktoken';
// import { HttpService } from '@nestjs/axios';
// import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
// import { Prisma, UserRole } from '@prisma/client';
// import dayjs from 'dayjs';
// import { firstValueFrom } from 'rxjs';
// import { PrismaService } from '../prisma/prisma.service';
// import { buildPromptInferAction } from './prompts/buildPromptInferAction';
// import { SessionsService } from '../sessions/sessions.service';
// import { UserDataUpdate } from '../user/user.dto';


// export type UserIntentEnum =
//   | "payment_status"
//   | "view_enrolled_classes"
//   | "view_new_keys"
//   | "enroll_new_classes";

// /** Intents permitidos por rol (ajusta si querés diferenciar más) */
// const ROLE_ALLOWED: Record<UserRole, ReadonlyArray<UserIntentEnum>> = {
//   [UserRole.ADMIN]: [
//     "payment_status",
//     "view_enrolled_classes",
//     "view_new_keys",
//     "enroll_new_classes",
//   ],
//   [UserRole.INSTRUCTOR]: [
//     "payment_status",
//     "view_enrolled_classes",
//     "view_new_keys",
//     "enroll_new_classes",
//   ],
//   [UserRole.USER]: [
//     "payment_status",
//     "view_enrolled_classes",
//     "view_new_keys",
//     "enroll_new_classes",
//   ],
//   // Invitado: no puede ver pagos ni “mis clases”
//   [UserRole.GUEST]: [],
// };

// /** Normaliza texto para matching robusto */
// const norm = (s: string) =>
//   s
//     .normalize("NFKD")
//     .replace(/\p{Diacritic}/gu, "")
//     .toLowerCase()
//     .trim();

// /** Sinónimos rápidos por intent (ES + algo de EN) */
// const KEYWORDS: Record<UserIntentEnum, RegExp[]> = {
//   payment_status: [
//     /pago(s)?\b/,
//     /\bestado.*pago/,
//     /\bestoy.*al dia/,
//     /\bal dia\b/,
//     /factur(a|as)|cuota|vencim(iento|entos)/,
//     /\bpagar\b|\bpague\b/,
//     /payment|paid|invoice|bill|due/,
//   ],
//   view_enrolled_classes: [
//     /mis?\s+clases/,
//     /clases?.*inscrit[oa]s?/,
//     /inscripc(ion|iones)\s+vigentes?/,
//     /\bver\s+clases\b|\bmis\s+cursos?\b/,
//     /matriculad[oa]s?/,
//     /enrolled|my\s+classes|my\s+courses/,
//   ],
//   view_new_keys: [
//     /claves?\s+(nuevas?|disponibles?)/,
//     /\bnuevas?\s+claves?\b/,
//     /\bcodigos?\b|\baccesos?\b|\bkeys?\b/,
//     /generate.*key|new.*key/,
//   ],
//   enroll_new_classes: [
//     /inscrib(irme|ir|irnos)|anotar(me)?|apuntar(me)?|registrar(me)?/,
//     /inscripcion\s+nuev(a|as)|nuevas?\s+clases/,
//     /\bquiero\s+(sumarme|anotarme|inscribirme)\b/,
//     /enroll|sign\s*up|register.*class/,
//   ],
// };

// /** Heurística: primer intent cuyo regex matchee */
// const quickHeuristic = (text: string): UserIntentEnum | null => {
//   const t = norm(text);
//   for (const intent of Object.keys(KEYWORDS) as UserIntentEnum[]) {
//     const found = KEYWORDS[intent].some((rx) => rx.test(t));
//     if (found) return intent;
//   }
//   return null;
// };

// /** Prompt builder acotado por rol */
// export const buildPromptInferUserMenuAction = (
//   message: string,
//   role: UserRole
// ): string => {
//   const allowed = ROLE_ALLOWED[role];
//   const labels = allowed
//     .map((k) => `"${k}"`)
//     .join(", ");
//   // Unos mini-ejemplos para anclar
//   const examples = [
//     { in: "necesito ver si estoy al dia con mis pagos", out: "payment_status" },
//     { in: "quiero ver mis clases inscritas", out: "view_enrolled_classes" },
//     { in: "tienen nuevas claves de acceso?", out: "view_new_keys" },
//     { in: "quiero inscribirme a una clase nueva", out: "enroll_new_classes" },
//   ]
//     // filtra ejemplos que no estén permitidos al rol para no confundir al modelo
//     .filter((e) => (allowed as string[]).includes(e.out))
//     .map((e) => `Entrada: "${e.in}"\nRespuesta: "${e.out}"`)
//     .join("\n\n");

//   return `
// Eres un asistente que clasifica la intención del usuario en una de las siguientes opciones PERMITIDAS según su rol (${role}):
// ${labels}

// Analiza el siguiente mensaje y responde SOLO con una de esas claves exactas (sin texto adicional).
// Si la intención NO coincide con ninguna de las opciones permitidas, responde exactamente "null".

// ${examples ? `\nEjemplos:\n\n${examples}\n` : ""}

// Entrada: "${message}"
// Respuesta:
// `.trim();
// };

// /** Timeout helper: evita congelar la UX si la IA tarda */
// const withTimeout = async <T>(
//   p: Promise<T>,
//   ms = 1200
// ): Promise<T> =>
//   Promise.race([
//     p,
//     new Promise<T>((_, rej) => setTimeout(() => rej(new Error("IA_TIMEOUT")), ms)),
//   ]) as Promise<T>;

// /** Mapea string → intent válido o null */
// const parseModelLabel = (
//   raw: string | null | undefined,
//   allowed: ReadonlyArray<UserIntentEnum>
// ): UserIntentEnum | null => {
//   if (!raw) return null;
//   const cleaned = raw.replace(/[\s"'`]/g, "").toLowerCase();

//   if (cleaned === "null") return null;

//   // Intent labels exactos
//   const candidates: UserIntentEnum[] = [
//     "payment_status",
//     "view_enrolled_classes",
//     "view_new_keys",
//     "enroll_new_classes",
//   ];

//   const match = candidates.find((c) => c === cleaned);
//   if (!match) return null;

//   // Respeta permisos por rol
//   return allowed.includes(match) ? match : null;
// };


// export enum ActionsAdmin {
//   CREATE_SESSION = 'create_session',
//   GET_SESSIONS = 'get_sessions',
//   UPDATE_USER = 'update_user',
//   GET_USERS = 'get_users',
// }

// //xport type SessionWithSchedules = Partial<Prisma.SessionGetPayload<{ include: { schedules: true } }>>
// @Injectable()
// export class IaService implements OnModuleInit {

//   constructor(
//     private readonly httpService: HttpService,
//     private prisma: PrismaService,
//   ) { }

//   private readonly logger = new Logger(IaService.name);
//   private readonly apiUrl = 'http://localhost:5000/v1/completions';
//   //@ts-ignores
//   private tokenizer: Tiktoken;
//   private readonly ctxSize = 4096; // tamaño de contexto que configuraste en el modelo
//   private readonly maxTokens = 512; // tokens máximos que le permitimos al modelo generar
//   private readonly safetyMargin = 10; // margen de seguridad

//   onModuleInit() {
//     this.tokenizer = get_encoding('cl100k_base');
//   }

//   /** Implementa la llamada real a tu LLM/endpoint */
//   private async callModel(prompt: string): Promise<string> {
//     // TODO: reemplaza por tu cliente real (OpenAI, local, etc.)
//     // Debe devolver el texto "payment_status" | ... | "null"
//     throw new Error("callModelNot implemented");
//   }

//   async detectIntent(
//     text: string,
//     role: UserRole
//   ): Promise<UserIntentEnum | null> {
//     const allowed = ROLE_ALLOWED[role];

//     // 1) Heurística rápida (barata y rápida)
//     const byHeuristic = quickHeuristic(text);
//     if (byHeuristic && allowed.includes(byHeuristic)) {
//       return byHeuristic;
//     }

//     // 2) LLM (con timeout) usando prompt limitado por rol
//     try {
//       const prompt = buildPromptInferUserMenuAction(text, role);
//       const raw = await withTimeout(this.callModel(prompt), 1500) as string | null;
//       const intent = parseModelLabel(raw, allowed);
//       if (intent) return intent;
//     } catch {
//       // caemos a null si hay timeout/errores
//     }

//     // 3) Nada concluyente
//     return null;
//   }

//   async getActionAdmin(input: string): Promise<ActionsAdmin> {
//     try {
//       const prompt = buildPromptInferAction(input);
//       const response = await this.executePrompt<string>(prompt)

//       if (!Object.values(ActionsAdmin).includes(response as ActionsAdmin)) {
//         this.logger.error(`Acción no válida: ${response}`);
//         throw new Error('La acción inferida no es válida.');
//       }
//       return response as ActionsAdmin;
//     }
//     catch (error: any) {
//       this.logger.error('Error al obtener la acción de administrador', error);
//       throw new Error('No se pudo obtener la acción de administrador.');
//     }
//   }

//   async getUserUpdatePayload(input: string): Promise<UserDataUpdate> {
//     try {
//       const prompt = this.buildPromptUpdateUser(input);
//       const promptTokens = this.countTokens(prompt);
//       // Validación: aseguramos que no exceda el tamaño de contexto
//       if (promptTokens + this.maxTokens + this.safetyMargin > this.ctxSize) {
//         this.logger.error(`Prompt demasiado largo. Tokens en prompt: ${promptTokens}`);
//         throw new Error('El prompt es demasiado largo para el contexto disponible.');
//       }
//       const { data } = await firstValueFrom(
//         this.httpService.post(this.apiUrl, {
//           prompt,
//           max_tokens: 256,
//           temperature: 0.2,
//           stop: ['Entrada:', '\n\n'],
//         }),
//       );

//       const { choices } = data;
//       const choice = choices[0];

//       if (choice.finish_reason !== 'stop') {
//         throw new Error('La respuesta fue incompleta o abortada.');
//       }

//       const responseText = choice.text.trim();

//       // Parseamos el JSON que viene como string
//       const jsonResponse = JSON.parse(responseText);

//       const response: UserDataUpdate = {
//         customId: jsonResponse.customId,
//         name: jsonResponse.name,
//         phone: jsonResponse.phone.replace(/\D/g, ''), // Eliminamos todo lo que no sea dígito
//         birth: dayjs(jsonResponse.birth).toDate(),
//       }

//       return response;
//     }
//     catch (error: any) {
//       this.logger.error('Error al obtener el payload de actualización del usuario', error);
//       throw new Error('No se pudo obtener el payload de actualización del usuario.');
//     }
//   }


//   //TODO cambiarle el nombre , lo que hace es parsear de natural a json
//   // async createSession(input: string): Promise<SessionWithSchedules> {
//   //   const prompt = this.buildPromptCreateSession(input);

//   //   const promptTokens = this.countTokens(prompt);

//   //   // Validación: aseguramos que no exceda el tamaño de contexto
//   //   if (promptTokens + this.maxTokens + this.safetyMargin > this.ctxSize) {
//   //     this.logger.error(`Prompt demasiado largo. Tokens en prompt: ${promptTokens}`);
//   //     throw new Error('El prompt es demasiado largo para el contexto disponible.');
//   //   }
//   //   try {
//   //     const { data } = await firstValueFrom(
//   //       this.httpService.post(this.apiUrl, {
//   //         prompt,
//   //         max_tokens: 512,
//   //         temperature: 0.2,
//   //         stop: ['\n\n', 'Entrada:'],
//   //       }),
//   //     );

//   //     const { choices } = data;
//   //     const choice = choices[0];

//   //     if (choice.finish_reason !== 'stop') {
//   //       throw new Error('La respuesta fue incompleta o abortada.');
//   //     }

//   //     const responseText = choice.text.trim();

//   //     // Parseamos el JSON que viene como string
//   //     const jsonResponse = JSON.parse(responseText);

//   //     const response: SessionWithSchedules = {
//   //       description: jsonResponse.description,
//   //       type: jsonResponse.type,
//   //       schedules: jsonResponse?.schedules?.map((item: any) => {
//   //         return {
//   //           dayOfWeek: item.dayOfWeek || null,
//   //           specificDate: item.specificDate ? dayjs(item.specificDate).toDate() : null,
//   //           startTime: dayjs(item.startDateTime).toDate(),
//   //           endTime: dayjs(item.endDateTime).toDate(),
//   //         }
//   //       }),
//   //     }
//   //     return response;
//   //   } catch (error) {
//   //     this.logger.error('Error al generar la sesión', error);
//   //     throw new Error('No se pudo generar la sesión.');
//   //   }
//   // }

//   private countTokens(text: string): number {
//     const tokens = this.tokenizer.encode(text);
//     return tokens.length;
//   }

//   async executePrompt<T>(
//     prompt: string,
//     options?: {
//       maxTokens?: number;
//       temperature?: number;
//       stop?: string[];
//     }
//   ): Promise<T> {

//     const promptTokens = this.countTokens(prompt);

//     // Configuración por defecto
//     const maxTokens = options?.maxTokens ?? 256;
//     const temperature = options?.temperature ?? 0.2;
//     const stop = options?.stop ?? ['Entrada:', '\n\n'];

//     if (promptTokens + maxTokens + this.safetyMargin > this.ctxSize) {
//       this.logger.error(`Prompt demasiado largo. Tokens en prompt: ${promptTokens}`);
//       throw new Error('El prompt es demasiado largo para el contexto disponible.');
//     }

//     const { data } = await firstValueFrom(
//       this.httpService.post(this.apiUrl, {
//         prompt,
//         max_tokens: maxTokens,
//         temperature,
//         stop,
//       }),
//     );

//     const { choices } = data;
//     const choice = choices[0];

//     if (choice.finish_reason !== 'stop') {
//       throw new Error('La respuesta fue incompleta o abortada.');
//     }

//     const responseText = choice.text.trim();

//     try {
//       return JSON.parse(responseText) as T;
//     } catch (error) {
//       this.logger.error('Error al parsear la respuesta JSON:', error);
//       throw new Error('La respuesta no es un JSON válido.');
//     }
//   }

//   private buildPromptCreateSession(message: string): string {
//     return `
// Eres un asistente que solo responde en formato JSON válido y nunca agrega texto adicional.

// Devuelve solo la estructura JSON con este formato:
// {
//   "description": string,
//   "type": "RECURRING" o "ONE_TIME",
//   "schedules": [
//     {
//       "dayOfWeek": string o null,
//       "specificDate": string o null  //en formato DD-MM-YYYY HH-mm ,
//       "startDateTime": string //en formato DD-MM-YYYY HH-mm,
//       "endDateTime": string //en formato DD-MM-YYYY HH-mm
//     }
//   ]
// }

// Reglas importantes:
// - Extrae siempre la fecha y hora que aparecen escritas en el mensaje. No inventes, no uses la fecha ni la hora actuales.
// - Si el mensaje contiene una fecha específica (por ejemplo, "2/7/2025"), úsala exactamente como aparece para los campos "specificDate", "startDateTime" y "endDateTime".
// - Si el evento es recurrente, usa palabras clave como "recurrente", "todos los", "cada", "se repite" para detectarlo. En ese caso, el campo "specificDate" debe ser null, "dayOfWeek" debe tener el nombre del día en inglés, y las horas deben colocarse con una fecha ficticia: "1970-01-01".
// - Si el evento es puntual, el campo "dayOfWeek" debe ser null y "specificDate" debe ser la fecha real extraída del mensaje.
// - Convierte siempre las horas al formato de 24 horas y en formato ISO: yyyy-mm-ddTHH:MM:SSZ.
// - Si el mensaje tiene un horario como "11:00AM - 14:00PM", interpreta que:
//   - "11:00AM" es la hora de inicio
//   - "14:00PM" es la hora de fin (corrige a formato 24h si es necesario)

// Ejemplos:

// Entrada: "Clase 'Zumba' 15/12/2025 de 8:30am a 10:00am"
// Respuesta:
// {
//   "description": "Zumba",
//   "type": "ONE_TIME",
//   "schedules": [
//     {
//       "dayOfWeek": null,
//       "specificDate": "2025-12-15T08:30:00Z",
//       "startDateTime": "2025-12-15T08:30:00Z",
//       "endDateTime": "2025-12-15T10:00:00Z"
//     }
//   ]
// }

// Entrada: "Clase Yoga recurrente lunes de 8:30am a 10:00am"
// Respuesta:
// {
//   "description": "Yoga",
//   "type": "RECURRING",
//   "schedules": [
//     {
//       "dayOfWeek": "Monday",
//       "specificDate": null,
//       "startDateTime": "1970-01-01T08:30:00Z",
//       "endDateTime": "1970-01-01T10:00:00Z"
//     }
//   ]
// }

// Entrada: ${message}
// Respuesta:
// `.trim();
//   }


//   private buildPromptUpdateUser(message: string): string {
//     return `
// Eres un asistente que responde únicamente en formato JSON válido. No agregues texto adicional ni explicaciones.

// Formato esperado:
// {
//   "customId": string,   // Ejemplo: "U-001"
//   "name": string,       // Nombre completo
//   "phone": string,      // Solo dígitos, sin espacios ni símbolos
//   "birth": string       // Fecha en formato ISO: YYYY-MM-DD
// }

// Reglas:
// - El primer token siempre es el customId (ejemplo: U-001).
// - El nombre puede incluir espacios y letras, ignora palabras como "nombre".
// - El teléfono puede venir con espacios o símbolos, pero debes devolver solo los dígitos.
// - La fecha de nacimiento puede venir como DD/MM/YYYY o D/M/YYYY y debes convertirla a formato YYYY-MM-DD.

// Ejemplo:
// Entrada:
// U-001 nombre Leandro Leones 3435077510 18/12/1995

// Salida:
// {
//   "customId": "U-001",
//   "name": "Leandro Leones",
//   "phone": "3435077510",
//   "birth": "1995-12-18"
// }

// Entrada:
// ${message}
// Salida:
// `.trim();
//   }


// }


