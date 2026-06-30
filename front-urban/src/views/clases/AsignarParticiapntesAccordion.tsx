'use client'

import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Button,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ClearIcon from '@mui/icons-material/Clear'
import {
    Grid,
    InputAdornment,
    Paper,
    TextField,
    Tooltip
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useUserAuth } from '@/app/context/UserAuth'
import apiClient from '@/lib/apiClient'

type UserSession = { id: string; customId: string; name: string; role: string }

type ResponseGetParticipants = { selected: UserSession[]; available: UserSession[] }

type Props = {
    clase: any
}

const AsignarParticiapntesAccordion = ({ clase }: Props) => {
    const { token } = useUserAuth()

    const [selectedParticipants, setSelectedParticipants] = useState<UserSession[]>([])
    const [availableParticipants, setAvailableParticipants] = useState<UserSession[]>([])
    const [qSelected, setQSelected] = useState('')
    const [qAvailable, setQAvailable] = useState('')
    const [saving, setSaving] = useState(false)


    const filteredSelected = useMemo(
        () => selectedParticipants.filter(u => u.name.toLowerCase().includes(qSelected.toLowerCase())),
        [selectedParticipants, qSelected]
    )
    const filteredAvailable = useMemo(
        () => availableParticipants.filter(u => u.name.toLowerCase().includes(qAvailable.toLowerCase())),
        [availableParticipants, qAvailable]
    )

    const handleAddParticipant = (user: UserSession) => {
        setAvailableParticipants(prev => prev.filter(p => (p.customId || p.id) !== (user.customId || user.id)))
        setSelectedParticipants(prev =>
            prev.some(p => (p.customId || p.id) === (user.customId || user.id)) ? prev : [...prev, user]
        )
    }

    const handleRemoveParticipant = (user: UserSession) => {
        setSelectedParticipants(prev => prev.filter(p => (p.customId || p.id) !== (user.customId || user.id)))
        setAvailableParticipants(prev =>
            prev.some(p => (p.customId || p.id) === (user.customId || user.id)) ? prev : [...prev, user]
        )
    }

    const handleUpdateParticipants = async () => {
        if (!clase?.id || !token) return
        setSaving(true)
        try {
            await apiClient.put(
                `/sessions/${clase.id}/participants`,
                { userIds: selectedParticipants.map(u => u.id) }
            )
        } catch {
        } finally {
            setSaving(false)
        }
    }


    useEffect(() => {
        if (!open || !clase?.id || !token) return
        const controller = new AbortController()
            ; (async () => {
                const response = await apiClient.get<ResponseGetParticipants>(
                    `/sessions/${clase.id}/participants`,
                    { signal: controller.signal }
                )
                setSelectedParticipants(response.data.selected || [])
                setAvailableParticipants(response.data.available || [])
            })().catch(() => { })
        return () => controller.abort()
    }, [open, clase?.id, token])

    return (
        <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography><strong>Asignar participantes</strong></Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Grid container spacing={2} alignItems="stretch">
                    {/* SELECCIONADOS */}
                    <Grid item xs={12} md={5}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>Seleccionados</Typography>
                        <Paper
                            variant="outlined"
                            sx={{
                                borderRadius: 2,
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                maxHeight: 360,
                                overflow: 'auto',
                                p: 1.5,
                            }}
                        >
                            <TextField
                                size="small"
                                placeholder="Buscar por nombre…"
                                value={qSelected}
                                onChange={(e) => setQSelected(e.target.value)}
                                fullWidth
                                variant="filled"
                                InputLabelProps={{ shrink: true }}
                                InputProps={{
                                    endAdornment: qSelected ? (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => setQSelected('')} aria-label="Limpiar búsqueda">
                                                <ClearIcon fontSize="small" />
                                            </IconButton>
                                        </InputAdornment>
                                    ) : undefined,
                                }}
                                sx={{
                                    mb: 1.5,
                                    '& .MuiFilledInput-root': {
                                        backgroundColor: 'rgba(255,255,255,0.04)',
                                        borderRadius: 2,
                                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.06)' },
                                        '&.Mui-focused': { backgroundColor: 'rgba(255,255,255,0.07)' },
                                    },
                                }}
                            />
                            <List dense>
                                {filteredSelected.map((user, idx) => (
                                    <ListItem
                                        key={user.customId || user.id}
                                        divider
                                        sx={{
                                            backgroundColor: idx % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
                                            border: '1px solid rgba(255,255,255,0.14)',
                                            borderRadius: 1.5,
                                            mb: 0.75,
                                            px: 1.25,
                                            '&:hover': {
                                                bgcolor: 'rgba(255,255,255,0.09)',
                                                borderColor: 'rgba(255,255,255,0.24)',
                                            },
                                        }}
                                        secondaryAction={
                                            <Tooltip title="quitar de clase" arrow>
                                                <IconButton onClick={() => handleRemoveParticipant(user)}>
                                                    <ArrowBackIcon />
                                                </IconButton>
                                            </Tooltip>
                                        }
                                    >
                                        <ListItemText
                                            // sx={{ backgroundColor: idx % 2 === 0 ? 'mediumblue' : 'rgba(255,255,255,0.06)' }}
                                            primary={user.name}
                                            primaryTypographyProps={{ sx: { color: '#e6edf3' } }}
                                            secondaryTypographyProps={{ sx: { color: 'rgba(230,237,243,0.6)' } }}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </Paper>
                    </Grid>

                    {/* FLECHA CENTRAL */}
                    <Grid item xs={12} md={2} container alignItems="center" justifyContent="center">
                        <ArrowForwardIcon fontSize="large" />
                    </Grid>

                    {/* DISPONIBLES */}
                    <Grid item xs={12} md={5}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>Disponibles</Typography>
                        <Paper
                            variant="outlined"
                            sx={{
                                borderRadius: 2,
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                maxHeight: 360,
                                overflow: 'auto',
                                p: 1.5,
                            }}
                        >
                            <TextField
                                size="small"
                                placeholder="Buscar por nombre…"
                                value={qAvailable}
                                onChange={(e) => setQAvailable(e.target.value)}
                                fullWidth
                                variant="filled"
                                InputLabelProps={{ shrink: true }}
                                InputProps={{
                                    endAdornment: qAvailable ? (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => setQAvailable('')} aria-label="Limpiar búsqueda">
                                                <ClearIcon fontSize="small" />
                                            </IconButton>
                                        </InputAdornment>
                                    ) : undefined,
                                }}
                                sx={{
                                    mb: 1.5,
                                    '& .MuiFilledInput-root': {
                                        backgroundColor: 'rgba(255,255,255,0.04)',
                                        borderRadius: 2,
                                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.06)' },
                                        '&.Mui-focused': { backgroundColor: 'rgba(255,255,255,0.07)' },
                                    },
                                }}
                            />
                            <List dense>
                                {filteredAvailable.map((user, idx) => (
                                    <ListItem
                                        key={user.customId || user.id}
                                        divider
                                        sx={{
                                            bgcolor: idx % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
                                            border: '1px solid rgba(255,255,255,0.14)',
                                            borderRadius: 1.5,
                                            mb: 0.75,
                                            px: 1.25,
                                            '&:hover': {
                                                bgcolor: 'rgba(255,255,255,0.09)',
                                                borderColor: 'rgba(255,255,255,0.24)',
                                            },
                                        }}
                                        secondaryAction={
                                            <Tooltip title="agregar a clase" arrow>
                                                <IconButton onClick={() => handleAddParticipant(user)}>
                                                    <ArrowForwardIcon />
                                                </IconButton>
                                            </Tooltip>
                                        }
                                    >
                                        <ListItemText
                                            primary={user.name}
                                            primaryTypographyProps={{ sx: { color: '#e6edf3' } }}
                                            secondaryTypographyProps={{ sx: { color: 'rgba(230,237,243,0.6)' } }}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </Paper>
                    </Grid>
                    <Button onClick={handleUpdateParticipants} variant="contained" disabled={saving} sx={{ width: '100%' }}>
                        {saving ? 'Actualizando…' : 'Actualizar participantes'}
                    </Button>
                </Grid>
            </AccordionDetails>
        </Accordion>
    )
}

export default AsignarParticiapntesAccordion
