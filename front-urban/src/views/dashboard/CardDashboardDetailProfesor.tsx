// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import { alpha, Badge } from '@mui/material'

// Type Imports
import type { ThemeColor } from '@core/types'

// Components Imports
import OptionMenu from '@core/components/option-menu'
import CustomAvatar from '@core/components/mui/Avatar'
import { useUserAuth } from '@/app/context/UserAuth'

export type CardDetailsData = {
  sessions: {
    total: number
    active: number
    inactive: number
  }
  users: {
    total: number
    active: number
    inactive: number
  }
  assistants: number
  invoices: {
    total: number
    paid: number
    pending: number
  }
  revenue: number
}

type Props = {
  cardDetails: CardDetailsData | undefined
}

// helpers
const fmtInt = (n?: number) =>
  typeof n === 'number' ? n.toLocaleString('es-AR') : '—'

const fmtCurrency = (n?: number) =>
  typeof n === 'number'
    ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
    : '—'

const CardDashboardDetail = ({ cardDetails }: Props) => {
  const { user } = useUserAuth()

  const items: Array<{
    title: string
    stats: string
    subtitle?: string
    color: ThemeColor
    icon: string
    showBadge?: boolean
    badgeContent?: number
  }> = [
      {
        title: 'Clases',
        stats: fmtInt(cardDetails?.sessions.total),
        subtitle: `${fmtInt(cardDetails?.sessions.active)} activas`,
        color: 'primary',
        icon: 'ri-pie-chart-2-line'
      },
      {
        title: 'Asistentes',
        stats: fmtInt(cardDetails?.assistants),
        color: 'warning',
        icon: 'ri-user-add-line'
      },
      ...(user && user?.role === 'ADMIN' ? [
        {
          title: 'Usuarios',
          stats: fmtInt(cardDetails?.users.total),
          subtitle: `${fmtInt(cardDetails?.users.active)} activos`,
          color: 'success' as ThemeColor,
          icon: 'ri-group-line'
        },
        {
          title: 'Facturas',
          stats: fmtInt(cardDetails?.invoices?.total),
          subtitle: `${fmtInt(cardDetails?.invoices?.pending)} pendientes`,
          color: 'warning' as ThemeColor,
          icon: 'ri-file-list-3-line',
          showBadge: (cardDetails?.invoices?.pending ?? 0) > 0,
          badgeContent: cardDetails?.invoices?.pending
        },
        {
          title: 'Ingresos',
          stats: fmtCurrency(cardDetails?.revenue),
          color: 'info' as ThemeColor,
          icon: 'ri-money-dollar-circle-line'
        }
      ] : [])
    ]

  return (
    <Card
      className='bs-full'
      sx={theme => ({
        borderRadius: 3,
        backdropFilter: 'blur(6px)',
        backgroundImage: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(
          theme.palette.background.paper,
          0.72
        )} 100%)`,
        boxShadow: `0 10px 30px ${alpha('#000', 0.2)}`
      })}
    >

      <CardHeader
        title={
          <Typography
            variant='h6'
            sx={theme => ({
              fontWeight: 800,
              letterSpacing: 0.2,
              background: `linear-gradient(90deg, ${theme.palette.text.primary} 0%, ${alpha(
                theme.palette.text.primary,
                0.55
              )} 100%)`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              //  color: 'transparent'
            })}
          >
            Detalles
          </Typography>
        }
        // action={<OptionMenu iconClassName='text-textPrimary' options={['Refresh', 'Share', 'Update']} />}
        subheader={
          <p className='mbs-3'>
            <span className='text-textSecondary'>Resumen general • datos en tiempo real</span>
          </p>
        }
      />

      <CardContent className='!pbs-5'>
        <Grid container spacing={2}>
          {items.map((item, idx) => (
            <Grid item xs={6} md={user?.role === 'ADMIN' ? 2.4 : 3} key={`${item.title}-${idx}`}>
              <div className='flex items-center gap-3'>
                <Badge
                  badgeContent={item.showBadge ? item.badgeContent : 0}
                  color="error"
                  sx={{
                    '& .MuiBadge-badge': {
                      fontWeight: 700,
                      fontSize: '0.75rem'
                    }
                  }}
                >
                  <CustomAvatar
                    variant='rounded'
                    color={item.color}
                    className='shadow-xs'
                    sx={{
                      transition: 'transform .18s ease, box-shadow .18s ease',
                      willChange: 'transform',
                      '&:hover': { transform: 'translateY(-3px) scale(1.03)' }
                    }}
                  >
                    <i className={item.icon} />
                  </CustomAvatar>
                </Badge>

                <div>
                  <Typography sx={{ opacity: 0.85, fontSize: '0.875rem' }}>{item.title}</Typography>
                  <Typography variant='h5' sx={{ fontWeight: 800 }}>
                    {item.stats}
                  </Typography>
                  {item.subtitle && (
                    <Typography variant='caption' sx={{ opacity: 0.7 }}>
                      {item.subtitle}
                    </Typography>
                  )}
                </div>
              </div>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  )
}

export default CardDashboardDetail
