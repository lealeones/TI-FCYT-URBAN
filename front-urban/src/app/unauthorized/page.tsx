'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import LockIcon from '@mui/icons-material/LockOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

const WA_LINK = `https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5493435077510'}`;

export default function UnauthorizedPage() {
    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 4,
                bgcolor: 'background.default'
            }}
        >
            <Stack
                spacing={4}
                alignItems="center"
                sx={{
                    maxWidth: 420,
                    width: '100%',
                    textAlign: 'center'
                }}
            >
                {/* Icono minimalista */}
                <Box
                    sx={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'error.main',
                        color: 'error.contrastText'
                    }}
                >
                    <LockIcon sx={{ fontSize: 32 }} />
                </Box>

                {/* Título */}
                <Stack spacing={1}>
                    <Typography
                        variant='h5'
                        sx={{
                            fontWeight: 600,
                            color: 'text.primary'
                        }}
                    >
                        Acceso no autorizado
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{
                            color: 'text.secondary',
                            maxWidth: 340
                        }}
                    >
                        Tu token ha expirado o no es válido. Solicita uno nuevo para continuar.
                    </Typography>
                </Stack>

                {/* Botones */}
                <Stack spacing={1.5} width="100%">
                    <Button
                        component='a'
                        href={WA_LINK}
                        target='_blank'
                        rel='noopener noreferrer'
                        variant='contained'
                        color='success'
                        size="large"
                        startIcon={<WhatsAppIcon />}
                        fullWidth
                        sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            py: 1.5
                        }}
                    >
                        Solicitar token
                    </Button>
                    <Button
                        variant='text'
                        color='inherit'
                        onClick={() => location.reload()}
                        sx={{
                            textTransform: 'none',
                            color: 'text.secondary'
                        }}
                    >
                        Reintentar
                    </Button>
                </Stack>
            </Stack>
        </Box>
    );
}
