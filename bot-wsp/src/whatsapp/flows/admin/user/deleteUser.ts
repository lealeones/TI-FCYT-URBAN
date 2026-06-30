import { addKeyword, EVENTS, MemoryDB } from "@builderbot/bot";
// import { BaileysProvider } from "@builderbot/provider-baileys";
import { BaileysProvider as Provider } from 'aurik3-builderbot-baileys-custom';

import { exitFlow } from "~/whatsapp/utils/exitFlow";
import { validateCustomId } from "~/whatsapp/utils/validations/validateCustomId";
// import { IaService } from "../../../../ia/ia.service";
import { UserService } from "../../../../user/user.service";

export const registeDeleteUserFlow = ({ userService, iaService }: { userService: UserService, iaService: any }) => {
    return addKeyword<Provider, MemoryDB>(EVENTS.ACTION)
        .addAction(async ({ body }, { flowDynamic, endFlow, state }) => {
            await flowDynamic('🤔 ¿A que usuario daremos de baja?');
            await flowDynamic('ℹ Ejemplo: U-001');
            const input = body.trim();
            exitFlow(input,  endFlow, state);
        })
        .addAction({ capture: true }, async ({ body }, { state, flowDynamic, endFlow, fallBack }) => {
            const input = body.trim();
            exitFlow(input,  endFlow, state);

            const { customId, error } = validateCustomId(input, 'U')

            await flowDynamic(`Procesando`, { delay: 500 })

            //NOTE validacion del input del usuario
            if (error) {
                await flowDynamic(`❌${error}`);
                return fallBack('Por favor, intenta de nuevo.');
            }

            if (!customId) {
                return fallBack('❌ No se pudo procesar la información del usuario. Intenta de nuevo.');
            }

            const user = await userService.findByCustomId(customId);

            if (!user) {
                await flowDynamic(`🔍 No se encontró un usuario con el ID: ${customId}`)
                return fallBack('❌ Usuario no encontrado. Asegúrate de que el ID sea correcto.');
            }
            await state.update({ hash: user.customId });
            await flowDynamic(`⚠️ El usuario ${user.name} (${user.customId}) será dado de baja.`);

            await flowDynamic(`¿Queres dar de baja al usuario ${user.name} (${user.customId})? Responde *si* o *no* para confirmar la baja.`);
        })
        .addAction({ capture: true }, async (ctx, { state, flowDynamic, fallBack, endFlow }) => {
            const input = ctx.body.trim().toLowerCase();
            exitFlow(input,  endFlow, state);

            if (input.toLowerCase().includes('no') || input.toLowerCase().includes('cancelar')) {
                return endFlow('Cancelando modificacion de usuario. Nos vemos pronto!');
            }
            const customId = state.get('hash') as string
            try {
                const updateUser = await userService.deleteUser(customId);

                if (!updateUser) {
                    return endFlow('❌ Hubo un error al actualizar el usuario. Intenta de nuevo.');
                }
                return endFlow(`✅ Usuario ${updateUser.name} dado de baja correctamente.`);

            } catch (error) {
                return endFlow('❌ Error en el servidor. Intenta de nuevo más tarde.');
            }
        })
}