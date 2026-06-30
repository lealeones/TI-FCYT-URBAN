'use client'
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Chip,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Stack,
    Tooltip,
    Typography
} from '@mui/material';
import dayjs from 'dayjs';
import 'dayjs/locale/es'; // 👈 español
import { useMemo, useState } from 'react';
import DialogAttendanceSnapshot from '../dashboard/DialogAttendanceSnapshot';
import { DeactivateDialog } from './DesactivateDialog';
import { Clase } from './DetailClaseDialog';
import DialogUpserSubstituteInstructors from './DialogUpserSubstituteInstructors';

type Props = { clase: Clase; onDeactivateSuccess?: () => void }
export type Snapshot = Clase['SessionDateSnapshot'][number]

const FechasProgramadasAccordion = ({ clase, onDeactivateSuccess }: Props) => {
    const snapshots = useMemo(() => clase.SessionDateSnapshot ?? [], [clase])

    const [selected, setSelected] = useState<Snapshot | null>(null)
    const [openAsist, setOpenAsist] = useState(false)
    const [openEditProf, setOpenEditProf] = useState(false)
    const [openDeactivate, setOpenDeactivate] = useState(false)

    const openAsistDialog = (snap: Snapshot) => {
        setSelected(snap)
        setOpenAsist(true)
    }

    const openEditProfDialog = (snap: Snapshot) => {
        setSelected(snap)
        setOpenEditProf(true)
    }

    const openDeactivateDialog = (snap: Snapshot) => {
        setSelected(snap)
        setOpenDeactivate(true)
    }

    const closeDialogs = () => {
        setOpenAsist(false)
        setOpenEditProf(false)
        setSelected(null)
    }

    const horasEntre = (startISO: string, endISO: string) => {
        const minutes = dayjs(endISO).diff(dayjs(startISO), 'minute')
        const h = minutes / 60
        return Number.isInteger(h) ? `${h} h` : `${h.toFixed(1)} h`
    }

    const diaDeSemana = (iso: string) => {
        const str = dayjs(iso).locale('es').format('dddd') // lunes, martes...
        return str.charAt(0).toUpperCase() + str.slice(1)  // Lunes, Martes...
    }

    return (
        <>
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography><strong>Fechas Programadas</strong></Typography>
                </AccordionSummary>
                <AccordionDetails>
                    {snapshots.length === 0 ? (
                        <Typography color="text.secondary">Sin fechas programadas.</Typography>
                    ) : (
                        <List dense disablePadding>
                            {snapshots.map((s) => {
                                const start = s.dateRange.start
                                const end = s.dateRange.end
                                return (
                                    <ListItem
                                        key={s.id}
                                        divider
                                        secondaryAction={
                                            <Stack direction="row" spacing={1}>
                                                <Tooltip title="Ver asistencias">
                                                    <IconButton edge="end" onClick={() => openAsistDialog(s)} disabled={!s.isActive}>
                                                        <HowToRegIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Editar profesor">
                                                    <IconButton edge="end" onClick={() => openEditProfDialog(s)} disabled={!s.isActive}>
                                                        <EditIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Dar de baja">
                                                    <IconButton edge="end" onClick={() => openDeactivateDialog(s)} disabled={!s.isActive}>
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            </Stack>
                                        }
                                    >
                                        <ListItemText
                                            primary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                    <Typography component="span" fontWeight={600}>
                                                        {dayjs(start).format('DD-MM HH-mm')}
                                                    </Typography>
                                                    <Chip size="small" label={horasEntre(start, end)} sx={{ height: 22 }} />
                                                    <Chip size="small" label={diaDeSemana(start)} sx={{ height: 22 }} />
                                                </Box>
                                            }
                                            secondary={
                                                <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                                                    <Chip
                                                        size="small"
                                                        label={
                                                            s.substituteInstructors.length > 0
                                                                ? `Suplente: ${s.substituteInstructors.map(i => i.name).join(', ')}`
                                                                : 'Sin suplente'
                                                        }
                                                        color={s.substituteInstructors.length > 0 ? "info" : "primary"}
                                                        sx={{
                                                            mt: 0.5,
                                                            height: 22
                                                        }}
                                                    />
                                                    {!s.isActive && (
                                                        <Chip
                                                            size="small"
                                                            label="Dada de baja"
                                                            color="error"
                                                            sx={{
                                                                mt: 0.5,
                                                                height: 22
                                                            }}
                                                        />
                                                    )}
                                                </Stack>
                                            }
                                        />
                                    </ListItem>
                                )
                            })}
                        </List>
                    )}
                </AccordionDetails>
            </Accordion>

            <DialogAttendanceSnapshot
                snapshot={selected as Snapshot}
                open={openAsist}
                onClose={closeDialogs}
            />

            <DialogUpserSubstituteInstructors
                closeDialogs={closeDialogs}
                openEditProf={openEditProf}
                selected={selected}
            />

            <DeactivateDialog
                open={openDeactivate}
                onClose={() => setOpenDeactivate(false)}
                modelId={selected?.id || ''}
                model='snapshot'
                claseDescription={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography component="span" fontWeight={600}>
                            {dayjs(selected?.dateRange.start).format('DD-MM HH-mm')}
                        </Typography>
                        <Chip size="small" label={horasEntre(selected?.dateRange.start!, selected?.dateRange.end!)} sx={{ height: 22 }} />
                        <Chip size="small" label={diaDeSemana(selected?.dateRange.start!)} sx={{ height: 22 }} />
                    </Box>
                }
                onSuccess={() => {
                    setOpenDeactivate(false)
                    onDeactivateSuccess?.()
                    // Aquí podrías agregar lógica para refrescar la lista si es necesario
                }}
            />


        </>
    )
}

export default FechasProgramadasAccordion
