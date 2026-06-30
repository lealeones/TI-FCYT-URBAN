import { addKeyword, EVENTS, MemoryDB } from "@builderbot/bot";
// import { BaileysProvider } from "@builderbot/provider-baileys";
import { BaileysProvider as Provider } from 'aurik3-builderbot-baileys-custom';

import dayjs from "dayjs";
import 'dayjs/locale/es';
import { IaSubscriptionService } from "~/ia/services/ia.subscription.service";
dayjs.locale('es');

export const registerCreateSubscriptionFlow = ({ iaService }: { iaService: IaSubscriptionService }) => {
    return addKeyword<Provider, MemoryDB>(EVENTS.ACTION)
        // Primer paso: solicitar descripción
        .addAction(async (ctx, { flowDynamic, state }) => {
            await flowDynamic('ℹ️ Ejemplos:\n Vincular a Lea leones a la clase de latino con un 40% de descuento');
            // const input = ctx.body.trim().toLocaleLowerCase();
        })
        // Segundo paso: procesar mensaje del usuario con IA
        .addAction({ capture: true }, async (ctx, { state, flowDynamic, fallBack }) => {
            try {
                // ver si es admin 
                if (ctx.from !== '5493436453348' || !ctx.body) {
                    return
                }
                const esAdmin: boolean = true
                const input = ctx.body.trim().toLocaleLowerCase();

                if (input.length > 100) {
                    return fallBack('El mensaje es demasiado largo. Intenta con una descripción más corta.');
                }

                if (input.includes('cancelar')) {
                    state.clear();
                    return await flowDynamic('❌ Creacion cancelada.');
                }

                await flowDynamic('⏳ Procesando...');

                const response = await iaService.subscribeFromNaturalMessage(input, esAdmin);

                if (!response) {
                    state.clear();
                    return fallBack('❌ No se pudo vincular. Intenta de nuevo.');
                }

                await state.update({ base64: response.invoice64 });

                await flowDynamic(response.message);
                await flowDynamic(`Link de pago: ${response.linkPayment}`);
                await flowDynamic(`Quieres que te nevie la factura? si / no`);

            } catch (error) {
                console.error('Error al procesar el mensaje:', error);
                return fallBack('❌ Ocurrió un error inesperado. Intenta de nuevo.');
            }
        })

        // Tercer paso: confirmar creación de la sesión
        .addAction({ capture: true }, async (ctx, { state, flowDynamic, fallBack, endFlow, }) => {
            try {
                const input = ctx.body.trim().toLowerCase();

                if (input !== 'si' && input !== 'no') {
                    return fallBack('❗ Responde exactamente *si* o *no*.');
                }

                // Si el usuario cancela
                if (input === 'no') {
                    state.clear();
                    return endFlow('Nos vemos pronto!');
                }

                const urlGetPdf = state.get('base64').replace('http://', 'https://');

                //const path = await saveBase64AsPdf(pdfBase64);

                await flowDynamic([{ media: urlGetPdf, body: 'Factura generada' }]);


                state.clear();
                return endFlow('Aqui esta la factura, nos vemos pronto!');
            } catch (error) {
                console.error('Error al crear la sesión:', error);
                await state.clear();
                return fallBack('❌ Ocurrió un error al crear la clase. Intenta de nuevo.');
            }
        })
};


import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

const saveBase64AsPdf = (base64: string): Promise<string> => {
    const buffer = Buffer.from(base64, 'base64');
    const fileName = `${uuidv4()}.pdf`;
    const filePath = path.join(__dirname, '..', 'public', 'pdfs', fileName);

    // Asegurate de tener creada la carpeta 'public/pdfs'
    fs.writeFileSync(filePath, buffer);

    // Devolver la URL pública
    return Promise.resolve(`https://tuservidor.com/pdfs/${fileName}`);
}
