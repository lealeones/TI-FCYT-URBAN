'use client';

import { useUsuarios } from '@/@core/hooks/useUsuarios';
import { useUserAuth } from '@/app/context/UserAuth';
import { Add } from '@mui/icons-material';
import { alpha, Box, Card, CardActionArea, CardContent, Grid, Typography } from '@mui/material';
import { useState } from 'react';
import { InvoiceUserDialog } from './InvoiceUserDialog';
import ListUsuarios from './ListUsuarios';
import { UpsertUsuarioDialog } from './UpsertUsuarioDialog';
import { Usuario } from './usuarios.dto';

const UsuariosComponent = () => {
    const [openUpsert, setOpenUpsert] = useState(false);
    const [usuarioSel, setUsuarioSel] = useState<Usuario | null>(null);
    const [openDialogInvoice, setOpenDialogInvoice] = useState(false);

    const { token } = useUserAuth();
    const { data, loading, error, refresh: refreshUsers } = useUsuarios();

    const handleNuevoUsuario = () => {
        setUsuarioSel(null); // modo creación
        setOpenUpsert(true);
    };

    return (
        <Box p={4} width="100%">
            <Grid container spacing={4}>
                <Grid item xs={12}>
                    <Card
                        onClick={handleNuevoUsuario}
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
                                borderColor: alpha(theme.palette.primary.main, 0.5),
                                cursor: 'pointer'
                            },
                            '&:active': { transform: 'translateY(0) scale(0.998)' }
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
                                    Nuevo usuario
                                </Typography>
                                <Typography variant="body2" color="text.secondary" textAlign="center">
                                    Crear una cuenta para alumno o instructor
                                </Typography>
                            </CardContent>
                        </CardActionArea>
                    </Card>
                </Grid>
                <Grid container item width={'100%'}>
                    <ListUsuarios
                        data={data}
                        loading={loading}
                        error={error}
                        refresh={refreshUsers}
                        onEdit={(u) => {
                            setUsuarioSel(u);
                            setOpenUpsert(true);
                        }}
                        onView={(u) => {
                            setUsuarioSel(u);
                            setOpenDialogInvoice(true);
                        }}
                    />
                </Grid>
            </Grid>
            <UpsertUsuarioDialog
                open={openUpsert}
                onClose={() => setOpenUpsert(false)}
                usuario={usuarioSel}
                onRefresh={refreshUsers}
            />

            <InvoiceUserDialog
                open={openDialogInvoice}
                onClose={() => setOpenDialogInvoice(false)}
                usuario={usuarioSel}
                onRefresh={refreshUsers}
            />
        </Box>
    );
};

export default UsuariosComponent;
