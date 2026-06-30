// useSessionInvoicesByMonth.ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '@/lib/apiClient';

export type InvoiceStatus = 'PENDING' | 'PAID' | 'CANCELED';

export type AssistantInvoice = {
    id: string;
    name: string;
    hasInvoice: boolean;
    invoiceStatus: InvoiceStatus | null;
    invoiceId: string | null;
    amount: number | null;
};

export type SessionInvoicesByMonth = {
    sessionId: string;
    sessionCustomId: string;
    sessionDescription: string;
    sessionType: string;
    month: string;
    year: string;
    assistants: AssistantInvoice[];
};

type Options = {
    sessionId: string;
    month: string; // "01" a "12"
    year: string; // "YYYY"
    auto?: boolean;
};

type UseSessionInvoicesByMonthResult = {
    data: SessionInvoicesByMonth | null;
    loading: boolean;
    error: unknown;
    refresh: () => Promise<void>;
};

export function useSessionInvoicesByMonth(
    opts: Options
): UseSessionInvoicesByMonthResult {
    const { sessionId, month, year, auto = true } = opts;

    const [data, setData] = useState<SessionInvoicesByMonth | null>(null);
    const [loading, setLoading] = useState<boolean>(auto);
    const [error, setError] = useState<unknown>(null);

    const abortRef = useRef<AbortController | null>(null);

    const refresh = useCallback(async () => {
        if (!sessionId || !month || !year) {
            setData(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        // Cancelar request previa si hubiera
        if (abortRef.current) abortRef.current.abort();
        const ac = new AbortController();
        abortRef.current = ac;

        try {
            const res = await apiClient.get<SessionInvoicesByMonth>(
                `/sessions/${sessionId}/invoices-by-month`,
                { params: { month, year }, signal: ac.signal }
            );
            setData(res.data);
        } catch (e: any) {
            if (e?.name === 'CanceledError' || e?.message === 'canceled') return;
            setError(e);
            console.error('Error al obtener facturas por mes:', e);
        } finally {
            if (!ac.signal.aborted) setLoading(false);
        }
    }, [sessionId, month, year]);

    useEffect(() => {
        if (auto) refresh();
        return () => {
            abortRef.current?.abort();
        };
    }, [auto, refresh]);

    return { data, loading, error, refresh };
}
