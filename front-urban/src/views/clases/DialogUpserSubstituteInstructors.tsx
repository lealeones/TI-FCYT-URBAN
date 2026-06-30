'use client'

import { Autocomplete, Box, Button, Chip, Checkbox, Stack, TextField, Typography } from '@mui/material'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { useUserAuth } from '@/app/context/UserAuth'
import { useClases } from '@/@core/hooks/useClases'
import CustomDialog from '@/utils/CustomDialog'
import { Instructor } from '@/app/modules/users/dto/instructor.dto'
import useInstructors from '@/@core/hooks/useInstructors'
import apiClient from '@/lib/apiClient'
import { Snapshot } from './FechasProgramadasAccordion'

type DialogUpserSubstituteInstructorsProps = {
    selected: Snapshot | null
    openEditProf: boolean
    closeDialogs: () => void
}

const getInstructorLabel = (i: Instructor) =>
    i?.name ?? i?.customId ?? (i as any)?.id ?? 'Instructor'

const isSameInstructor = (a: Instructor, b: Instructor) => a.id === b.id

const DialogUpserSubstituteInstructors = ({
    closeDialogs,
    openEditProf,
    selected
}: DialogUpserSubstituteInstructorsProps) => {
    const { token } = useUserAuth()
    const { refresh: refreshClases } = useClases()

    // Hook de instructores
    const {
        data: fetchedInstructors = [],
        loading,
        error: fetchError,
        refresh: refreshInstructors
    } = useInstructors()

    const [value, setValue] = useState<Instructor[]>([])
    const [saveError, setSaveError] = useState<string | null>(null)

    // Fecha para el encabezado
    const fechaTexto = useMemo(
        () =>
            selected?.dateRange?.start
                ? dayjs(selected.dateRange.start).format('DD-MM HH-mm')
                : '—',
        [selected]
    )

    // Opciones = fetched + cualquier preseleccionado que no viniera en fetched
    const options: Instructor[] = useMemo(() => {
        const preSelected = (selected?.substituteInstructors ?? []) as Instructor[]
        const byId = new Map<string, Instructor>()
        for (const i of fetchedInstructors) byId.set(i.id, i)
        for (const p of preSelected) if (!byId.has(p.id)) byId.set(p.id, p)
        return Array.from(byId.values())
    }, [fetchedInstructors, selected?.substituteInstructors])

    // Rehidratar selección cuando se abre o cambian datos/selección
    useEffect(() => {
        if (!openEditProf) return
        setSaveError(null)

        const preSelected = (selected?.substituteInstructors ?? []) as Instructor[]
        const mapped = preSelected.map(p => fetchedInstructors.find(f => f.id === p.id) ?? p)
        setValue(mapped)
    }, [openEditProf, selected?.id, fetchedInstructors])

    const handleGuardar = async () => {
        if (!selected?.id) return
        setSaveError(null)

        try {
            const substituteIds = value.map(i => i.id)

            await apiClient.put(
                `/sessions/${selected.id}/snapshot`,
                { substituteInstructorId: substituteIds }
            )

            await refreshClases()
            closeDialogs()
        } catch (err: any) {
            console.error('❌ Error al actualizar suplentes', err)
            setSaveError('Error al guardar los profesores suplentes.')
        }
    }

    return (
        <CustomDialog
            open={openEditProf}
            onClose={closeDialogs}
            maxWidth="sm"
            title="Editar profesor"
            contentProps={{ dividers: true }}
            actions={
                <>
                    <Button onClick={handleGuardar} variant="contained" disabled={loading}>
                        Guardar
                    </Button>
                </>
            }
        >
            <Stack spacing={1.5}>
                <Typography variant="body2">
                    <strong>Fecha:</strong> {fechaTexto}
                </Typography>

                <Box
                    sx={{
                        p: 2.5,
                        borderRadius: 3,
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)'
                    }}
                >
                    <Autocomplete<Instructor, true>
                        multiple
                        options={options}
                        value={value}
                        onChange={(_, newValue) => setValue(newValue)}
                        getOptionLabel={getInstructorLabel}
                        isOptionEqualToValue={(opt, val) => isSameInstructor(opt, val)}
                        disableCloseOnSelect
                        filterSelectedOptions
                        loading={loading}
                        loadingText="Cargando…"
                        noOptionsText={loading ? 'Cargando…' : 'Sin resultados'}
                        renderTags={(tagValue, getTagProps) =>
                            tagValue.map((option, index) => (
                                <Chip
                                    {...getTagProps({ index })}
                                    key={(option as any).id ?? (option as any).customId ?? index}
                                    label={getInstructorLabel(option)}
                                    sx={{
                                        height: 26,
                                        bgcolor: 'primary.main',
                                        color: 'primary.contrastText'
                                    }}
                                />
                            ))
                        }
                        renderOption={(props, option, { selected }) => (
                            <li {...props}>
                                <Checkbox sx={{ mr: 1 }} checked={selected} />
                                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                    <Typography variant="body2" fontWeight={600}>
                                        {getInstructorLabel(option)}
                                    </Typography>
                                    {(option as any).dni && (
                                        <Typography variant="caption" color="text.secondary">
                                            DNI {(option as any).dni}
                                        </Typography>
                                    )}
                                </Box>
                            </li>
                        )}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Profesores suplentes"
                                placeholder="Buscar y seleccionar…"
                                variant="filled"
                                InputLabelProps={{ shrink: true }}
                                helperText={fetchError ?? saveError ?? 'Podés elegir uno o varios profesores.'}
                                error={Boolean(fetchError || saveError)}
                                sx={{
                                    '& .MuiFilledInput-root': {
                                        backgroundColor: 'rgba(255,255,255,0.04)',
                                        borderRadius: 2,
                                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.06)' },
                                        '&.Mui-focused': {
                                            backgroundColor: 'rgba(255,255,255,0.07)'
                                        }
                                    }
                                }}
                            />
                        )}
                    />
                </Box>
            </Stack>
        </CustomDialog>
    )
}

export default DialogUpserSubstituteInstructors
