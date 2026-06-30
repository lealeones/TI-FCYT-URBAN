// useSessionParticipants.ts
'use client';
import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/apiClient';

export type Participant = { id: string; name: string; customId?: string };

export function useSessionParticipants(token: string, sessionId: string, auto = true) {
    const [selected, setSelected] = useState<Participant[]>([]);
    const [available, setAvailable] = useState<Participant[]>([]);
    const [loading, setLoading] = useState(auto);
    const [error, setError] = useState<unknown>(null);

    const refresh = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const { data } = await apiClient.get(`/sessions/${sessionId}/participants`);
            setSelected(data.selected);
            setAvailable(data.available);
        } catch (e) { setError(e); } finally { setLoading(false); }
    }, [sessionId]);

    const save = useCallback(async () => {
        await apiClient.put(`/sessions/${sessionId}/participants`, {
            userIds: selected.map(s => s.id),
        });
    }, [sessionId, selected]);

    useEffect(() => { if (auto) refresh(); }, [auto, refresh]);

    // helpers UI
    const add = (p: Participant) => {
        setAvailable(prev => prev.filter(x => x.id !== p.id));
        setSelected(prev => [...prev, p]);
    };
    const remove = (p: Participant) => {
        setSelected(prev => prev.filter(x => x.id !== p.id));
        setAvailable(prev => [...prev, p]);
    };

    return { selected, available, setSelected, setAvailable, loading, error, refresh, save, add, remove };
}
