import { addKeyword, EVENTS, MemoryDB } from "@builderbot/bot";
import { TFlow } from "@builderbot/bot/dist/types";
// import { BaileysProvider } from "@builderbot/provider-baileys";
import { BaileysProvider as Provider } from 'aurik3-builderbot-baileys-custom';

import { exitFlow } from "~/whatsapp/utils/exitFlow";

export const registerUserFlow = ({ modifyUser, listUser }: {
    modifyUser: TFlow<Provider, any>,
    listUser: TFlow<Provider, any>,
}) => {
    return addKeyword<Provider, MemoryDB>(EVENTS.ACTION)
        .addAction(async (_, { flowDynamic }) => {
            await flowDynamic('🚻 *Gestión de Usuarios*');
            await flowDynamic('⌨ *Escribe el número de la opción que deseas realizar*');
            await flowDynamic('1️⃣ Modificar \n2️⃣ Ver usuarios\n\n:');
        })
        .addAction({ capture: true }, async (ctx, { gotoFlow, fallBack,endFlow, state }) => {
            const input = ctx.body.trim();
            //NOTE Salir del flujo
            exitFlow(input, endFlow, state);

            if (input === '1') return gotoFlow(modifyUser);
            if (input === '2') return gotoFlow(listUser);

            return fallBack('❌ Opción no válida. Escribe 1, 2');
        });
};
