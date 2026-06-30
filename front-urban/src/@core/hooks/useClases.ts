// useClases.ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '@/lib/apiClient';
import { Clase } from '@/views/clases/DetailClaseDialog';

type Options = {
    /** Lanza el fetch al montar el hook (default: true) */
    auto?: boolean;
    /** Filtro de estado: 'all', 'active', 'inactive' */
    status?: 'all' | 'active' | 'inactive';
};

type UseClasesResult = {
    data: Clase[];
    loading: boolean;
    error: unknown;
    /** Vuelve a pedir la lista */
    refresh: () => Promise<void>;
    /** Setea manualmente el array (útil para optimist updates) */
    setData: React.Dispatch<React.SetStateAction<Clase[]>>;
};

export function useClases(opts: Options = {}): UseClasesResult {
    const { auto = true, status = 'all' } = opts;

    const [data, setData] = useState<Clase[]>([]);
    const [loading, setLoading] = useState<boolean>(auto);
    const [error, setError] = useState<unknown>(null);

    // guardamos una referencia al abortController para cancelar en unmount
    const abortRef = useRef<AbortController | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);

        // cancelar request previa si hubiera
        if (abortRef.current) abortRef.current.abort();
        const ac = new AbortController();
        abortRef.current = ac;

        try {
            const params = status && status !== 'all' ? { status } : undefined;
            const res = await apiClient.get<Clase[]>('/sessions', { params, signal: ac.signal });
            setData(res.data ?? []);
        } catch (e: any) {
            if (e?.name === 'CanceledError' || e?.message === 'canceled') return;
            setError(e);
            console.error('Error al obtener clases:', e);
        } finally {
            if (!ac.signal.aborted) setLoading(false);
        }
    }, [status]);

    useEffect(() => {
        if (auto) refresh();
        return () => {
            // cancelar si el componente se desmonta
            abortRef.current?.abort();
        };
    }, [auto, refresh]);

    return { data, loading, error, refresh, setData };
}
