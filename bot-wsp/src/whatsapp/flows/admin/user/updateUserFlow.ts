import { addKeyword, EVENTS, MemoryDB } from "@builderbot/bot";
// import { BaileysProvider } from "@builderbot/provider-baileys";
import { BaileysProvider as Provider } from 'aurik3-builderbot-baileys-custom';

import { UserService } from "../../../../user/user.service";
// import { IaService } from "../../../../ia/ia.service";
import { validateUserInput } from "../../../utils/validateUserInput";
import { UserDataUpdate } from "~/user/user.dto";
import { exitFlow } from "~/whatsapp/utils/exitFlow";
import dayjs from "dayjs";

export const registerUpdateUserFlow = ({ userService, iaService }: { userService: UserService, iaService: any }) => {
    return addKeyword<Provider, MemoryDB>(EVENTS.ACTION)
        .addAction(async ({ body }, { flowDynamic, endFlow, state }) => {
            await flowDynamic('🙏 Voy a pedirte unos datos para modificar el usuario.');
            await flowDynamic('Ejemplo: U-001 Juan Perez 3435077510 18/12/1995');
            const input = body.trim();
            exitFlow(input,  endFlow, state);
        })
        .addAction({ capture: true }, async ({ body }, { state, flowDynamic, endFlow, fallBack }) => {
            const input = body.trim();
            exitFlow(input,  endFlow, state);

            await flowDynamic(`Procesando`, { delay: 500 })
            const { errors, data } = validateUserInput(input);

            //NOTE validacion del input del usuario
            if (errors.length) {
                for (const error of errors) {
                    await flowDynamic(`❌${error}`);
                }
                return fallBack('Por favor, intenta de nuevo.');
            }
            //TODO para hacer con IA
            //const response = await iaService.getUserUpdatePayload(input);

            if (!data) {
                return fallBack('❌ No se pudo procesar la información del usuario. Intenta de nuevo.');
            }

            const user = await userService.findByCustomId(data.customId);

            if (!user) {
                await flowDynamic(`🔍 No se encontró un usuario con el ID: ${data.customId}`)
                return fallBack('❌ Usuario no encontrado. Asegúrate de que el ID sea correcto.');
            }

            await flowDynamic(`⚠️ ¿Queres modificar el usuario nombre: ${user.name} (${user.customId})? \n*Nombre:* ${data.name} \n*Teléfono:* ${data.phone} \n*Fecha de nacimiento:* ${dayjs(data.birth).format('DD/MM/YYYY')}\n\nResponde *si* o *no* para confirmar la actualización.`);
            await state.update({ userData: data, hash: user.customId });
        })
        .addAction({ capture: true }, async (ctx, { state, flowDynamic, fallBack, endFlow }) => {
            const input = ctx.body.trim().toLowerCase();
            exitFlow(input,  endFlow, state);
            if (input.toLowerCase().includes('no') || input.toLowerCase().includes('cancelar')) {
                return endFlow('Cancelando modificacion de usuario. Nos vemos pronto!');
            }
            const userData = state.get('userData') as UserDataUpdate
            try {
                const updateUser = await userService.updateUserByCustomId(userData);

                if (!updateUser) {
                    return endFlow('❌ Hubo un error al actualizar el usuario. Intenta de nuevo.');
                }
                return endFlow(`✅ Usuario ${updateUser.name} actualizado correctamente.`);

            } catch (error) {
                return endFlow('❌ Error en el servidor. Intenta de nuevo más tarde.');
            }
        })
}