'use client'
import * as React from 'react'
import CloseIcon from '@mui/icons-material/Close'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    SxProps,
    Theme,
    DialogProps,
    Popover,
} from '@mui/material'


/** Scroll moderno que respeta tu paleta/estética */
export const modernScrollbarSX: SxProps<Theme> = {
    maxHeight: '70vh',
    overflowY: 'auto',
    scrollbarGutter: 'stable',
    scrollbarWidth: 'thin', // Firefox
    scrollbarColor: 'rgba(197,171,255,0.65) rgba(255,255,255,0.06)',
    '&::-webkit-scrollbar': { width: 10 },
    '&::-webkit-scrollbar-track': {
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 999,
        border: '1px solid rgba(255,255,255,0.06)',
    },
    '&::-webkit-scrollbar-thumb': {
        borderRadius: 999,
        background:
            'linear-gradient(180deg, var(--mui-palette-primary-main), rgba(197,171,255,0.9))',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15)',
    },
    '&::-webkit-scrollbar-thumb:hover': {
        background:
            'linear-gradient(180deg, var(--mui-palette-primary-light), rgba(197,171,255,1))',
    },
}

export type CustomDialogProps = Omit<DialogProps, 'title' | 'onClose'> & {
    open: boolean
    onClose: () => void
    /** Título del dialog (texto o nodo) */
    title?: React.ReactNode
    /** Zona de acciones al pie (botones) */
    actions?: React.ReactNode
    /** Contenido del popover de información (opcional) */
    infoContent?: React.ReactNode
    /** Estilos extra */
    paperSx?: SxProps<Theme>
    titleSx?: SxProps<Theme>
    contentSx?: SxProps<Theme>
    /** Props extra para secciones */
    titleProps?: React.ComponentProps<typeof DialogTitle>
    contentProps?: React.ComponentProps<typeof DialogContent>
    /** Mostrar botón X de cierre en el título */
    showCloseButton?: boolean
    maxWidth?: DialogProps['maxWidth']
}

const CustomDialog: React.FC<CustomDialogProps> = ({
    open,
    onClose,
    title,
    actions,
    children,
    maxWidth = 'xs',
    fullWidth = true,
    showCloseButton = true,
    infoContent,
    paperSx,
    titleSx,
    contentSx,
    titleProps,
    contentProps,
    ...dialogProps
}) => {
    const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null)

    const handleInfoClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget)
    }

    const handleInfoClose = () => {
        setAnchorEl(null)
    }

    const openPopover = Boolean(anchorEl)
    const popoverId = openPopover ? 'info-popover' : undefined

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth={fullWidth}
            maxWidth={maxWidth}
            PaperProps={{
                sx: {
                    borderRadius: 4,
                    overflow: 'hidden',
                    color: '#e6edf3',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.55)',
                    ...paperSx,
                },
            }}
            {...dialogProps}
        >
            {title !== undefined && (
                <DialogTitle
                    sx={{
                        px: 4,
                        pt: 3.5,
                        pb: 2,
                        fontWeight: 800,
                        letterSpacing: 0.4,
                        background:
                            'linear-gradient(270deg, var(--mui-palette-primary-main), rgb(197, 171, 255) 100%)',
                        color: 'white',
                        position: 'relative',
                        ...titleSx,
                    }}
                    {...titleProps}
                >
                    {title}
                    {infoContent && (
                        <IconButton
                            aria-label="Información"
                            aria-describedby={popoverId}
                            onClick={handleInfoClick}
                            size="small"
                            sx={{
                                position: 'absolute',
                                right: showCloseButton ? 52 : 12,
                                top: 12,
                                color: 'white',
                                bgcolor: 'rgba(255,255,255,0.1)',
                                borderRadius: 1.5,
                                padding: '6px',
                                '&:hover': {
                                    bgcolor: 'rgba(255,255,255,0.2)',
                                    transform: 'scale(1.05)',
                                },
                                transition: 'all 0.2s ease-in-out',
                            }}
                        >
                            <InfoOutlinedIcon fontSize="small" />
                        </IconButton>
                    )}
                    {showCloseButton && (
                        <IconButton
                            aria-label="Cerrar"
                            onClick={onClose}
                            size="small"
                            sx={{
                                position: 'absolute',
                                right: 12,
                                top: 12,
                                color: 'white',
                                bgcolor: 'rgba(255,255,255,0.1)',
                                borderRadius: 1.5,
                                padding: '6px',
                                '&:hover': {
                                    bgcolor: 'rgba(255,255,255,0.2)',
                                    transform: 'scale(1.05)',
                                },
                                transition: 'all 0.2s ease-in-out',
                            }}
                        >
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    )}
                </DialogTitle>
            )}

            <DialogContent
                sx={{
                    px: 4,
                    py: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2.5,
                    ...modernScrollbarSX,
                    ...contentSx,
                }}
                {...contentProps}
            >
                {children}
            </DialogContent>

            {actions ? <DialogActions sx={{ px: 4, pb: 3 }}>{actions}</DialogActions> : null}

            {infoContent && (
                <Popover
                    id={popoverId}
                    open={openPopover}
                    anchorEl={anchorEl}
                    onClose={handleInfoClose}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'left',
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                    }}
                    PaperProps={{
                        sx: {
                            p: 2,
                            maxWidth: 300,
                            borderRadius: 2,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                        },
                    }}
                >
                    {infoContent}
                </Popover>
            )}
        </Dialog>
    )
}

export default CustomDialog
