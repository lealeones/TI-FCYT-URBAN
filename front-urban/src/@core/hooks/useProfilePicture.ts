'use client';

import { useState, useCallback, useEffect } from 'react';
import apiClient from '@/lib/apiClient';

export type ProfilePictureResponse = {
    profilePicture: string | null;
    updatedAt: string | null;
};

export type UseProfilePictureOptions = {
    auto?: boolean;
};

export type UseProfilePictureResult = {
    profilePicture: string | null;
    updatedAt: string | null;
    loading: boolean;
    error: unknown;
    refresh: () => Promise<void>;
};

/**
 * Hook para obtener la foto de perfil de un usuario
 * 
 * @param userId - ID del usuario
 * @param options - Opciones de configuración
 * 
 * @example
 * ```tsx
 * const { profilePicture, loading, error, refresh } = useProfilePicture('user-123', { auto: true });
 * 
 * return (
 *   <img src={profilePicture || '/default-avatar.png'} alt="Profile" />
 * );
 * ```
 */
export function useProfilePicture(
    userId: string,
    options: UseProfilePictureOptions = {}
): UseProfilePictureResult {
    const { auto = true } = options;

    const [profilePicture, setProfilePicture] = useState<string | null>(null);
    const [updatedAt, setUpdatedAt] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(auto);
    const [error, setError] = useState<unknown>(null);

    const refresh = useCallback(async () => {
        if (!userId) return;

        setLoading(true);
        setError(null);

        try {
            const res = await apiClient.get<ProfilePictureResponse>(`/users/${encodeURIComponent(userId)}/profile-picture`);

            setProfilePicture(res.data.profilePicture);
            setUpdatedAt(res.data.updatedAt);
        } catch (e: any) {
            setError(e);
            setProfilePicture(null);
            setUpdatedAt(null);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        if (auto && userId) {
            refresh();
        }
    }, [auto, userId, refresh]);

    return {
        profilePicture,
        updatedAt,
        loading,
        error,
        refresh,
    };
}
