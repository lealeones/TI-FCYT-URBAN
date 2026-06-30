import apiClient from '@/lib/apiClient';

export const downloadInvoicePdf = async (invoiceId: string) => {
    const response = await apiClient.get(
        `/invoices/download/${invoiceId}`,
        { responseType: 'blob' }
    );

    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `factura-${invoiceId}.pdf`;
    a.click();

    URL.revokeObjectURL(url);
};
