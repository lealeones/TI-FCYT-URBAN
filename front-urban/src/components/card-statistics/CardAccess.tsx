// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import Box from '@mui/material/Box'
import { alpha } from '@mui/material/styles'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'

// Tus componentes
import CustomAvatar from '@core/components/mui/Avatar'
import OptionMenu from '@core/components/option-menu'

type Props = {
  accessLog: {
    currentAccess: string
    lastAccess: string
  }
}

// helpers
const isNoLog = (s?: string) => !s || s === 'Sin registro'

const formatTime = (s: string) => {
  if (isNoLog(s)) return null
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

const formatDateTime = (s: string) => {
  if (isNoLog(s)) return 'Sin registro'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return 'Sin registro'
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const CardAccess = ({ accessLog }: Props) => {
  const timeToday = formatTime(accessLog?.currentAccess)
  const isWarning = !timeToday

  const chipLabel = isWarning ? 'Sin registro' : `${timeToday} hs`
  const chipColor: 'success' | 'warning' = isWarning ? 'warning' : 'success'
  const chipIcon = isWarning ? <WarningAmberRoundedIcon /> : <AccessTimeIcon />

  const tooltipText = isWarning
    ? 'No tenemos registro de tu acceso hoy.'
    : `Primer ingreso de hoy: ${timeToday} hs`

  return (
    <Card
      className='bs-full'
      sx={{
        borderRadius: 3,
        backdropFilter: 'blur(6px)',
        backgroundImage: theme =>
          `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(
            theme.palette.background.paper,
            0.7
          )} 100%)`,
        boxShadow: theme => `0 10px 30px ${alpha(theme.palette.common.black, 0.25)}`
      }}
    >
      <CardContent>
        <div className='flex justify-between items-center is-full mbe-5'>
          <CustomAvatar color={'success'} skin={undefined} size={undefined} className='shadow-xs'>
            <i className='ri-timer-2-line' />
          </CustomAvatar>

          {/* <OptionMenu
            options={['Refresh', 'Share', 'Update']}
            iconButtonProps={{ className: 'text-textPrimary' }}
          /> */}
        </div>

        <div className='flex flex-col gap-1'>
          <Typography color='text.primary' className='font-medium'>
            Reloj de acceso
          </Typography>

          <Box className='flex gap-x-2 gap-y-1 items-center flex-wrap'>
            <Typography
              variant='h4'
              sx={{
                fontWeight: 600,
                background: theme =>
                  `linear-gradient(90deg, ${theme.palette.text.primary} 0%, ${alpha(
                    theme.palette.text.primary,
                    0.6
                  )} 100%)`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                letterSpacing: 0.2
              }}
            >
              Hoy:
            </Typography>

            <Tooltip title={tooltipText} arrow placement='top'>
              <Chip
                icon={chipIcon}
                label={chipLabel}
                color={chipColor}
                variant='filled'
                size='medium'
                sx={theme => ({
                  px: 1,
                  fontWeight: 700,
                  letterSpacing: 0.2,
                  color: theme.palette[chipColor].contrastText,
                  border: `1px solid ${alpha(theme.palette[chipColor].main, 0.6)}`,
                  transition: 'transform .15s ease, box-shadow .15s ease, filter .15s ease',
                  willChange: 'transform',
                  '&:hover': {
                    transform: 'scale(1.04)',
                    boxShadow: `0 8px 22px ${alpha(theme.palette[chipColor].main, 0.35)}`,
                    filter: 'saturate(1.05)'
                  }
                })}
              />
            </Tooltip>
          </Box>

          <Typography variant='body2' sx={{ opacity: 0.9 }}>
            Último acceso: <b>{formatDateTime(accessLog?.lastAccess)}</b>
          </Typography>
        </div>
      </CardContent>
    </Card>
  )
}

export default CardAccess
