import CustomDialog from "@/utils/CustomDialog";
import { Button, Typography } from "@mui/material";
import apiClient from "@/lib/apiClient";
import React from "react";

export type DeactivateDialogProps = {
    open: boolean;
    onClose: () => void;
    modelId: string;
    model: 'session' | 'snapshot';
    claseDescription?: React.ReactNode;
    onSuccess?: () => void;
};

export const DeactivateDialog: React.FC<DeactivateDialogProps> = ({
    open,
    modelId,
    model,
    claseDescription,
    onClose,
    onSuccess,
}) => {

    const [loading, setLoading] = React.useState(false);
    const [err, setErr] = React.useState<string | null>(null);

    const handleConfirm = async () => {
        setErr(null);
        try {
            setLoading(true);
            await apiClient.post(
                '/sessions/deactivate',
                { modelId, model }
            );
            onSuccess?.();
            onClose();
        } catch (e: any) {
            console.error(e);
            setErr(e?.response?.data?.message || 'No se pudo dar de baja.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (loading) return;
        onClose();
    };

    return (
        <CustomDialog
            open={open}
            onClose={handleClose}
            title="Dar de baja"
            disableEscapeKeyDown={loading}
            showCloseButton={!loading}
            actions={
                <>
                    <Button onClick={handleClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        color="warning"
                        variant="contained"
                        disabled={loading}
                    >
                        {loading ? 'Bajando…' : 'Confirmar baja'}
                    </Button>
                </>
            }
        >
            <Typography variant="body2" sx={{ mt: 1 }}>
                ¿Confirmás que querés dar de baja?{' '}
                <strong>{claseDescription || 'esta clase'}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
                Esta acción la marcará como no disponible.
            </Typography>

            {err && (
                <Typography variant="body2" color="error">
                    {err}
                </Typography>
            )}
        </CustomDialog>
    );
};
