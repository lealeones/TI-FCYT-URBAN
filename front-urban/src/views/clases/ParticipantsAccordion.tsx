'use client';

import React, {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useMemo,
    useState,
} from 'react';
import {
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Grid,
    Typography,
    Button,
    Paper,
    List,
    ListItem,
    ListItemText,
    IconButton,
    CircularProgress,
    TextField,
    InputAdornment,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useSessionParticipants } from '@/@core/hooks/useSessionParticipants';
import { useUserAuth } from '@/app/context/UserAuth';

export type ParticipantsAccordionHandle = {
    /** Guarda cambios en el backend (PUT /participants) */
    save: () => Promise<void>;
    /** Refresca listas desde el backend */
    refresh: () => Promise<void>;
    /** Indica si ya se cargaron los datos al menos una vez */
    isLoaded: boolean;
};

type Props = {
    sessionId: string;
    title?: string;
    defaultExpanded?: boolean;
};

const normalize = (s: string) =>
    (s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

const ParticipantsAccordion = forwardRef<ParticipantsAccordionHandle, Props>(
    ({ sessionId, title = 'Agregar Participantes', defaultExpanded = false }, ref) => {
        const { token } = useUserAuth()
        // Lazy: no auto-fetch
        const { selected, available, add, remove, save, loading, refresh } =
            useSessionParticipants(token ?? '', sessionId, false);

        const [expanded, setExpanded] = useState(defaultExpanded);
        const [loaded, setLoaded] = useState(false);

        const [qSel, setQSel] = useState('');
        const [qAvail, setQAvail] = useState('');

        // Cargar solo al expandir por primera vez
        useEffect(() => {
            if (expanded && !loaded) {
                (async () => {
                    try {
                        await refresh();
                    } finally {
                        setLoaded(true);
                    }
                })();
            }
        }, [expanded, loaded, refresh]);

        useImperativeHandle(ref, () => ({
            save: async () => {
                if (!loaded) {
                    await refresh();
                    setLoaded(true);
                }
                await save();
            },
            refresh: async () => {
                await refresh();
                setLoaded(true);
            },
            isLoaded: loaded,
        }));

        const selFiltered = useMemo(() => {
            const q = normalize(qSel);
            if (!q) return selected;
            return selected.filter((p) =>
                normalize(`${p.customId ?? ''} ${p.name}`).includes(q),
            );
        }, [selected, qSel]);

        const availFiltered = useMemo(() => {
            const q = normalize(qAvail);
            if (!q) return available;
            return available.filter((p) =>
                normalize(`${p.customId ?? ''} ${p.name}`).includes(q),
            );
        }, [available, qAvail]);

        const clearSearches = () => {
            setQSel('');
            setQAvail('');
        };

        return (
            <Accordion expanded={expanded} onChange={(_, exp) => setExpanded(exp)} sx={{ mt: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">{title}</Typography>
                </AccordionSummary>

                <AccordionDetails>
                    <Grid container alignItems="center" sx={{ mb: 1 }}>
                        <Grid item xs />
                        <Grid item>
                            <Button
                                size="small"
                                startIcon={<ClearIcon />}
                                onClick={clearSearches}
                                disabled={loading || (!qSel && !qAvail)}
                            >
                                Limpiar búsquedas
                            </Button>
                        </Grid>
                    </Grid>

                    <Grid container spacing={2}>
                        {/* Seleccionados */}
                        <Grid item xs={12} md={5}>
                            <Typography variant="subtitle2">Seleccionados ({selected.length})</Typography>

                            <TextField
                                size="small"
                                placeholder="Buscar por nombre o ID"
                                fullWidth
                                value={qSel}
                                onChange={(e) => setQSel(e.target.value)}
                                disabled={loading && !loaded}
                                sx={{ my: 1 }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" />
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            <Paper variant="outlined" sx={{ minHeight: 240 }}>
                                {!loaded || loading ? (
                                    <Grid container alignItems="center" justifyContent="center" sx={{ py: 4 }}>
                                        <CircularProgress size={24} />
                                    </Grid>
                                ) : (
                                    <List dense>
                                        {selFiltered.map((p) => (
                                            <ListItem
                                                key={p.id}
                                                secondaryAction={
                                                    <IconButton
                                                        onClick={() => remove(p)}
                                                        disabled={loading}
                                                        aria-label="Quitar"
                                                    >
                                                        <ArrowBackIcon />
                                                    </IconButton>
                                                }
                                            >
                                                <ListItemText primary={p.customId || p.name} />
                                            </ListItem>
                                        ))}
                                        {!selFiltered.length && (
                                            <ListItem>
                                                <ListItemText
                                                    primary={qSel ? 'Sin resultados' : 'Sin participantes aún'}
                                                />
                                            </ListItem>
                                        )}
                                    </List>
                                )}
                            </Paper>
                        </Grid>

                        {/* Flecha central */}
                        <Grid item xs={12} md={2} container alignItems="center" justifyContent="center">
                            <ArrowForwardIcon fontSize="large" />
                        </Grid>

                        {/* Disponibles */}
                        <Grid item xs={12} md={5}>
                            <Typography variant="subtitle2">Disponibles ({available.length})</Typography>

                            <TextField
                                size="small"
                                placeholder="Buscar por nombre o ID"
                                fullWidth
                                value={qAvail}
                                onChange={(e) => setQAvail(e.target.value)}
                                disabled={loading && !loaded}
                                sx={{ my: 1 }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" />
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            <Paper variant="outlined" sx={{ minHeight: 240 }}>
                                {!loaded || loading ? (
                                    <Grid container alignItems="center" justifyContent="center" sx={{ py: 4 }}>
                                        <CircularProgress size={24} />
                                    </Grid>
                                ) : (
                                    <List dense>
                                        {availFiltered.map((p) => (
                                            <ListItem
                                                key={p.id}
                                                secondaryAction={
                                                    <IconButton
                                                        onClick={() => add(p)}
                                                        disabled={loading}
                                                        aria-label="Agregar"
                                                    >
                                                        <ArrowForwardIcon />
                                                    </IconButton>
                                                }
                                            >
                                                <ListItemText primary={p.customId || p.name} />
                                            </ListItem>
                                        ))}
                                        {!availFiltered.length && (
                                            <ListItem>
                                                <ListItemText
                                                    primary={qAvail ? 'Sin resultados' : 'No hay más usuarios disponibles'}
                                                />
                                            </ListItem>
                                        )}
                                    </List>
                                )}
                            </Paper>
                        </Grid>
                    </Grid>
                </AccordionDetails>
            </Accordion>
        );
    },
);

ParticipantsAccordion.displayName = 'ParticipantsAccordion';
export default ParticipantsAccordion;
