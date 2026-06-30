'use client';

import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    Typography,
    TextField,
    Button,
    Alert,
    LinearProgress,
    Chip,
    Paper,
    Grid,
    Snackbar,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import {
    Settings as SettingsIcon,
    Save as SaveIcon,
    Refresh as RefreshIcon,
    Warning as WarningIcon,
} from '@mui/icons-material';
import { useSystemConfig } from '@/@core/hooks/useSystemConfig';
import { useUserAuth } from '@/app/context/UserAuth';
import type { UpdateSystemConfigDto } from '@/@core/types/system-config';

const SystemConfigPage = () => {
    const { user, token } = useUserAuth();
    const { data, loading, fetchConfig, updateConfig, reloadConfig, updating, reloading } = useSystemConfig(token ? { token } : {});

    // Estados del formulario
    const [formData, setFormData] = useState({
        sessionCleanupIntervalMinutes: 0,
        invoiceGenerationDayOfMonth: 0,
        tokenExpirationMinutes: 0,
        tokenCleanupIntervalMinutes: 0,
        profilePictureUpdateIntervalDays: 0,
    });

    // Estado para el snackbar
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error' | 'warning';
    }>({
        open: false,
        message: '',
        severity: 'success',
    });

    // Estado para el warning dialog
    const [showTokenWarning, setShowTokenWarning] = useState(false);
    const [pendingUpdate, setPendingUpdate] = useState<UpdateSystemConfigDto | null>(null);

    // Verificar permisos de admin
    const isAdmin = user?.role === 'ADMIN';

    // Cargar configuración al montar
    useEffect(() => {
        if (token) {
            fetchConfig().catch((error) => {
                console.log('error fetch ', error)
                setSnackbar({
                    open: true,
                    message: 'Error al cargar la configuración',
                    severity: 'error',
                });
            });
        }
    }, [token, fetchConfig]);

    // Actualizar formulario cuando se carga la data
    useEffect(() => {
        if (data) {
            setFormData({
                sessionCleanupIntervalMinutes: data.sessionCleanupIntervalMinutes,
                invoiceGenerationDayOfMonth: data.invoiceGenerationDayOfMonth,
                tokenExpirationMinutes: data.tokenExpirationMinutes,
                tokenCleanupIntervalMinutes: data.tokenCleanupIntervalMinutes,
                profilePictureUpdateIntervalDays: data.profilePictureUpdateIntervalDays,
            });
        }
    }, [data]);

    // Verificar si hay cambios
    const hasChanges = data
        ? formData.sessionCleanupIntervalMinutes !== data.sessionCleanupIntervalMinutes ||
        formData.invoiceGenerationDayOfMonth !== data.invoiceGenerationDayOfMonth ||
        formData.tokenExpirationMinutes !== data.tokenExpirationMinutes ||
        formData.tokenCleanupIntervalMinutes !== data.tokenCleanupIntervalMinutes ||
        formData.profilePictureUpdateIntervalDays !== data.profilePictureUpdateIntervalDays
        : false;

    // Validación - solo mostrar errores si el usuario ha modificado los valores
    const showErrors = hasChanges || (!data); // Mostrar errores solo si hay cambios o no hay data cargada

    const errors = {
        sessionCleanupIntervalMinutes: showErrors && formData.sessionCleanupIntervalMinutes < 1 ? 'Debe ser mínimo 1' : '',
        invoiceGenerationDayOfMonth:
            showErrors && (formData.invoiceGenerationDayOfMonth < 1 || formData.invoiceGenerationDayOfMonth > 28)
                ? 'Debe estar entre 1 y 28'
                : '',
        tokenExpirationMinutes: showErrors && formData.tokenExpirationMinutes < 1 ? 'Debe ser mínimo 1' : '',
        tokenCleanupIntervalMinutes: showErrors && formData.tokenCleanupIntervalMinutes < 1 ? 'Debe ser mínimo 1' : '',
        profilePictureUpdateIntervalDays: showErrors && formData.profilePictureUpdateIntervalDays < 1 ? 'Debe ser mínimo 1' : '',
    };

    const hasErrors = Object.values(errors).some((error) => error !== '');

    const handleChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value, 10) || 0;
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isAdmin || hasErrors || !hasChanges) return;

        // Construir DTO solo con campos modificados
        const dto: UpdateSystemConfigDto = {};
        if (data) {
            if (formData.sessionCleanupIntervalMinutes !== data.sessionCleanupIntervalMinutes) {
                dto.sessionCleanupIntervalMinutes = formData.sessionCleanupIntervalMinutes;
            }
            if (formData.invoiceGenerationDayOfMonth !== data.invoiceGenerationDayOfMonth) {
                dto.invoiceGenerationDayOfMonth = formData.invoiceGenerationDayOfMonth;
            }
            if (formData.tokenExpirationMinutes !== data.tokenExpirationMinutes) {
                dto.tokenExpirationMinutes = formData.tokenExpirationMinutes;
            }
            if (formData.tokenCleanupIntervalMinutes !== data.tokenCleanupIntervalMinutes) {
                dto.tokenCleanupIntervalMinutes = formData.tokenCleanupIntervalMinutes;
            }
            if (formData.profilePictureUpdateIntervalDays !== data.profilePictureUpdateIntervalDays) {
                dto.profilePictureUpdateIntervalDays = formData.profilePictureUpdateIntervalDays;
            }
        }

        // Si se modificó tokenExpirationMinutes, mostrar warning
        if (dto.tokenExpirationMinutes !== undefined) {
            setPendingUpdate(dto);
            setShowTokenWarning(true);
            return;
        }

        await performUpdate(dto);
    };

    const performUpdate = async (dto: UpdateSystemConfigDto) => {
        try {
            await updateConfig(dto);
            setSnackbar({
                open: true,
                message: 'Configuración actualizada exitosamente',
                severity: 'success',
            });
        } catch (error: any) {
            setSnackbar({
                open: true,
                message: error?.response?.data?.message || 'Error al actualizar la configuración',
                severity: 'error',
            });
        }
    };

    const handleConfirmUpdate = async () => {
        setShowTokenWarning(false);
        if (pendingUpdate) {
            await performUpdate(pendingUpdate);
            setPendingUpdate(null);
        }
    };

    const handleReload = async () => {
        try {
            await reloadConfig();
            setSnackbar({
                open: true,
                message: 'Configuración recargada desde la base de datos',
                severity: 'success',
            });
        } catch (error: any) {
            setSnackbar({
                open: true,
                message: error?.response?.data?.message || 'Error al recargar la configuración',
                severity: 'error',
            });
        }
    };

    const handleCloseSnackbar = () => {
        setSnackbar((prev) => ({ ...prev, open: false }));
    };

    if (!isAdmin) {
        return (
            <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
                <Alert severity="error">No tienes permisos para acceder a esta página</Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 900, mx: 'auto', p: 3 }}>
            {/* Título principal */}
            <Box sx={{ mb: 4, textAlign: 'center' }}>
                <SettingsIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                    Configuración del Sistema
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Gestiona los parámetros de configuración de la aplicación
                </Typography>
            </Box>

            {/* Card principal */}
            <Card elevation={4} sx={{ borderRadius: 3, overflow: 'hidden' }}>
                {loading && <LinearProgress />}

                <Box sx={{ p: 4 }}>
                    <form onSubmit={handleSubmit}>
                        <Grid container spacing={3}>
                            {/* Limpieza de sesiones */}
                            <Grid item xs={12} md={6}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 3,
                                        bgcolor: 'background.default',
                                        borderRadius: 2,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                    }}
                                >
                                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'primary.main' }}>
                                        Limpieza de Sesiones
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        type="number"
                                        label="Intervalo (minutos)"
                                        value={formData.sessionCleanupIntervalMinutes}
                                        onChange={handleChange('sessionCleanupIntervalMinutes')}
                                        error={!!errors.sessionCleanupIntervalMinutes}
                                        helperText={
                                            errors.sessionCleanupIntervalMinutes ||
                                            'Intervalo para desactivar sesiones vencidas'
                                        }
                                        disabled={!isAdmin || updating}
                                        inputProps={{ min: 1 }}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Paper>
                            </Grid>

                            {/* Generación de facturas */}
                            <Grid item xs={12} md={6}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 3,
                                        bgcolor: 'background.default',
                                        borderRadius: 2,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                    }}
                                >
                                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'primary.main' }}>
                                        Generación de Facturas
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        type="number"
                                        label="Día del mes (1-28)"
                                        value={formData.invoiceGenerationDayOfMonth}
                                        onChange={handleChange('invoiceGenerationDayOfMonth')}
                                        error={!!errors.invoiceGenerationDayOfMonth}
                                        helperText={
                                            errors.invoiceGenerationDayOfMonth || 'Día del mes para generar facturas mensuales'
                                        }
                                        disabled={!isAdmin || updating}
                                        inputProps={{ min: 1, max: 28 }}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Paper>
                            </Grid>

                            {/* Expiración de tokens */}
                            <Grid item xs={12} md={6}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 3,
                                        bgcolor: 'warning.lighter',
                                        borderRadius: 2,
                                        border: '1px solid',
                                        borderColor: 'warning.main',
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                        <WarningIcon sx={{ fontSize: 18, color: 'warning.main', mr: 1 }} />
                                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'warning.dark' }}>
                                            Expiración de Tokens
                                        </Typography>
                                    </Box>
                                    <TextField
                                        fullWidth
                                        type="number"
                                        label="Tiempo de expiración (minutos)"
                                        value={formData.tokenExpirationMinutes}
                                        onChange={handleChange('tokenExpirationMinutes')}
                                        error={!!errors.tokenExpirationMinutes}
                                        helperText={errors.tokenExpirationMinutes || 'Requiere reiniciar la aplicación'}
                                        disabled={!isAdmin || updating}
                                        inputProps={{ min: 1 }}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Paper>
                            </Grid>

                            {/* Limpieza de tokens */}
                            <Grid item xs={12} md={6}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 3,
                                        bgcolor: 'background.default',
                                        borderRadius: 2,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                    }}
                                >
                                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'primary.main' }}>
                                        Limpieza de Tokens
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        type="number"
                                        label="Intervalo (minutos)"
                                        value={formData.tokenCleanupIntervalMinutes}
                                        onChange={handleChange('tokenCleanupIntervalMinutes')}
                                        error={!!errors.tokenCleanupIntervalMinutes}
                                        helperText={
                                            errors.tokenCleanupIntervalMinutes || 'Intervalo para limpiar tokens expirados'
                                        }
                                        disabled={!isAdmin || updating}
                                        inputProps={{ min: 1 }}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Paper>
                            </Grid>

                            {/* Actualización de fotos de perfil de WhatsApp */}
                            <Grid item xs={12} md={6}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 3,
                                        bgcolor: 'background.default',
                                        borderRadius: 2,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                    }}
                                >
                                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'primary.main' }}>
                                        Fotos de Perfil WhatsApp
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        type="number"
                                        label="Intervalo (días)"
                                        value={formData.profilePictureUpdateIntervalDays}
                                        onChange={handleChange('profilePictureUpdateIntervalDays')}
                                        error={!!errors.profilePictureUpdateIntervalDays}
                                        helperText={
                                            errors.profilePictureUpdateIntervalDays || 'Intervalo para actualizar fotos de perfil automáticamente'
                                        }
                                        disabled={!isAdmin || updating}
                                        inputProps={{ min: 1 }}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Paper>
                            </Grid>
                        </Grid>

                        {/* Botones de acción */}
                        <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
                            <Button
                                variant="outlined"
                                startIcon={<RefreshIcon />}
                                onClick={handleReload}
                                disabled={loading || updating || reloading}
                                sx={{
                                    px: 4,
                                    py: 1.5,
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontWeight: 600,
                                }}
                            >
                                {reloading ? 'Recargando...' : 'Recargar desde BD'}
                            </Button>

                            <Button
                                type="submit"
                                variant="contained"
                                startIcon={<SaveIcon />}
                                disabled={!hasChanges || hasErrors || updating || loading}
                                sx={{
                                    px: 4,
                                    py: 1.5,
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    background: 'linear-gradient(45deg, #2196f3 30%, #21cbf3 90%)',
                                    boxShadow: '0 4px 15px rgba(33, 150, 243, .4)',
                                    '&:hover': {
                                        background: 'linear-gradient(45deg, #1976d2 30%, #2196f3 90%)',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 8px 25px rgba(33, 150, 243, .4)',
                                    },
                                    transition: 'all 0.2s ease-in-out',
                                }}
                            >
                                {updating ? 'Guardando...' : 'Guardar Cambios'}
                            </Button>
                        </Box>

                        {/* Info chips */}
                        {data && (
                            <Box sx={{ mt: 4, textAlign: 'center' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                    Última actualización: {new Date(data.updatedAt).toLocaleString('es-AR')}
                                </Typography>
                                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                                    <Chip label="Solo Admin" size="small" color="primary" />
                                    <Chip label="Cambios en tiempo real" size="small" />
                                    <Chip label="Validación automática" size="small" />
                                </Box>
                            </Box>
                        )}
                    </form>
                </Box>
            </Card>

            {/* Warning Dialog para cambio de token */}
            <Dialog open={showTokenWarning} onClose={() => setShowTokenWarning(false)}>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningIcon color="warning" />
                    Advertencia: Cambio de Token
                </DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        El cambio en el tiempo de expiración de tokens requiere <strong>reiniciar la aplicación</strong> para
                        que tenga efecto.
                    </Alert>
                    <Typography variant="body2">
                        Los usuarios que ya tienen tokens activos mantendrán su sesión hasta que expiren con el tiempo anterior.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowTokenWarning(false)}>Cancelar</Button>
                    <Button onClick={handleConfirmUpdate} variant="contained" color="warning">
                        Continuar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar para notificaciones */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default SystemConfigPage;
