// src/@core/hooks/useInstructors.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/apiClient';
import { useUserAuth } from '@/app/context/UserAuth';
import type { Instructor } from '@/app/modules/users/dto/instructor.dto';

type UseInstructorsResult = {
    data: Instructor[];
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
};

/**
 * Hook para obtener la lista de instructores.
 * - Lee el token del contexto.
 * - Maneja estados data/loading/error.
 * - Cancela la request al desmontar.
 */
export function useInstructors(enabled: boolean = true): UseInstructorsResult {
    const { token } = useUserAuth();

    const [data, setData] = useState<Instructor[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(
        async (signal?: AbortSignal) => {
            if (!token) {
                setData([]);
                setLoading(false);
                setError(null);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                const res = await apiClient.get<Instructor[]>('/users/instructor', { signal });

                setData(res.data ?? []);
            } catch (err: any) {
                if (err?.name !== 'CanceledError') {
                    const msg =
                        err?.response?.data?.message ||
                        err?.message ||
                        'Error al obtener instructores.';
                    setError(msg);
                }
            } finally {
                setLoading(false);
            }
        },
        [token]
    );

    useEffect(() => {
        if (!enabled) return;
        const ctrl = new AbortController();
        fetchData(ctrl.signal);
        return () => ctrl.abort();
    }, [enabled, fetchData]);

    const refresh = useCallback(async () => {
        await fetchData();
    }, [fetchData]);

    return { data, loading, error, refresh };
}

export default useInstructors;
