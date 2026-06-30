import { addKeyword, EVENTS, MemoryDB } from "@builderbot/bot";
// import { BaileysProvider } from "@builderbot/provider-baileys";
import { BaileysProvider as Provider } from 'aurik3-builderbot-baileys-custom';

import { UserService } from "~/user/user.service";
import { exitFlow } from "~/whatsapp/utils/exitFlow";
import { SessionsService } from "../../../../sessions/sessions.service";
import { buildClaseMessage } from "~/whatsapp/utils/buildClaseMessage";
import { TFlow } from "@builderbot/bot/dist/types";


export const registerViewNewKeysFlow = ({
    sessionService,
    userService,
    enrollNewClassesFlow
}: {
    sessionService: SessionsService;
    userService: UserService;
    enrollNewClassesFlow: TFlow<Provider, MemoryDB>
}) => {
    return addKeyword<Provider, MemoryDB>(EVENTS.ACTION).addAction(
        { capture: false },
        async (ctx, { gotoFlow, fallBack, endFlow, flowDynamic, state }) => {
            await flowDynamic("📚 *Listado de Clases*");

            const input = ctx.body.trim();
            if (await exitFlow(input, endFlow, state)) { return }


            const user = await userService.findByPhone(ctx.from);
            if (!user) {
                await flowDynamic("❗ No estás registrado.");
                return;
            }

            // Trae TODAS las clases donde el usuario NO es asistente (según tu servicio)
            const clases = await sessionService.findAllNotAssistantByUserId(user.id, true);

            if (!Array.isArray(clases) || clases.length === 0) {
                await flowDynamic("😪 No encontramos clases para mostrar. ");
                return endFlow();
            }

            // Construimos un mensaje por clase
            const lines = clases.map((clase: any) => buildClaseMessage(clase));

            // Enviamos en bloques (flowDynamic acepta array y los va mandando)
            await flowDynamic(lines);
            await flowDynamic('Quieres aprovechar e inscribirte en alguna de estas clases? Escribe *Si* o *No*');
        }
    ).addAction(
        { capture: true },
        async (ctx, { gotoFlow, fallBack, endFlow, flowDynamic, state }) => {
            const input = ctx.body.trim();
            if (await exitFlow(input, endFlow, state)) { return }

            if (input.toLowerCase() === 'si') {
                return gotoFlow(enrollNewClassesFlow)
            }

            await flowDynamic('Perfecto, si necesitas algo más, solo escríbeme. ¡Nos vemos!');
            return endFlow();
        })
};
