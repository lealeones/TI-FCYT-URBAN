import { addKeyword, EVENTS, MemoryDB } from "@builderbot/bot";
// import { BaileysProvider } from "@builderbot/provider-baileys";
import { BaileysProvider as Provider } from 'aurik3-builderbot-baileys-custom';
import dayjs from "dayjs";
import 'dayjs/locale/es';
import { chunkArray } from "~/whatsapp/utils/chunkArray";
import { exitFlow } from "~/whatsapp/utils/exitFlow";
// import { IaService } from "../../../../ia/ia.service";
import { UserService } from "../../../../user/user.service";
import { generateTimer } from "../../../utils/generateTimer";
dayjs.locale('es');

export const registerListUserFlow = ({ iaService, userService }: { iaService: any, userService: UserService }) => {
    return addKeyword<Provider, MemoryDB>(EVENTS.ACTION).addAnswer(`🔍 Buscando todos los usuarios:`)
        .addAction(async ({ body }, { flowDynamic, endFlow, state }) => {
            const input = body.trim().toLowerCase();
            exitFlow(input,  endFlow, state);

            const users = await userService.findAll();
            if (!users || users.length === 0) {
                await flowDynamic('❗ No hay usuarios registradas.');
                return;
            }

            // Mapeamos cada sesión a una línea de salida
            const lines = users.map((user) => {
                // ID
                const id = user.customId;

                // Descripción (hasta 40 chars)
                let desc = user.name!;
                if (desc.length > 40) {
                    desc = desc.slice(0, 40) + '…';
                }


                return `${id} | ${desc} `;
            });

            // Agrupar de a 50
            const batches = chunkArray(lines, 50);

            await flowDynamic('Estos son los usuarios registrados:');

            for (const batch of batches) {
                // Unimos el batch en un bloque
                const body = batch.join('\n');
                await flowDynamic([{ body, delay: generateTimer(200, 300) }]);
            }

            return endFlow('✅ Listado de usuarios finalizado.');
        });
};
