'use client';

import { useUserAuth } from '@/app/context/UserAuth';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    List,
    ListItem,
    ListItemText,
    Typography
} from '@mui/material';
import apiClient from '@/lib/apiClient';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Usuario } from './usuarios.dto';

type ClaseUsuario = {
    id: string;
    title: string;
    startDate?: string | null;
    endDate?: string | null;
};

type Props = {
    open: boolean;
    onClose: () => void;
    usuario: Usuario | null;
};

const fmtDate = (iso?: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(+d) ? '—' : d.toLocaleString('es-AR');
};

export const DetailUsuarioDialog = ({
    open,
    onClose,
    usuario,
}: Props) => {
    const { token } = useUserAuth()

    const [expanded, setExpanded] = useState(false);
    const [loadingClases, setLoadingClases] = useState(false);
    const [clases, setClases] = useState<ClaseUsuario[]>([]);
    const isInstructor = usuario?.role === 'INSTRUCTOR';

    useEffect(() => {
        if (!open) {
            setExpanded(false);
            setClases([]);
            setLoadingClases(false);
        }
    }, [open]);

    const fetchClases = useCallback(async () => {
        if (!usuario?.id) return;
        setLoadingClases(true);
        try {
            const { data } = await apiClient.get<ClaseUsuario[]>(`/users/${usuario.id}/classes`);
            setClases(data ?? []);
        } catch (e) {
            console.error('Error al obtener clases del usuario', e);
        } finally {
            setLoadingClases(false);
        }
    }, [usuario?.id]);

    const handleAccordionChange = async (_: any, isOpen: boolean) => {
        setExpanded(isOpen);
        if (isOpen && clases.length === 0 && !loadingClases) {
            await fetchClases();
        }
    };

    const details = useMemo(() => {
        if (!usuario) return [];
        return [
            { label: 'ID (custom)', value: usuario.customId || '—' },
            { label: 'Nombre', value: usuario.name || '—' },
            { label: 'DNI', value: usuario.dni || '—' },
            { label: 'Teléfono', value: usuario.phone || '—' },
            { label: 'Nacimiento', value: usuario.birth ? new Date(usuario.birth).toLocaleDateString('es-AR') : '—' },
            { label: 'RFID', value: usuario.rfid || '—' },
            { label: 'Rol', value: usuario.role || '—' },
        ];
    }, [usuario]);

    if (!usuario) return null;

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>Detalle del usuario</DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2}>
                    {details.map(({ label, value }) => (
                        <Grid item xs={12} sm={6} key={label}>
                            <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
                                {label}
                            </Typography>
                            <Typography variant="body1">{value}</Typography>
                        </Grid>
                    ))}
                </Grid>

                {isInstructor && (
                    <Accordion expanded={expanded} onChange={handleAccordionChange} sx={{ mt: 2 }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subtitle1">Clases del usuario</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            {loadingClases ? (
                                <Typography variant="body2">Cargando clases…</Typography>
                            ) : clases.length === 0 ? (
                                <Typography variant="body2">No se encontraron clases.</Typography>
                            ) : (
                                <List dense>
                                    {clases.map((c) => (
                                        <ListItem key={c.id} disableGutters>
                                            <ListItemText
                                                primary={c.title || c.id}
                                                secondary={`Desde: ${fmtDate(c.startDate)}  ·  Hasta: ${fmtDate(c.endDate)}`}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            )}
                        </AccordionDetails>
                    </Accordion>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant="outlined">Cerrar</Button>
            </DialogActions>
        </Dialog>
    );
};

export default DetailUsuarioDialog;
