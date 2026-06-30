// src/@core/hooks/useAttendeesSnapshot.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/apiClient';
import { useUserAuth } from '@/app/context/UserAuth';

export type ResponseAttendeesSnapshot = {
    dateRange: { start: string; end: string };
    instructors: { id: string; name: string }[];
    assistants: { id: string; name: string }[];
    attendance: { id: string; name: string }[];
};

export function useAttendeesSnapshot(snapshotId?: string, enabled: boolean = true) {
    const { token } = useUserAuth();
    const [data, setData] = useState<ResponseAttendeesSnapshot | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(
        async (signal?: AbortSignal) => {
            if (!enabled || !snapshotId) return;
            setLoading(true);
            setError(null);
            try {
                const res = await apiClient.get<ResponseAttendeesSnapshot>(
                    `/sessions/${snapshotId}/attendees`,
                    { signal }
                );
                setData(res.data);
            } catch (e: any) {
                if (e?.name === 'CanceledError') return;
                setError(e?.response?.data?.message ?? 'No se pudieron cargar los asistentes.');
            } finally {
                setLoading(false);
            }
        },
        [enabled, snapshotId, token]
    );

    useEffect(() => {
        const ctrl = new AbortController();
        fetchData(ctrl.signal);
        return () => ctrl.abort();
    }, [fetchData]);

    return { data, loading, error, refresh: fetchData };
}
