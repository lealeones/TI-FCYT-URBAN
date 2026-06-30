import { useUserAuth } from '@/app/context/UserAuth';
import apiClient from '@/lib/apiClient';
import { useState } from 'react';

export const useToggleUserActive = () => {
    const { token } = useUserAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggleActive = async (userId: string, isActive: boolean) => {
        setLoading(true);
        setError(null);
        try {
<<<<<<< Updated upstream
            const deleted = isActive ? null : new Date().toISOString();
            const response = await apiClient.put(`/users/${userId}/active`, { deleted });
            console.log('✅ User active status updated successfully:', response.data);
=======
            const url = `${process.env.NEXT_PUBLIC_BACKEND_URL ?? ''}/users/${userId}/active`;
            const deleted = isActive ? null : new Date().toISOString();
            const response = await axios.put(
                url,
                { deleted },
                { headers: { Authorization: `Bearer ${token}` } }
            );
>>>>>>> Stashed changes
            return true;
        } catch (err) {
            console.error('❌ Error al cambiar estado del usuario', err);
            setError('No se pudo cambiar el estado del usuario');
            return false;
        } finally {
            setLoading(false);
        }
    };

    return { toggleActive, loading, error };
};
