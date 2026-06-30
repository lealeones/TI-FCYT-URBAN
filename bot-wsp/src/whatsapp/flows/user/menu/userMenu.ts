import { addKeyword, EVENTS, MemoryDB } from "@builderbot/bot";
import { TFlow } from "@builderbot/bot/dist/types";
// import { BaileysProvider } from "@builderbot/provider-baileys";
import { BaileysProvider as Provider } from 'aurik3-builderbot-baileys-custom';

import { InvoicesService } from "~/invoices/invoices.service";
import { UserService } from "~/user/user.service";
import { AuthService } from "../../../../auth/auth.service";
import { exitFlow } from "../../../../whatsapp/utils/exitFlow";

type PropsUserMenu = {
    viewPaymentStatusFlow: TFlow<Provider, MemoryDB>;
    viewEnrolledClassesFlow: TFlow<Provider, MemoryDB>;
    viewNewKeysFlow: TFlow<Provider, MemoryDB>;
    enrollNewClassesFlow: TFlow<Provider , MemoryDB>;
    authService: AuthService;
    invoicesService: InvoicesService;
    userService: UserService;
};

const userMenuText =
    `💳 Este es tu menu:\n\n` +
    `1️⃣ Consultar estado de pago\n` +
    `2️⃣ Ver inscripcion a clases\n` +
    `3️⃣ Consultar nuevas clases\n` +
    `4️⃣ Inscribirse a nuevas clases\n\n` +
    `Escribe *1*, *2*, *3*, *4* o *cancelar* para salir.`;

const renderMenu = async (flowDynamic: any) => {
    await flowDynamic(userMenuText, { delay: 300 });
};

export const registerUserMenu = ({
    viewPaymentStatusFlow,
    viewEnrolledClassesFlow,
    viewNewKeysFlow,
    enrollNewClassesFlow,
    invoicesService,
    userService,
}: PropsUserMenu) => {
    return addKeyword<Provider, MemoryDB>(EVENTS.ACTION)
        // 1) Mensaje inicial
        .addAction(async ({ from, body }, { flowDynamic, state, endFlow }) => {
            const input = (body ?? "").trim().toLowerCase();
            const user = await userService.findByPhone(from);

            if (await exitFlow(input, endFlow, state)) return; // 👈 cortar
            // console.log("USER MENU - USUARIO: ", ctx);

            if (!user) {
                await flowDynamic("❗ No estás registrado.");
                return;
            }
            state.update({ user });

            await flowDynamic(`👋 ¡Hola ${user.name}! ¿en qué te puedo ayudar?`, { delay: 250 });
            await renderMenu(flowDynamic)
        })
        // 3) Respónde el menu usuario (resolver por números)
        .addAction(
            { capture: true },
            async ({ body, from }, { gotoFlow, endFlow, fallBack, flowDynamic, state }) => {
                const input = (body ?? "").trim().toLowerCase();


                if (await exitFlow(input, endFlow, state)) return; // 👈 cortar
                if (input === "1") {
                    // const res = await handleOption1SideEffects(from, userService, invoicesService, flowDynamic);
                    // if (res.end) return endFlow();
                    return gotoFlow(viewPaymentStatusFlow);
                }
                if (input === "2") return gotoFlow(viewEnrolledClassesFlow);
                if (input === "3") return gotoFlow(viewNewKeysFlow);
                if (input === "4") return gotoFlow(enrollNewClassesFlow);

                return fallBack(`❌ Opción no válida. Escribe *1*, *2*, *3*, *4* o *cancelar*`);
                //NOTE - QUE HACEMOS ACA ? 
                await renderMenu(flowDynamic);
            }
        );
};



const handleOption1SideEffects = async (
    from: string,
    userService: UserService,
    invoicesService: InvoicesService,
    flowDynamic: any
) => {
    await flowDynamic(`🔄 Consultando estado de pago...`, { delay: 250 });

    const usuario = await userService.findByPhone(from);
    if (!usuario) {
        await flowDynamic(`❌ No pudimos encontrarte en nuestro sistema.`, { delay: 250 });
        return { end: true };
    }

    const tieneFacturaPagada = await invoicesService.hasUnpaidInvoiceThisMonth(usuario.id);
    if (tieneFacturaPagada) {
        await flowDynamic(`✅ Tu estado de pago está al día. ¡Gracias!`, { delay: 250 });
    } else {
        await flowDynamic(`❌ Tu estado de pago está *pendiente*.`, { delay: 250 });
    }
    await flowDynamic(`✅ Consulta realizada.`, { delay: 200 });
    return { end: false };
};