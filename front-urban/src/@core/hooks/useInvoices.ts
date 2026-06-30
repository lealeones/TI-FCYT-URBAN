'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '@/lib/apiClient';
export type InvoiceStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELED';

export type InvoiceWithDescription = {
    id: string;
    subscriptionId: string;
    base64Invoice: string | null;
    linkPayment: string | null;
    status: InvoiceStatus | string;
    amount: number;
    createdAt: string | Date;
    updatedAt: string | Date;
    description: string;
};

export type UseInvoicesOptions = {
    auto?: boolean;
};

export type UseInvoicesResult = {
    data: InvoiceWithDescription[];
    loading: boolean;
    error: unknown;
    refresh: () => Promise<void>;
    setData: React.Dispatch<React.SetStateAction<InvoiceWithDescription[]>>;
};

export function useInvoices(
    userId: string,
    opts: UseInvoicesOptions = {}
): UseInvoicesResult {
    const { auto = true } = opts;

    const [data, setData] = useState<InvoiceWithDescription[]>([]);
    const [loading, setLoading] = useState<boolean>(auto);
    const [error, setError] = useState<unknown>(null);

    const abortRef = useRef<AbortController | null>(null);

    const refresh = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        setError(null);
        if (abortRef.current) abortRef.current.abort();
        const ac = new AbortController();
        abortRef.current = ac;

        try {
            const res = await apiClient.get<InvoiceWithDescription[] | null>(`/invoices/${encodeURIComponent(userId)}`, { signal: ac.signal });
            setData((res.data ?? []) as InvoiceWithDescription[]);
        } catch (e: any) {
            if (e?.name === 'CanceledError' || e?.message === 'canceled') return;
            setError(e);
        } finally {
            if (!ac.signal.aborted) setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        if (auto) refresh();
        return () => abortRef.current?.abort();
    }, [auto, refresh, userId]);

    return { data, loading, error, refresh, setData };
}
