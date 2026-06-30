import { addKeyword, EVENTS, MemoryDB } from "@builderbot/bot";
// import { BaileysProvider } from "@builderbot/provider-baileys";
import { BaileysProvider as Provider } from 'aurik3-builderbot-baileys-custom';

import { TFlow } from "@builderbot/bot/dist/types";
import { SessionsService } from "../../../../sessions/sessions.service";
import { exitFlow } from "~/whatsapp/utils/exitFlow";

export const registerSessionFlow = ({ sessionService, createSessionFlow, listSession }: {
    sessionService: SessionsService,
    createSessionFlow: TFlow<Provider, any>,
    listSession: TFlow<Provider, any>,
}) => {
    return addKeyword<Provider, MemoryDB>(EVENTS.ACTION)
        .addAction(async (_, { flowDynamic }) => {
            await flowDynamic('📚 *Gestión de Clases*');
            await flowDynamic('1️⃣ Crear nueva clase\n2️⃣ Ver clases\n3️⃣ Agregar asistente\n4️⃣ Agregar profesor\n');
            await flowDynamic('Escribe el número de la opción que deseas realizar:');
        })
        .addAction({ capture: true }, async (ctx, { gotoFlow, fallBack, endFlow, flowDynamic, state }) => {
            const input = ctx.body.trim();
            exitFlow(input,  endFlow, state);

            if (input === '1') return gotoFlow(createSessionFlow);
            if (input === '2') return gotoFlow(listSession);
            //if (option === '2') return gotoFlow(modifySessionFlow({ sessionService }));
            // if (option === '3') return gotoFlow(addAssistantFlow({ sessionService }));
            // if (option === '4') return gotoFlow(addInstructorFlow({ sessionService }));

            return fallBack('❌ Opción no válida. Escribe 1, 2, 3 o 4.');
        });
};
