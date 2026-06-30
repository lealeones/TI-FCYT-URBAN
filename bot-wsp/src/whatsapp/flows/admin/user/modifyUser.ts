import { addKeyword, EVENTS, MemoryDB } from "@builderbot/bot";
import { TFlow } from "@builderbot/bot/dist/types";
// import { BaileysProvider } from "@builderbot/provider-baileys";
import { BaileysProvider as Provider } from 'aurik3-builderbot-baileys-custom';

import { exitFlow } from "~/whatsapp/utils/exitFlow";

export const registerModifyUser = ({ deleteUser, updateUser }: {
    deleteUser: TFlow<Provider, any>,
    updateUser: TFlow<Provider, any>,
}) => {
    return addKeyword<Provider, MemoryDB>(EVENTS.ACTION)
        .addAction(async (_, { flowDynamic }) => {
            await flowDynamic('⚙ *Modificar Usuarios*');
            await flowDynamic('⌨ *Escribe el número de la opción que deseas realizar*');
            await flowDynamic('1️⃣ Alta \n2️⃣ Modificar\n 3️⃣Baja');
        })
        .addAction({ capture: true }, async (ctx, { gotoFlow, fallBack, state }) => {
            const input = ctx.body.trim();
            //NOTE Salir del flujo
            exitFlow(input,  fallBack, state);

            if (input === '1') return gotoFlow(updateUser);
            if (input === '2') return gotoFlow(updateUser);
            if (input === '3') return gotoFlow(deleteUser);


            return fallBack('❌ Opción no válida. Escribe *1*, *2*, *3* o cancelar para salir.');
        });
};
