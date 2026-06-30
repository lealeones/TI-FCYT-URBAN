import { addKeyword, EVENTS, MemoryDB } from "@builderbot/bot";
// import { BaileysProvider } from "@builderbot/provider-baileys";
import { BaileysProvider as Provider } from 'aurik3-builderbot-baileys-custom';

import dayjs from "dayjs";
import 'dayjs/locale/es';
// import { IaService } from "../../../../ia/ia.service";
import { SessionsService, } from "../../../../sessions/sessions.service";
dayjs.locale('es');

export const registerCreateSessionFlow = ({ iaService, sessionService }: { iaService: any, sessionService: SessionsService }) => {
    return addKeyword<Provider, MemoryDB>(EVENTS.ACTION)

        // Primer paso: solicitar descripción
        .addAction(async (_, { flowDynamic, state }) => {
            await flowDynamic('🆕 Crear nueva sesión:\nPor favor, ingresa la descripción de la sesión:');
            await flowDynamic('ℹ️ Ejemplos:\n*Recurrentes*: Clase "Zumba" los lunes a las 10:00AM - 11:00AM \n*Ocasionales*: Clase "Yoga" 30/6/2025 a las 10:00AM - 11:00AM');
        })

//         // Segundo paso: procesar mensaje del usuario con IA
//         .addAction({ capture: true }, async (ctx, { state, flowDynamic, fallBack }) => {
//             try {
//                 const input = ctx.body.trim().toLocaleLowerCase();

//                 if (input.length > 100) {
//                     return fallBack('El mensaje es demasiado largo. Intenta con una descripción más corta.');
//                 }

//                 if (input.includes('cancelar')) {
//                     state.clear();
//                     return flowDynamic('❌ Creacion cancelada.');
//                 }

//                 await flowDynamic('⏳ Procesando...');

//                 const response = await iaService.createSession(input);

//                 if (!response || !response.schedules || response.schedules.length === 0) {
//                     state.clear();
//                     return fallBack('❌ No se pudo generar la sesión. Intenta de nuevo.');
//                 }

//                 await state.update({ dataCreate: response });

//                 await flowDynamic(`🔍 Se creará una nueva clase:
//  📄 *Descripción*: ${response.description}
//  📅 *Tipo*: ${response.type}
//  🕒 *Horarios*:
//  ${response.schedules.map((s) => {
//                     const diaSemana = s.dayOfWeek ? s.dayOfWeek + ' ' : '';
//                     const fecha = s.specificDate ? dayjs(s.specificDate).format('DD/MM/YYYY') + ' ' : '';
//                     const horaInicio = dayjs(s.startTime).format('HH:mm');
//                     const horaFin = dayjs(s.endTime).format('HH:mm');
//                     return `- ${diaSemana}${fecha}${horaInicio} - ${horaFin}`;
//                 }).join('\n')}
// *¿Es correcto?* Responde *si* o *no*.`);
//             } catch (error) {
//                 console.error('Error al procesar el mensaje:', error);
//                 await state.clear();
//                 return fallBack('❌ Ocurrió un error inesperado. Intenta de nuevo.');
//             }
//         })

    // // Tercer paso: confirmar creación de la sesión
    // .addAction({ capture: true }, async (ctx, { state, flowDynamic, fallBack }) => {
    //     try {
    //         const input = ctx.body.trim().toLowerCase();

    //         if (input !== 'si' && input !== 'no') {
    //             return fallBack('❗ Responde exactamente *si* o *no*.');
    //         }

    //         // Si el usuario cancela
    //         if (input === 'no') {
    //             await state.clear();
    //             return flowDynamic('❌ Creacion cancelada.');
    //         }

    //         // Si el usuario confirma
    //         const sessionData: SessionWithSchedules = state.get('dataCreate');

    //         const upsertData: SessionWithSchedulesInput = {
    //             id: sessionData?.id,
    //             description: sessionData.description!,
    //             type: sessionData.type!,
    //             startDate: sessionData.startDate!,
    //             endDate: sessionData.endDate!,
    //             isActive: sessionData.isActive ?? true,
    //             schedules: sessionData.schedules?.map((schedule) => ({
    //                 dayOfWeek: schedule.dayOfWeek ?? null,
    //                 specificDate: schedule.specificDate ? new Date(schedule.specificDate) : null,
    //                 startTime: new Date(schedule.startTime),
    //                 endTime: new Date(schedule.endTime),
    //                 isException: schedule.isException ?? false,
    //             })),
    //         };

    //         const session = await sessionService.upsertSession(upsertData);

    //         if (!session) {
    //             await state.clear();
    //             return fallBack('❌ No se pudo crear la sesión. Intenta de nuevo.');
    //         }

    //         await flowDynamic('✅ Clase creada exitosamente.\nPuedes verla en el menú de sesiones.');
    //         await state.clear();
    //     } catch (error) {
    //         console.error('Error al crear la sesión:', error);
    //         await state.clear();
    //         return fallBack('❌ Ocurrió un error al crear la clase. Intenta de nuevo.');
    //     }
    // });
};
