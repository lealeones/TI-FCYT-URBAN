import { addKeyword, EVENTS, MemoryDB } from "@builderbot/bot";
// import { BaileysProvider } from "@builderbot/provider-baileys";
import { BaileysProvider as Provider } from 'aurik3-builderbot-baileys-custom';

import { SessionsService } from "../../../../sessions/sessions.service";
import { SubscriptionsService } from "../../../../subscriptions/subscriptions.service";
import { exitFlow } from "../../../../whatsapp/utils/exitFlow";

// Helpers
const normalize = (s: string) =>
    (s || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .trim();

const isCancel = (s: string) => {
    const n = normalize(s);
    return ["cancelar", "salir", "cancel", "bye", "chau"].includes(n);
};
const isYes = (s: string) => {
    const n = normalize(s);
    return n === "si" || n === "sí" || n === "ok" || n === "dale";
};
const isNo = (s: string) => normalize(s) === "no";

// NOTE: PARA INSCRIBIRSE
export const registerEnrolledNewClassesFlow = ({
    sessionService,
    subscriptionsService,
}: {
    sessionService: SessionsService;
    subscriptionsService: SubscriptionsService;
}) => {
    return addKeyword<Provider, MemoryDB>(EVENTS.ACTION)

        // Paso 1: pedir ID de clase
        .addAction({ capture: false }, async (ctx, { flowDynamic, endFlow, state }) => {
            const user = state.get("user");
            if (!user?.id) {
                await flowDynamic("⚠️ No pudimos validar tu usuario.");
                return;
            }
            await flowDynamic(`📚 *¿A qué clase querés inscribirte ${user.name}?*`);
            await flowDynamic("✍️ Escribí el *ID* (customId) de la clase o mandá *cancelar* para salir.");
            const input = (ctx.body || "").trim();
            if (await exitFlow(input, endFlow, state)) { return }
        })

        // Paso 2: recibir ID, validar y confirmar
        .addAction({ capture: true }, async (ctx, { flowDynamic, endFlow, state }) => {
            const inputRaw = (ctx.body || "").trim();
            if (await exitFlow(inputRaw, endFlow, state)) { return }

            const user = state.get("user");
            if (!user?.id) {
                await flowDynamic("⚠️ No pudimos validar tu usuario.");
                return endFlow();
            }

            const customId = inputRaw.toUpperCase();
            if (customId.length > 10) {
                await flowDynamic(
                    "❗ *No encontramos la clase.* Verificá el ID e intentá de nuevo."
                );
                return endFlow();
            }

            try {
                const session = await sessionService.findByCustomId(customId);
                if (!session) {
                    await flowDynamic(
                        "❗ *No encontramos la clase.* Verificá el ID e intentá de nuevo."
                    );
                    return endFlow();
                }

                // Mini resumen de la clase
                await flowDynamic([
                    "📝 *Resumen de la clase:*",
                    `• *ID:* ${session.customId}`,
                    `• *Nombre:* ${session.description}`,
                ].join("\n"));

                await flowDynamic("✅ ¿Confirmás la *inscripción* a esta clase? Responé *Sí* o *No*.");
                state.update({ session });
            } catch (error) {
                console.error('Error al buscar la clase:', error);
                await flowDynamic("❗ No pudimos buscar la clase. Intentá más tarde, por favor.");
                return endFlow();
            }
        })

        // Paso 3: confirmar y procesar inscripción + suscripción
        .addAction({ capture: true }, async (ctx, { fallBack, flowDynamic, endFlow, state }) => {
            const confirmRaw = (ctx.body || "").trim();
            exitFlow(confirmRaw, endFlow, state);

            if (isCancel(confirmRaw) || isNo(confirmRaw)) {
                await flowDynamic("❌ *Inscripción cancelada.* Si querés, podés elegir otra clase más tarde 🙌");
                return endFlow();
            }
            if (!isYes(confirmRaw)) {
                fallBack("🤔 No entendí. Por favor respondé *Sí* para inscribirte o *No* para cancelar.")
            }

            const user = state.get("user");
            const session = state.get("session");
            if (!user?.id || !session?.id) {
                await flowDynamic("⚠️ Ocurrió un problema con tus datos.");
                return endFlow();
            }

            // Agregar como asistente a la clase Y crear suscripción en una sola transacción
            try {
                // Usar la función transaccional que maneja ambas operaciones atómicamente
                const result = await sessionService.transactionAddAssistantAndCreateInvoice(
                    session.id, 
                    user.id
                );

                await flowDynamic(`✅ *¡Listo!* Te inscribiste a *${session.customId}. ${session.description}* 🎉`);
                await flowDynamic("🧾 *En breve te enviaremos el link de pago online.*");

                // Generar link de pago (esto no es parte de la transacción porque involucra APIs externas)
                try {
                    const invoiceId = result.invoice.id;
                    
                    // La factura ya tiene link de pago creado en el servicio
                    if (!result.invoice.linkPayment) {
                        await flowDynamic("❗ Se completó la inscripción pero no pudimos generar el link de pago. Te contactaremos pronto.");
                        return endFlow();
                    }

                    await flowDynamic(`💳 *Link de pago:* ${result.invoice.linkPayment}`);
                    await flowDynamic("🙏 ¡Gracias por elegirnos! Cualquier duda, estamos acá para ayudarte. ❤️");

                    return endFlow();
                } catch (paymentLinkError) {
                    console.error('Error obteniendo datos de pago:', paymentLinkError);
                    await flowDynamic("✅ Tu inscripción fue exitosa. Te enviaremos el link de pago por separado.");
                    return endFlow();
                }

            } catch (transactionError: any) {
                console.error('Error en transacción de inscripción:', transactionError);
                
                // Como es una transacción, si falla, todo se revierte automáticamente
                const errorMessage = transactionError?.message || '';
                
                if (errorMessage.includes('already an assistant')) {
                    await flowDynamic("❗ Ya estás inscripto en esta clase.");
                } else if (errorMessage.includes('not found')) {
                    await flowDynamic("❗ La clase o tu usuario no se encontraron. Intentá más tarde.");
                } else {
                    await flowDynamic("❗ No pudimos completar la inscripción. Intentá más tarde, por favor.");
                }
                return endFlow();
            }
        });
};
