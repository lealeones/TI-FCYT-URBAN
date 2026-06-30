'use client';

import { Add } from '@mui/icons-material';
import {
    alpha,
    Box,
    Card,
    CardActionArea,
    CardContent,
    Grid,
    Typography,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import DialogUpsertClase from './DialogUpsertClase';
import ListClases from './ListClases';
import { useClases } from '@/@core/hooks/useClases';
import useInstructors from '@/@core/hooks/useInstructors';
import { useUserAuth } from '@/app/context/UserAuth';

const ClasesComponent = () => {
    const [openUpsert, setOpenUpsert] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const { user } = useUserAuth();
    const { data, loading, error, refresh } = useClases({ status: statusFilter });

    // Hook de instructores
    const {
        data: instructores = [],
        loading: loadingInstructores,
        error: errorInstructores,
    } = useInstructors();
    return (
        <Box p={4} width="100%">
            <Grid container spacing={4}>
                <Grid item xs={12}>
                    {
                        user && user.role === 'ADMIN' && (
                            <Card
                                onClick={() => setOpenUpsert(true)}
                                elevation={0}
                                sx={theme => ({
                                    borderRadius: 3,
                                    backdropFilter: 'blur(6px)',
                                    backgroundImage: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(
                                        theme.palette.background.paper,
                                        0.72
                                    )} 100%)`,
                                    border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
                                    boxShadow: `0 10px 30px ${alpha('#000', 0.18)}`,
                                    transition: 'transform .15s ease, box-shadow .2s ease, border-color .2s ease',
                                    '&:hover': {
                                        transform: 'translateY(-2px) scale(1.02)',
                                        boxShadow: `0 14px 40px ${alpha(theme.palette.primary.main, 0.35)}`,
                                        borderColor: alpha(theme.palette.primary.main, 0.5)
                                    },
                                    '&:active': {
                                        transform: 'translateY(0) scale(0.998)'
                                    }
                                })}
                            >
                                <CardActionArea sx={{ p: 3 }}>
                                    <CardContent
                                        sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: 1.25
                                        }}
                                    >
                                        <Box
                                            sx={theme => ({
                                                width: 56,
                                                height: 56,
                                                borderRadius: '14px',
                                                display: 'grid',
                                                placeItems: 'center',
                                                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.18)} 0%, ${alpha(
                                                    theme.palette.primary.light,
                                                    0.12
                                                )} 100%)`,
                                                border: `1px solid ${alpha(theme.palette.primary.main, 0.35)}`
                                            })}
                                        >
                                            <Add sx={{ fontSize: 30 }} color="primary" />
                                        </Box>

                                        <Typography variant="h6" textAlign="center" sx={{ fontWeight: 800, letterSpacing: 0.2 }}>
                                            Crear nueva clase
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" textAlign="center">
                                            Programá una clase o workshop
                                        </Typography>
                                    </CardContent>
                                </CardActionArea>
                            </Card>
                        )
                    }
                </Grid>
                <Grid container item width={'100%'}  >
                    <ListClases
                        data={data}
                        loading={loading}
                        error={error}
                        refresh={refresh}
                        statusFilter={statusFilter}
                        onStatusFilterChange={setStatusFilter}
                    />
                </Grid>
            </Grid>
            <DialogUpsertClase
                open={openUpsert}
                onClose={() => setOpenUpsert(false)}
                onRefresh={refresh}
                instructores={instructores}
            />
        </Box>
    );
};

export default ClasesComponent;
