'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/apiClient';
import type { InvoiceStatus } from './useInvoices';

export type UpdateInvoiceStatusParams = {
    userId: string;
    invoiceId: string;
    status: InvoiceStatus;
};

export type UpdateInvoiceStatusOptions = {
    onSuccess?: () => void | Promise<void>;
    onError?: (error: any) => void;
};

export type UpdateInvoiceStatusResult = {
    mutate: (params: UpdateInvoiceStatusParams) => Promise<void>;
    loading: boolean;
    error: unknown;
    isSuccess: boolean;
    reset: () => void;
};

/**
 * Hook para actualizar el estado de una factura
 * 
 * @example
 * ```tsx
 * const { mutate, loading, error, isSuccess } = useUpdateInvoiceStatus({
 *   onSuccess: () => {
 *     toast.success('Factura actualizada');
 *     refetchInvoices();
 *   },
 *   onError: (error) => {
 *     toast.error('Error al actualizar factura');
 *   }
 * });
 * 
 * // Usar la mutación
 * await mutate({ 
 *   userId: 'user-123', 
 *   invoiceId: 'invoice-456', 
 *   status: 'PAID' 
 * });
 * ```
 */
export function useUpdateInvoiceStatus(
    options: UpdateInvoiceStatusOptions = {}
): UpdateInvoiceStatusResult {
    const { onSuccess, onError } = options;

    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<unknown>(null);
    const [isSuccess, setIsSuccess] = useState<boolean>(false);

    const mutate = useCallback(
        async ({ userId, invoiceId, status }: UpdateInvoiceStatusParams) => {
            if (!userId || !invoiceId || !status) {
                const validationError = new Error('userId, invoiceId y status son requeridos');
                setError(validationError);
                onError?.(validationError);
                throw validationError;
            }

            setLoading(true);
            setError(null);
            setIsSuccess(false);

            try {
                await apiClient.put(
                    `/invoices/${encodeURIComponent(userId)}/${encodeURIComponent(invoiceId)}`,
                    { status }
                );

                setIsSuccess(true);

                // Ejecutar callback de éxito
                await onSuccess?.();
            } catch (e: any) {
                setError(e);
                setIsSuccess(false);
                onError?.(e);
                throw e;
            } finally {
                setLoading(false);
            }
        },
        [onSuccess, onError]
    );

    const reset = useCallback(() => {
        setLoading(false);
        setError(null);
        setIsSuccess(false);
    }, []);

    return { mutate, loading, error, isSuccess, reset };
}
