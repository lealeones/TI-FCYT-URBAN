import { addKeyword, EVENTS, MemoryDB } from "@builderbot/bot";
// import { BaileysProvider } from "@builderbot/provider-baileys";
import { BaileysProvider as Provider } from 'aurik3-builderbot-baileys-custom';
import dayjs from "dayjs";
import 'dayjs/locale/es';
// import { IaService } from "../../../../ia/ia.service";
import { SessionFilter, SessionsService } from "../../../../sessions/sessions.service";
import { generateTimer } from "../../../utils/generateTimer";
import { buildPromptGetSession } from "../../../../ia/prompts/promptGetSession";
dayjs.locale('es');

export const registerListSessionFlow = ({ iaService, sessionService }: { iaService: any, sessionService: SessionsService }) => {
    return addKeyword<Provider, MemoryDB>(EVENTS.ACTION)
        .addAction(async (_, { flowDynamic }) => {
            await flowDynamic(`🤔 ¿Que clases te ayudo a buscar?.\n`, { delay: 300 });
        })
        .addAction({ capture: true }, async ({ body }, { flowDynamic, fallBack }) => {
            const input = body.trim().toLocaleLowerCase();
            const prompt = buildPromptGetSession(input);
            try {
                const where = await iaService.executePrompt(prompt);

                if (!where) {
                    await flowDynamic('❗ No se pudo interpretar la solicitud.');
                    return;
                }

                const inputWhere: SessionFilter = {
                    ...where
                }

                await flowDynamic(`🔍 Buscando clases con los siguientes filtros:\n${JSON.stringify(inputWhere, null, 2)}`, { delay: 300 });
                // const clases = await sessionService.findSessionWithNaturalFilters(where);

                // if (!clases || clases.length === 0) {
                //     return fallBack('❗ No encontramos ninguna clase con esos valores, intenta denuevo');
                // }
                // // Mapeamos cada sesión a una línea de salida
                // const lines = clases.map((clase) => {
                //     // ID
                //     const id = clase.customId;

                //     // Descripción (hasta 40 chars)
                //     let desc = clase.description!;
                //     if (desc.length > 40) {
                //         desc = desc.slice(0, 40) + '…';
                //     }

                //     // Horarios
                //     const horarios = clase.schedules?.map((i) => {
                //         const dia = i.dayOfWeek
                //             ? i.dayOfWeek
                //             : dayjs(i.specificDate!).format('DD-MM');
                //         const horaInicio = dayjs(i.startTime).format('HH:mm');
                //         const horaFin = dayjs(i.endTime).format('HH:mm');
                //         return `${dia} ${horaInicio}-${horaFin}`;
                //     }).join(', ');

                //     return `${id} | ${desc} | ${horarios}`;
                // });

                // // Enviamos todo en un solo mensaje
                // await flowDynamic('Estas son las clases registradas:');
                // for (const line of lines) {
                //     await flowDynamic([{ body: line.trim(), delay: generateTimer(150, 250) }]);
                // }


            }
            catch (error) {
                return fallBack('❗ Error al procesar la solicitud. Por favor, intenta de nuevo.');
            }
        })
        // .addAction(async (_, { flowDynamic }) => {
        //     const clases = await sessionService.findAll();
        //     if (!clases || clases.length === 0) {
        //         await flowDynamic('❗ No hay clases registradas.');
        //         return;
        //     }
        //     // Mapeamos cada sesión a una línea de salida
        //     const lines = clases.map((clase) => {
        //         // ID
        //         const id = clase.customId;

        //         // Descripción (hasta 40 chars)
        //         let desc = clase.description!;
        //         if (desc.length > 40) {
        //             desc = desc.slice(0, 40) + '…';
        //         }

        //         // Horarios
        //         const horarios = clase.schedules?.map((i) => {
        //             const dia = i.dayOfWeek
        //                 ? i.dayOfWeek
        //                 : dayjs(i.specificDate!).format('DD-MM');
        //             const horaInicio = dayjs(i.startTime).format('HH:mm');
        //             const horaFin = dayjs(i.endTime).format('HH:mm');
        //             return `${dia} ${horaInicio}-${horaFin}`;
        //         }).join(', ');

        //         return `${id} | ${desc} | ${horarios}`;
        //     });

        //     // Enviamos todo en un solo mensaje
        //     await flowDynamic('Estas son las clases registradas:');
        //     for (const line of lines) {
        //         await flowDynamic([{ body: line.trim(), delay: generateTimer(150, 250) }]);
        //     }
        // })
};
