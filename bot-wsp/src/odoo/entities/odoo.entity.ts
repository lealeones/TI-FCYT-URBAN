
export type OdooInvoiceInput = {
  user: {
    id: string;
    dni: string;
  },
  product: {
    description: string;
    invoiceId: string;
    sessionId: string;
    amount: number;
  }
}

export type OdooInvoiceResponse = {
    jsonrpc: string,
  id: string,
  result: {
  invoiceId: string;
  base64Invoice: string; // PDF en base64
  linkPayment: string; // URL para pagar la factura
}}


export type OdooWebhook = {
  invoiceId: string;
  status: 'PENDING' | 'PAID' | 'CANCELED';
}

