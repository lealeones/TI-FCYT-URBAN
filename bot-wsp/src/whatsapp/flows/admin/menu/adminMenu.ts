import { addKeyword, EVENTS, MemoryDB } from "@builderbot/bot";
// import { BaileysProvider } from "@builderbot/provider-baileys";
import { BaileysProvider as Provider } from 'aurik3-builderbot-baileys-custom';

import { exitFlow, validateOption } from "~/whatsapp/utils/exitFlow";
import { UserService } from "~/user/user.service";
import { AuthService, TokenRedirectURL } from "~/auth/auth.service";

type PropsRegisterAdminMenu = {
    authService: AuthService;
    userService: UserService;
}

export const registerAdminMenu = ({
    authService,
    userService,
}: PropsRegisterAdminMenu) => {
    return addKeyword<Provider, MemoryDB>(EVENTS.ACTION)
        /* ──────────────────────────────────────────────────────
         * 1️⃣ Primer mensaje: saludo + lista de opciones
         * ────────────────────────────────────────────────────── */
        .addAction(async (ctx, { flowDynamic, endFlow, state }) => {
            const user = await userService.findByPhone(ctx.from);
            await flowDynamic(`👋 Hola admin ${user?.name}!`, { delay: 300 });

            if (!user) { return endFlow(); }
            await state.update({ user });

            await flowDynamic(
                `📚 ¿Qué quieres hacer?\n\n` +
                `1️⃣ Ingresar a la web\n` +
                `2️⃣ Modificar Clases\n` +
                `3️⃣ Modificar Usuarios\n` +
                `4️⃣ Configuración\n` +
                `Escribe *1*, *2*, *3*, *4*, o *cancelar* para salir.`,
                { delay: 300 },
            );
        })
        /* ──────────────────────────────────────────────────────
         * 2️⃣ Captura de la respuesta del usuario
         * ────────────────────────────────────────────────────── */
        .addAction({ capture: true }, async ({ body }, { endFlow, fallBack, state }) => {
            const input = body.trim().toLowerCase();

            // Verificar si el usuario quiere cancelar
            if (await exitFlow(input, endFlow, state)) {
                return; // exitFlow ya manejó el endFlow
            }

            // Validar que la opción sea válida
            if (!validateOption(input, ['1', '2', '3', '4'], fallBack)) {
                return; // validateOption ya ejecutó el fallBack
            }

            const user = state.get("user");
            const optionRedirect: Record<string, TokenRedirectURL> = {
                "1": TokenRedirectURL.FRONT,
                "2": TokenRedirectURL.SESSION,
                "3": TokenRedirectURL.USER,
                "4": TokenRedirectURL.CONFIG
            };

            const token = await authService.generarToken(user.id, optionRedirect[input]);

            return endFlow(`🔗 Ingresá a la web con este link: ${process.env.URL_FRONT}?t=${token}`);
        });
}
