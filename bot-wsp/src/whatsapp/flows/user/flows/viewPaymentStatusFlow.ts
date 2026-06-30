import { addKeyword, EVENTS, MemoryDB } from "@builderbot/bot";
// import { BaileysProvider } from "@builderbot/provider-baileys";
import { BaileysProvider as Provider } from 'aurik3-builderbot-baileys-custom';

import { UserService } from "~/user/user.service";
import { exitFlow } from "~/whatsapp/utils/exitFlow";
import { SessionsService } from "../../../../sessions/sessions.service";
import { InvoicesService } from "~/invoices/invoices.service";
import { InvoiceStatus } from "@prisma/client";


export const registerViewPaymentStatusFlow = ({
    sessionService,
    userService,
    invoicesService,
}: {
    sessionService: SessionsService;
    userService: UserService;
    invoicesService: InvoicesService;
}) => {
    return addKeyword<Provider, MemoryDB>(EVENTS.ACTION).addAction(
        { capture: false },
        async (ctx, { gotoFlow, fallBack, endFlow, flowDynamic, state }) => {

            const input = ctx.body.trim();
            if (await exitFlow(input,  endFlow, state)) { return }

            const user = await userService.findByPhone(ctx.from);

            if (!user) { return endFlow() }

            state.update({ user });

            const invoices = await invoicesService.findInvoiceThisMonthByUserId(user.id);
            if (!invoices || invoices.length === 0) {
                await flowDynamic("❗ No tenés facturas este mes.");
                return endFlow();
            } else {
                let mensaje = "🧾 *Tus facturas de este mes:*\n\n"
                invoices.forEach((invoice) => {
                    mensaje += (invoice.status !== InvoiceStatus.PENDING ? '🟢' : '🔴🐀') + `- Clase: ${invoice.description}, Estado: ${invoice.status}, Monto: ${invoice.amount} ` + (invoice.status !== InvoiceStatus.PENDING ? '' : `link: ${invoice.linkPayment}`) + `\n`;
                });
                await flowDynamic(mensaje);
                await flowDynamic('Para más información contactarse con el administrador.');
                return endFlow();
            }
        }
    )
};
