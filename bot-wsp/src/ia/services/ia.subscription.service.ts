import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { Session, User, Prisma, } from '@prisma/client';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
// import { IaService } from '../ia.service';
import { link } from 'fs';
import { builderSubscriptionPrompt } from './builderSubscriptionPrompt';

type SubscriptionWithDataInvoices = {
    id: string;
    userId: string;
    sessionId: string;
    base64: string;
    linkPayment: string;
}

type CreateInvoiceOdoo = {
    user: {
        userCode: string;
        dni?: string;
    }
    product: {
        description: string;
        productCode: string;
        amount: number;
    }
}

type ResponseInvoiceOdoo = {
    linkPayment: string;
    linkInvoice: string; // URL de la factura
    invoice: string // base 64
}

type ResponseSubscribeFromNaturalMessage = {
    message: string;
    invoice64: string;
    linkPayment: string;
}


type ProductsModels = Session

@Injectable()
export class IaSubscriptionService {
    private readonly logger = new Logger(IaSubscriptionService.name);

    constructor(
       // private iaService: any, // Asegúrate de importar IaService correctamente
        private readonly prisma: PrismaService,
        private httpService: HttpService, // Asegúrate de importar HttpService si lo necesitas
    ) {
        this.logger.log('IaSubscriptionService initialized');
    }

    async subscribeFromNaturalMessage(input: string, esAdmin: boolean = false): Promise<ResponseSubscribeFromNaturalMessage> {
        try {
            //const a = await this.iaService.
            type ResponseIaSubscription = {
                user: {
                    name: string,
                    customId: string,
                },
                product: {
                    description: string,
                    customId: string,
                },
                discount?: number,
                mode: 'assistant' | 'instructor',
            }
            const prompt = builderSubscriptionPrompt(input);

            const { data } = await firstValueFrom(
                this.httpService.post(process.env.URL_IA!, {
                    prompt,
                    max_tokens: 256,
                    temperature: 0.2,
                    stop: ['Entrada:', '\n\n'],
                }),
            );

            const { choices } = data;
            const choice = choices[0];

            if (choice.finish_reason !== 'stop') {
                throw new Error('La respuesta fue incompleta o abortada.');
            }

            const responseText = choice.text.trim();

            // Parseamos el JSON que viene como string
            const jsonResponse = JSON.parse(responseText);
            // TODO: Replace this with actual response from IA service
            const response = jsonResponse as ResponseIaSubscription;
            if (!response) {
                throw new Error('No response from IA service');
            }

            const nameParts = response.user.name?.split(' ').filter(part => part.length >= 3) || [];

            if (nameParts.length < 2 && !response.user.customId) {
                throw new Error('No se pudo inferir suficiente información para buscar el usuario.');
            }

            const whereConditions: any = {};

            if (response.user.customId) {
                whereConditions.customId = response.user.customId;
            } else if (nameParts.length >= 2) {
                whereConditions.AND = [
                    { name: { contains: nameParts[0], mode: 'insensitive' } },
                    { name: { contains: nameParts[nameParts.length - 1], mode: 'insensitive' } }
                ];
            }

            const user = await this.prisma.user.findMany({
                where: whereConditions,
                take: 1
            });

            if (user.length === 0) {
                throw new Error('User not found');
            } else if (user.length > 1) {
                this.logger.warn(`Multiple users found for query: ${JSON.stringify(whereConditions)}. Using the first one.`);
            }

            const descriptionParts = response.product.description?.split(' ').filter(part => part.length >= 3) || [];

            if (descriptionParts.length === 0 && !response.product.customId) {
                throw new Error('No se pudo inferir suficiente información para buscar el producto.');
            }

            const whereProductConditions: any = {};

            if (response.product.customId) {
                whereProductConditions.customId = response.product.customId;
            } else {
                whereProductConditions.AND = [
                    // oj que busca solo por el primer
                    { description: { contains: descriptionParts[0], mode: 'insensitive' } },
                    // { description: { contains: descriptionParts[descriptionParts.length - 1], mode: 'insensitive' } }
                ];
            }
            const modelName = 'session'; // Asumiendo que el modelo es Session
            const product = await this.prisma?.[modelName].findMany({
                where: whereProductConditions
            });

            if (product.length === 0) {
                throw new Error('Producto no encontrado.');
            }

            if (product.length > 1) {
                throw new Error('La búsqueda devolvió múltiples productos. Por favor, proporciona más información para identificarlo correctamente.');
            }

            if (!user || !product) {
                throw new Error('User or product not found');
            }

            if (!response.mode) {
                this.logger.debug(`No mode provided for subscription, defaulting to 'assistant'`);
            }

            const subscribe = await this.subscribe(user[0], product[0], response.mode);

            const responseService = {
                message: `User ${user[0].name} subscribed to product ${product[0].description} with mode ${response.mode}. Invoice ID: ${subscribe.id}`,
                invoice64: subscribe.base64, // Asumiendo que la factura es un base64
                linkPayment: subscribe.linkPayment, // URL de pago
            }

            return responseService

        }
        catch (error: any) {
            throw new Error(`Failed to subscribe: ${error.message}`);
        }
    }


    // Ejemplo de método para suscribirse
    async subscribe(user: User, product: ProductsModels, mode: 'assistant' | 'instructor'): Promise<SubscriptionWithDataInvoices> {
        try {
            this.logger.log(`User ${user.id} subscribed`);

            // Use explicit model access instead of dynamic string indexing
            const updateProduct = await this.prisma.session.update({
                where: { id: product.id },
                data: {
                    ...(mode === 'instructor' ? { instructors: { connect: { id: user.id } } } : {}), // Conectar el usuario como instructor
                    ...(mode === 'assistant' ? { assistants: { connect: { id: user.id } } } : {}), // Conectar el usuario como asistente
                }
            })

            const createInvoiceOdoo: CreateInvoiceOdoo = {
                user: {
                    userCode: user.id,
                    dni: user.dni || undefined, // Asumiendo que el usuario tiene un campo dni
                },
                product: {
                    description: updateProduct.description,
                    productCode: updateProduct.customId,
                    amount: updateProduct.amount || 11, // Monto ficticio
                }
            }

            const { data } = await lastValueFrom(
                this.httpService.post<ResponseInvoiceOdoo>(
                    process.env.URL_INVOICE_ODOO!, // URL ficticia del API de Odoo
                    createInvoiceOdoo as CreateInvoiceOdoo , {
                        headers: {
                            'Content-Type': 'application/json',
                    }}
                )
            )
            //@ts-ignore
            const { invoice, linkInvoice, linkPayment } = data['result'] || {}

            // Crear factura directamente sin suscripción intermedia
            const createdInvoice = await this.prisma.invoice.create({
                data: {
                    userId: user.id,
                    sessionId: product.id,
                    amount: product.amount || 1, // Monto ficticio
                    dateInvoice: new Date(), // Mes actual
                    base64Invoice: invoice,
                    linkPayment: linkPayment,
                    status: 'PENDING'
                }
            });

            // Retornar en formato compatible
            return { 
                id: createdInvoice.id, 
                userId: user.id,
                sessionId: product.id,
                base64: invoice, 
                linkPayment 
            };
        }
        catch (error: any) {

            throw new Error(`Failed to subscribe user ${user.id}: ${error.message}`);

        }
    }

    // Ejemplo de método para cancelar suscripción
    unsubscribe(userId: string): string {
        this.logger.log(`User ${userId} unsubscribed`);
        return `User ${userId} unsubscribed successfully`;
    }
}