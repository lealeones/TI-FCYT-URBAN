'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Divider,
    Alert,
    LinearProgress,
    Chip,
    IconButton,
    Paper,
    Dialog,
    DialogTitle,
    DialogContent,
    CircularProgress,
} from '@mui/material';
import {
    CloudDownload as DownloadIcon,
    CloudUpload as UploadIcon,
    InsertDriveFile as FileIcon,
    Delete as DeleteIcon,
    Backup as BackupIcon,
    Restore as RestoreIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { downloadDatabaseBackup, uploadBackup } from '@/utils/downloadBackup';
import { useUserAuth } from '@/app/context/UserAuth';

const BackupComponent = () => {
    const { token } = useUserAuth();

    // Estado del diálogo de redirección post-restauración
    const [redirectDialog, setRedirectDialog] = useState<{ open: boolean; url: string; countdown: number }>(
        { open: false, url: '', countdown: 3 }
    );

    useEffect(() => {
        if (!redirectDialog.open) return;
        if (redirectDialog.countdown <= 0) {
            window.location.replace(redirectDialog.url);
            return;
        }
        const timer = setTimeout(() => {
            setRedirectDialog(prev => ({ ...prev, countdown: prev.countdown - 1 }));
        }, 1000);
        return () => clearTimeout(timer);
    }, [redirectDialog.open, redirectDialog.countdown, redirectDialog.url]);

    // Estados para descargar backup
    const [downloadLoading, setDownloadLoading] = useState(false);
    const [downloadStatus, setDownloadStatus] = useState<{
        type: 'success' | 'error' | null;
        message: string;
    }>({ type: null, message: '' });

    // Estados para subir backup
    const [uploadLoading, setUploadLoading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<{
        type: 'success' | 'error' | null;
        message: string;
    }>({ type: null, message: '' });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Función para descargar backup
    const handleDownloadBackup = async () => {
        if (!token) {
            setDownloadStatus({
                type: 'error',
                message: 'No estás autenticado'
            });
            return;
        }

        setDownloadLoading(true);
        setDownloadStatus({ type: null, message: '' });

        try {
            const result = await downloadDatabaseBackup(token);
            setDownloadStatus({
                type: 'success',
                message: `Backup descargado exitosamente: ${result.fileName}`
            });
        } catch (error: any) {
            setDownloadStatus({
                type: 'error',
                message: error.message || 'Error al generar el backup'
            });
        } finally {
            setDownloadLoading(false);
        }
    };

    // Función para manejar el drop de archivos
    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (file && file.name.endsWith('.sql')) {
            setSelectedFile(file);
            setUploadStatus({ type: null, message: '' });
        } else {
            setUploadStatus({
                type: 'error',
                message: 'Solo se permiten archivos .sql'
            });
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/sql': ['.sql'],
            'text/plain': ['.sql']
        },
        multiple: false
    });

    // Función para subir backup
    const handleUploadBackup = async () => {
        if (!selectedFile || !token) return;

        setUploadLoading(true);
        setUploadStatus({ type: null, message: '' });

        try {
            const result = await uploadBackup(selectedFile);
            setUploadStatus({
                type: 'success',
                message: 'Backup restaurado exitosamente'
            });
            setSelectedFile(null);
            setRedirectDialog({ open: true, url: result.data?.urlCallback ?? '/', countdown: 3 });
        } catch (error: any) {
            setUploadStatus({
                type: 'error',
                message: error.message || 'Error al procesar el backup'
            });
        } finally {
            setUploadLoading(false);
        }
    };

    // Función para remover archivo seleccionado
    const handleRemoveFile = () => {
        setSelectedFile(null);
        setUploadStatus({ type: null, message: '' });
    };

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
            {/* Título principal */}
            <Box sx={{ mb: 4, textAlign: 'center' }}>
                <BackupIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                    Gestión de Backups
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Genera respaldos de la base de datos o restaura desde un archivo
                </Typography>
            </Box>

            {/* Card principal dividida */}
            <Card
                elevation={4}
                sx={{
                    borderRadius: 3,
                    overflow: 'hidden',
                }}
            >
                <Box sx={{ display: 'flex', minHeight: 400 }}>

                    {/* Lado izquierdo - Generar Backup */}
                    <Box sx={{ flex: 1, p: 4, display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ textAlign: 'center', mb: 3 }}>
                            <DownloadIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                                Generar Backup
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Descarga una copia de seguridad completa de la base de datos
                            </Typography>
                        </Box>

                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            {downloadLoading && (
                                <Box sx={{ mb: 3 }}>
                                    <LinearProgress sx={{ borderRadius: 1 }} />
                                    <Typography variant="body2" sx={{ textAlign: 'center', mt: 1 }}>
                                        Generando backup...
                                    </Typography>
                                </Box>
                            )}

                            {downloadStatus.type && (
                                <Alert
                                    severity={downloadStatus.type}
                                    sx={{ mb: 3, borderRadius: 2 }}
                                    onClose={() => setDownloadStatus({ type: null, message: '' })}
                                >
                                    {downloadStatus.message}
                                </Alert>
                            )}

                            <Button
                                variant="contained"
                                size="large"
                                onClick={handleDownloadBackup}
                                disabled={downloadLoading}
                                startIcon={<DownloadIcon />}
                                sx={{
                                    py: 2,
                                    borderRadius: 2,
                                    fontSize: '1.1rem',
                                    fontWeight: 600,
                                    background: 'linear-gradient(45deg, #2196f3 30%, #21cbf3 90%)',
                                    boxShadow: '0 4px 15px rgba(33, 150, 243, .4)',
                                    '&:hover': {
                                        background: 'linear-gradient(45deg, #1976d2 30%, #2196f3 90%)',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 8px 25px rgba(33, 150, 243, .4)',
                                    },
                                    transition: 'all 0.2s ease-in-out'
                                }}
                            >
                                {downloadLoading ? 'Generando...' : 'Descargar Backup'}
                            </Button>

                            <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 2, opacity: 0.7 }}>
                                <Typography variant="caption" display="block" sx={{ textAlign: 'center', color: 'white' }}>
                                    💡 El archivo incluirá toda la estructura y datos de la base de datos
                                </Typography>
                            </Box>
                        </Box>
                    </Box>

                    {/* Divider vertical */}
                    <Divider orientation="vertical" flexItem sx={{ bgcolor: 'divider', width: 2 }} />

                    {/* Lado derecho - Subir Backup */}
                    <Box sx={{ flex: 1, p: 4, display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ textAlign: 'center', mb: 3 }}>
                            <RestoreIcon sx={{ fontSize: 64, color: 'warning.main', mb: 2 }} />
                            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                                Restaurar Backup
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Sube un archivo .sql para restaurar la base de datos
                            </Typography>
                        </Box>

                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            {/* Dropzone */}
                            <Paper
                                {...getRootProps()}
                                sx={{
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    p: 3,
                                    mb: 2,
                                    cursor: 'pointer',
                                    borderRadius: 2,
                                    border: '2px dashed',
                                    borderColor: isDragActive ? 'primary.main' : 'divider',
                                    bgcolor: isDragActive ? 'action.hover' : 'background.default',
                                    transition: 'all 0.2s ease-in-out',
                                    '&:hover': {
                                        borderColor: 'primary.main',
                                        bgcolor: 'action.hover',
                                    }
                                }}
                            >
                                <input {...getInputProps()} />
                                <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                                <Typography variant="body1" sx={{ textAlign: 'center', mb: 1 }}>
                                    {isDragActive
                                        ? 'Suelta el archivo aquí'
                                        : 'Arrastra un archivo .sql o haz clic para seleccionar'
                                    }
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Formatos soportados: .sql
                                </Typography>
                            </Paper>

                            {/* Archivo seleccionado */}
                            {selectedFile && (
                                <Box sx={{ mb: 2 }}>
                                    <Paper
                                        sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            bgcolor: 'success.light',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <FileIcon sx={{ mr: 1, color: 'success.dark' }} />
                                            <Box>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    {selectedFile.name}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <IconButton
                                            size="small"
                                            onClick={handleRemoveFile}
                                            sx={{ color: 'error.main' }}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </Paper>
                                </Box>
                            )}

                            {/* Estado de carga para upload */}
                            {uploadLoading && (
                                <Box sx={{ mb: 2 }}>
                                    <LinearProgress sx={{ borderRadius: 1 }} />
                                    <Typography variant="body2" sx={{ textAlign: 'center', mt: 1 }}>
                                        Procesando backup...
                                    </Typography>
                                </Box>
                            )}

                            {/* Mensajes de estado para upload */}
                            {uploadStatus.type && (
                                <Alert
                                    severity={uploadStatus.type}
                                    sx={{ mb: 2, borderRadius: 2 }}
                                    onClose={() => setUploadStatus({ type: null, message: '' })}
                                >
                                    {uploadStatus.message}
                                </Alert>
                            )}

                            {/* Botón de restaurar */}
                            <Button
                                variant="contained"
                                color="warning"
                                size="large"
                                onClick={handleUploadBackup}
                                disabled={!selectedFile || uploadLoading}
                                startIcon={<RestoreIcon />}
                                sx={{
                                    py: 2,
                                    borderRadius: 2,
                                    fontSize: '1.1rem',
                                    fontWeight: 600,
                                    background: 'linear-gradient(45deg, #ff9800 30%, #ffb74d 90%)',
                                    boxShadow: '0 4px 15px rgba(255, 152, 0, .4)',
                                    '&:hover': {
                                        background: 'linear-gradient(45deg, #f57c00 30%, #ff9800 90%)',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 8px 25px rgba(255, 152, 0, .4)',
                                    },
                                    '&:disabled': {
                                        background: 'rgba(0,0,0,0.12)',
                                        color: 'rgba(0,0,0,0.26)',
                                    },
                                    transition: 'all 0.2s ease-in-out'
                                }}
                            >
                                {uploadLoading ? 'Restaurando...' : 'Restaurar Base de Datos'}
                            </Button>

                            <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.light', borderRadius: 2, opacity: 0.7 }}>
                                <Typography variant="caption" display="block" sx={{ textAlign: 'center', color: 'white' }}>
                                    ⚠️ Esta acción reemplazará completamente la base de datos actual
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                </Box>
            </Card>

            {/* Información adicional */}
            <Box sx={{ mt: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Importante: Solo los administradores pueden realizar operaciones de backup
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Chip label="Formato: SQL" size="small" />
                    <Chip label="Compresión: Automática" size="small" />
                    <Chip label="Encriptación: SSL" size="small" />
                </Box>
            </Box>

            {/* Diálogo de redirección post-restauración */}
            <Dialog open={redirectDialog.open} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
                <DialogTitle sx={{ textAlign: 'center', pb: 0 }}>
                    <RestoreIcon sx={{ fontSize: 40, color: 'success.main', display: 'block', mx: 'auto', mb: 1 }} />
                    Backup restaurado
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 2 }}>
                        <CircularProgress size={48} thickness={4} />
                        <Typography variant="body1" textAlign="center" color="text.secondary">
                            Será redirigido para completar el proceso
                        </Typography>
                        <Box sx={{
                            width: 56, height: 56, borderRadius: '50%',
                            bgcolor: 'primary.main', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Typography variant="h4" sx={{ color: 'white', fontWeight: 700, lineHeight: 1 }}>
                                {redirectDialog.countdown}
                            </Typography>
                        </Box>
                    </Box>
                </DialogContent>
            </Dialog>
        </Box>
    );
};

export default BackupComponent;
