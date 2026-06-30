import { InvoiceStatus } from '@prisma/client';

export interface AssistantInvoiceDto {
  id: string;
  name: string;
  hasInvoice: boolean;
  invoiceStatus: InvoiceStatus | null;
  invoiceId?: string | null;
  amount?: number | null;
}

export interface InvoicesByMonthResponseDto {
  sessionId: string;
  sessionCustomId: string;
  sessionDescription: string;
  sessionType: string;
  month: string;
  year: string;
  assistants: AssistantInvoiceDto[];
}
