import apiClient from '@/lib/apiClient';

// Función para descargar backup
export const downloadDatabaseBackup = async (token: string) => {
    try {
        const response = await apiClient.get('/backup/download', { responseType: 'blob' });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `database-backup-${timestamp}.sql`;

        const blob = new Blob([response.data], { type: 'application/sql' });
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        return { success: true, fileName };
    } catch (error: any) {
        console.error('Error descargando backup:', error);

        if (error.response?.status === 401) {
            throw new Error('Sin autorización');
        } else {
            throw new Error('Error al generar el backup');
        }
    }
};

// Nueva función para validar archivo antes de subir
export const validateBackupFile = async (file: File) => {
    try {
        const formData = new FormData();
        formData.append('backup', file);

        const response = await apiClient.post('/backup/validate', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });

        return { success: true, data: response.data };
    } catch (error: any) {
        console.error('Error validando backup:', error);

        if (error.response?.status === 401) {
            throw new Error('Sin autorización');
        } else if (error.response?.status === 400) {
            throw new Error('Archivo inválido. Solo se permiten archivos .sql válidos');
        } else {
            throw new Error('Error al validar el archivo de backup');
        }
    }
};

// Función para subir y restaurar backup
export const uploadBackup = async (file: File) => {
    try {
        const formData = new FormData();
        formData.append('backup', file);

        const response = await apiClient.post('/backup/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });

        return { success: true, data: response.data };
    } catch (error: any) {
        console.error('Error subiendo backup:', error);

        if (error.response?.status === 401) {
            throw new Error('Sin autorización');
        } else if (error.response?.status === 400) {
            throw new Error('Archivo inválido. Solo se permiten archivos .sql');
        } else {
            throw new Error('Error al procesar el archivo de backup');
        }
    }
};

// Función para verificar el estado del servicio de backup
export const checkBackupStatus = async () => {
    try {
        const response = await apiClient.get('/backup/status');
        return response.data;
    } catch (error: any) {
        throw new Error('Error al verificar el estado del backup');
    }
};
