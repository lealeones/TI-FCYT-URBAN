'use client';

import { useUserAuth } from '@/app/context/UserAuth';
import CustomDialog from '@/utils/CustomDialog';
import {
    Alert,
    Avatar,
    Box,
    Button,
    Grid,
    IconButton,
    MenuItem,
    Stack,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import apiClient from '@/lib/apiClient';
import { useEffect, useState } from 'react';
import { UserRole, Usuario } from './usuarios.dto';
import { useToggleUserActive } from '@/@core/hooks/useToggleUserActive';
import { useProfilePicture } from '@/@core/hooks/useProfilePicture';
import { DIALOG_INFO } from '@/configs/dialogInfoContent';

type Props = {
    open: boolean;
    usuario: Usuario | null;
    onClose: () => void;
    onRefresh: () => Promise<void>;
};

export const UpsertUsuarioDialog = ({ open, usuario, onClose, onRefresh }: Props) => {

    const { token } = useUserAuth()
    const { toggleActive, loading: toggleLoading } = useToggleUserActive();

    // Hook para obtener la foto de perfil del usuario
    const { profilePicture, loading: loadingPicture } = useProfilePicture(usuario?.id || '', {
        auto: !!usuario?.id,
    });

    const [form, setForm] = useState<Usuario>({
        id: usuario?.id,
        customId: usuario?.customId ?? '',
        name: usuario?.name ?? '',
        dni: usuario?.dni ?? '',
        phone: usuario?.phone ?? '',
        birth: usuario?.birth ? usuario.birth.slice(0, 10) : '',
        rfid: usuario?.rfid ?? '',
        role: usuario?.role ?? 'USER',
        deleted: usuario?.deleted ?? null,
    });
    const [saving, setSaving] = useState(false);

    const isEdit = Boolean(form.id);

    // Detectar si hay cambios en los campos (excluyendo isActive)
    const hasChanges = () => {
        if (!usuario) return false;
        const birthForm = form.birth ? form.birth.slice(0, 10) : '';
        const birthUsuario = usuario.birth ? usuario.birth.slice(0, 10) : '';

        return (
            form.name !== usuario.name ||
            (form.dni ?? '') !== (usuario.dni ?? '') ||
            (form.phone ?? '') !== (usuario.phone ?? '') ||
            birthForm !== birthUsuario ||
            (form.rfid ?? '') !== (usuario.rfid ?? '') ||
            (form.role ?? 'USER') !== (usuario.role ?? 'USER')
        );
    };

    // Hidratar al abrir con el usuario recibido
    useEffect(() => {
        setForm({
            id: usuario?.id,
            customId: usuario?.customId ?? '',
            name: usuario?.name ?? '',
            dni: usuario?.dni ?? '',
            phone: usuario?.phone ?? '',
            birth: usuario?.birth ? usuario.birth.slice(0, 10) : '',
            rfid: usuario?.rfid ?? '',
            role: usuario?.role ?? 'USER',
            deleted: usuario?.deleted ?? null,
        });
    }, [usuario]);

    const handleChange = (key: keyof Usuario) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm(prev => ({ ...prev, [key]: e.target.value }));
    };

    const handleToggleActive = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.checked;
        const isActive = !form.deleted;

        if (!form.id) {
            console.warn('⚠️ No user ID found');
            return;
        }

        const success = await toggleActive(form.id, newValue);
        if (success) {
            setForm(prev => ({ ...prev, deleted: newValue ? null : new Date() }));
            await onRefresh();
        } else {
            console.error('❌ Failed to toggle, reverting state');
        }
    };

    const handleResetForm = () => {
        if (usuario) {
            setForm({
                id: usuario.id,
                customId: usuario.customId ?? '',
                name: usuario.name ?? '',
                dni: usuario.dni ?? '',
                phone: usuario.phone ?? '',
                birth: usuario.birth ? usuario.birth.slice(0, 10) : '',
                rfid: usuario.rfid ?? '',
                role: usuario.role ?? 'USER',
                deleted: usuario.deleted ?? null,
            });
        }
    };

    // Helper para verificar si un campo específico cambió
    const hasFieldChanged = (field: keyof Usuario): boolean => {
        if (!usuario) return false;

        if (field === 'birth') {
            const birthForm = form.birth ? form.birth.slice(0, 10) : '';
            const birthUsuario = usuario.birth ? usuario.birth.slice(0, 10) : '';
            return birthForm !== birthUsuario;
        }

        return (form[field] ?? '') !== (usuario[field] ?? '');
    };

    // Helper para obtener el valor original
    const getOriginalValue = (field: keyof Usuario): string => {
        if (!usuario) return '';

        if (field === 'birth' && usuario.birth) {
            return new Date(usuario.birth).toLocaleDateString('es-AR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }

        if (field === 'role') {
            return usuario.role ?? 'USER';
        }

        return (usuario[field] as string) ?? 'Sin valor';
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setSaving(true);
        try {
            const body = { ...form, birth: form.birth ? new Date(form.birth).toISOString() : undefined };
            await apiClient.post('/users', body);
            await onRefresh();
            onClose();
        } catch (err) {
            console.error('Error al upsert usuario', err);
        } finally {
            setSaving(false);
        }
    };

    const filledSx = {
        '& .MuiFilledInput-root': {
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderRadius: 2,
            '&:hover': { backgroundColor: 'rgba(255,255,255,0.06)' },
            '&.Mui-focused': { backgroundColor: 'rgba(255,255,255,0.07)' },
        },
    };

    return (
        <CustomDialog
            open={open}
            onClose={saving ? () => { } : onClose}
            maxWidth="sm"
            title={isEdit ? 'Editar usuario' : 'Crear usuario'}
            contentProps={{ dividers: true }}
            infoContent={DIALOG_INFO.usuarioForm}
            actions={
                <>
                    {isEdit && hasChanges() && (
                        <Button
                            onClick={handleResetForm}
                            disabled={saving}
                            variant="outlined"
                            color="secondary"
                        >
                            Limpiar cambios
                        </Button>
                    )}
                    <Button
                        onClick={handleSubmit}
                        disabled={saving || (isEdit && !hasChanges())}
                        variant="contained"
                    >
                        {isEdit ? 'Guardar cambios' : 'Crear usuario'}
                    </Button>
                </>
            }
        >
            <form onSubmit={handleSubmit}>
                <Stack spacing={2.2} mt={0.5}>
                    {/* Avatar del usuario (solo en edición) */}
                    {isEdit && (
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                mb: 2
                            }}
                        >
                            <Avatar
                                src={profilePicture || undefined}
                                alt={form.name || 'Usuario'}
                                sx={{
                                    width: 80,
                                    height: 80,
                                    border: '3px solid',
                                    borderColor: 'primary.main',
                                    boxShadow: 3,
                                }}
                            >
                                {!profilePicture && form.name?.charAt(0).toUpperCase()}
                            </Avatar>
                        </Box>
                    )}

                    {!form.id && !form.rfid && (
                        <Alert severity="warning">
                            Al crear un usuario sin el flujo del llavero, necesitás asignarle manualmente un RFID para poder tomar asistencia.
                        </Alert>
                    )}
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                            label="ID (custom)"
                            value={form.customId}
                            onChange={handleChange('customId')}
                            fullWidth
                            disabled
                            variant="filled"
                            InputLabelProps={{ shrink: true }}
                            sx={filledSx}
                        />
                        {isEdit && (
                            <Stack
                                direction="row"
                                alignItems="center"
                                justifyContent="space-between"
                                spacing={2}
                                sx={{
                                    minWidth: { xs: '100%', sm: '220px' },
                                    px: 2.5,
                                    py: 1.5,
                                    backgroundColor: !form.deleted
                                        ? 'rgba(46, 125, 50, 0.08)'
                                        : 'rgba(255,255,255,0.04)',
                                    borderRadius: 2,
                                    border: '1px solid',
                                    borderColor: !form.deleted
                                        ? 'rgba(46, 125, 50, 0.3)'
                                        : 'rgba(255,255,255,0.08)',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        backgroundColor: !form.deleted
                                            ? 'rgba(46, 125, 50, 0.12)'
                                            : 'rgba(255,255,255,0.06)',
                                    },
                                }}
                            >
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            fontWeight: 500,
                                            color: !form.deleted ? 'success.main' : 'text.secondary',
                                        }}
                                    >
                                        {!form.deleted ? 'Activo' : 'Inactivo'}
                                    </Typography>
                                </Stack>
                                <Switch
                                    checked={!form.deleted}
                                    onChange={handleToggleActive}
                                    disabled={toggleLoading}
                                    color="success"
                                />
                            </Stack>
                        )}
                    </Stack>
                    <TextField
                        label="Nombre"
                        value={form.name}
                        onChange={handleChange('name')}
                        fullWidth
                        required
                        variant="filled"
                        InputLabelProps={{ shrink: true }}
                        sx={filledSx}
                        InputProps={{
                            endAdornment: hasFieldChanged('name') && (
                                <Tooltip title={`Original: ${getOriginalValue('name')}`} arrow placement="top">
                                    <IconButton size="small" sx={{ mr: 1 }}>
                                        <i className='ri-information-line' style={{ fontSize: '18px', color: '#ff9800' }} />
                                    </IconButton>
                                </Tooltip>
                            )
                        }}
                    />

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                            label="DNI"
                            value={form.dni ?? ''}
                            onChange={handleChange('dni')}
                            fullWidth
                            variant="filled"
                            InputLabelProps={{ shrink: true }}
                            sx={filledSx}
                            InputProps={{
                                endAdornment: hasFieldChanged('dni') && (
                                    <Tooltip title={`Original: ${getOriginalValue('dni')}`} arrow placement="top">
                                        <IconButton size="small" sx={{ mr: 1 }}>
                                            <i className='ri-information-line' style={{ fontSize: '18px', color: '#ff9800' }} />
                                        </IconButton>
                                    </Tooltip>
                                )
                            }}
                        />
                        <TextField
                            label="Teléfono"
                            value={form.phone ?? ''}
                            onChange={handleChange('phone')}
                            fullWidth
                            variant="filled"
                            InputLabelProps={{ shrink: true }}
                            sx={filledSx}
                            InputProps={{
                                endAdornment: hasFieldChanged('phone') && (
                                    <Tooltip title={`Original: ${getOriginalValue('phone')}`} arrow placement="top">
                                        <IconButton size="small" sx={{ mr: 1 }}>
                                            <i className='ri-information-line' style={{ fontSize: '18px', color: '#ff9800' }} />
                                        </IconButton>
                                    </Tooltip>
                                )
                            }}
                        />
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                            label="Nacimiento"
                            type="date"
                            value={form.birth ?? ''}
                            onChange={handleChange('birth')}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            variant="filled"
                            sx={filledSx}
                            InputProps={{
                                endAdornment: hasFieldChanged('birth') && (
                                    <Tooltip title={`Original: ${getOriginalValue('birth')}`} arrow placement="top">
                                        <IconButton size="small" sx={{ mr: 1 }}>
                                            <i className='ri-information-line' style={{ fontSize: '18px', color: '#ff9800' }} />
                                        </IconButton>
                                    </Tooltip>
                                )
                            }}
                        />
                        <TextField
                            label="RFID"
                            value={form.rfid ?? ''}
                            onChange={handleChange('rfid')}
                            fullWidth
                            variant="filled"
                            InputLabelProps={{ shrink: true }}
                            sx={filledSx}
                            InputProps={{
                                endAdornment: hasFieldChanged('rfid') && (
                                    <Tooltip title={`Original: ${getOriginalValue('rfid')}`} arrow placement="top">
                                        <IconButton size="small" sx={{ mr: 1 }}>
                                            <i className='ri-information-line' style={{ fontSize: '18px', color: '#ff9800' }} />
                                        </IconButton>
                                    </Tooltip>
                                )
                            }}
                        />
                    </Stack>

                    <TextField
                        select
                        label="Rol"
                        value={form.role ?? 'USER'}
                        onChange={handleChange('role')}
                        fullWidth
                        variant="filled"
                        InputLabelProps={{ shrink: true }}
                        sx={filledSx}
                        InputProps={{
                            endAdornment: hasFieldChanged('role') && (
                                <Tooltip title={`Original: ${getOriginalValue('role')}`} arrow placement="top">
                                    <IconButton size="small" sx={{ mr: 1 }}>
                                        <i className='ri-information-line' style={{ fontSize: '18px', color: '#ff9800' }} />
                                    </IconButton>
                                </Tooltip>
                            )
                        }}
                    >
                        {(['ADMIN', 'INSTRUCTOR', 'USER', 'GUEST'] as UserRole[]).map(r => (
                            <MenuItem key={r} value={r}>
                                {r}
                            </MenuItem>
                        ))}
                    </TextField>
                </Stack>
            </form >
        </CustomDialog >
    );
};

export default UpsertUsuarioDialog;
