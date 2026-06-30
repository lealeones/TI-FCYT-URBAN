import { addKeyword, EVENTS, MemoryDB } from "@builderbot/bot";
// import { BaileysProvider } from "@builderbot/provider-baileys";
import { BaileysProvider as Provider } from 'aurik3-builderbot-baileys-custom';

import { UserService } from "~/user/user.service";
import { exitFlow } from "~/whatsapp/utils/exitFlow";
import { SessionsService } from "../../../../sessions/sessions.service";
import { buildClaseMessage } from "~/whatsapp/utils/buildClaseMessage";

// PARA LISTAR LAS CLASES EN LAS QUE STOY INSCRITP
export const registerViewEnrolledClassesFlow = ({
    sessionService,
    userService,
}: {
    sessionService: SessionsService;
    userService: UserService;
}) => {
    return addKeyword<Provider, MemoryDB>(EVENTS.ACTION).addAction(
        { capture: false },
        async (ctx, { gotoFlow, fallBack, endFlow, flowDynamic, state }) => {
            await flowDynamic("📚 *Estas son tus clases*");

            const input = ctx.body.trim();
            exitFlow(input,  endFlow, state);

            const user = await userService.findByPhone(ctx.from);
            if (!user) {
                await flowDynamic("❗ No estás registrado.");
                return;
            }

            // Trae TODAS las clases donde el usuario NO es asistente (según tu servicio)
            const clases = await sessionService.findAllByUserId(user.id , true);

            if (!Array.isArray(clases) || clases.length === 0) {
                await flowDynamic("No encontramos clases para mostrar.");
                return;
            }

            // Construimos un mensaje por clase
            const lines = clases.map((clase: any) => buildClaseMessage(clase));

            // Enviamos en bloques (flowDynamic acepta array y los va mandando)
            await flowDynamic(lines);
        }
    );
};
