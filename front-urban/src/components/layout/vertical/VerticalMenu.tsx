// MUI Imports
import Chip from '@mui/material/Chip'
import { useTheme } from '@mui/material/styles'

// Third-party Imports
import PerfectScrollbar from 'react-perfect-scrollbar'

// Type Imports
import type { VerticalMenuContextProps } from '@menu/components/vertical-menu/Menu'

// Component Imports
import { Menu, SubMenu, MenuItem, MenuSection } from '@menu/vertical-menu'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'

// Styled Component Imports
import StyledVerticalNavExpandIcon from '@menu/styles/vertical/StyledVerticalNavExpandIcon'

// Style Imports
import menuItemStyles from '@core/styles/vertical/menuItemStyles'
import menuSectionStyles from '@core/styles/vertical/menuSectionStyles'
import { useUserAuth } from '@/app/context/UserAuth'

type RenderExpandIconProps = {
  open?: boolean
  transitionDuration?: VerticalMenuContextProps['transitionDuration']
}

const RenderExpandIcon = ({ open, transitionDuration }: RenderExpandIconProps) => (
  <StyledVerticalNavExpandIcon open={open} transitionDuration={transitionDuration}>
    <i className='ri-arrow-right-s-line' />
  </StyledVerticalNavExpandIcon>
)

const VerticalMenu = ({ scrollMenu }: { scrollMenu: (container: any, isPerfectScrollbar: boolean) => void }) => {

  // Hooks
  const { user } = useUserAuth()
  const { role } = user || {}
  const theme = useTheme()
  const { isBreakpointReached, transitionDuration } = useVerticalNav()


  const userMenu = {
    'INSTRUCTOR': VerticalMenuProfesor(transitionDuration),
    'ADMIN': VerticalMenuAdmin(transitionDuration)
  }

  const ScrollWrapper = isBreakpointReached ? 'div' : PerfectScrollbar

  return (
    // eslint-disable-next-line lines-around-comment
    /* Custom scrollbar instead of browser scroll, remove if you want browser scroll only */
    <ScrollWrapper
      {...(isBreakpointReached
        ? {
          className: 'bs-full overflow-y-auto overflow-x-hidden',
          onScroll: container => scrollMenu(container, false)
        }
        : {
          options: { wheelPropagation: false, suppressScrollX: true },
          onScrollY: container => scrollMenu(container, true)
        })}
    >
      {/* Incase you also want to scroll NavHeader to scroll with Vertical Menu, remove NavHeader from above and paste it below this comment */}
      <>
        {userMenu[role as keyof typeof userMenu] ?? null}
      </>
    </ScrollWrapper>
  )
}

const VerticalMenuProfesor = (transitionDuration: any) => {
  const theme = useTheme()
  return (
    <Menu
      menuItemStyles={menuItemStyles(theme)}
      renderExpandIcon={({ open }) => <RenderExpandIcon open={open} transitionDuration={transitionDuration} />}
      renderExpandedMenuItemIcon={{ icon: <i className='ri-circle-line' /> }}
      menuSectionStyles={menuSectionStyles(theme)}
    >
      <SubMenu
        label='Profesor'
        icon={<i className='ri-home-smile-line' />}
       // suffix={<Chip label='5' size='small' color='error' />}
      >
        <MenuItem href='/' icon={<i className='ri-dashboard-line' />}>
          Inicio
        </MenuItem>
        <MenuItem href='/clases' icon={<i className='ri-user-settings-line' />}>
          Clases
        </MenuItem>
      </SubMenu>
    </Menu>
  )
}

const VerticalMenuAdmin = (transitionDuration: any) => {
  const theme = useTheme()
  return (
    <Menu
      menuItemStyles={menuItemStyles(theme)}
      renderExpandIcon={({ open }) => <RenderExpandIcon open={open} transitionDuration={transitionDuration} />}
      renderExpandedMenuItemIcon={{ icon: <i className='ri-circle-line' /> }}
      menuSectionStyles={menuSectionStyles(theme)}
    >
      <SubMenu
        label='Admin'
        icon={<i className='ri-home-smile-line' />}
       // suffix={<Chip label='5' size='small' color='error' />}
        defaultOpen
      >
        <MenuItem href='/' icon={<i className='ri-dashboard-line' />}>
          Inicio
        </MenuItem>
        <MenuItem href='/clases' icon={<i className='ri-calendar-event-line' />}>
          Clases
        </MenuItem>
        <MenuItem href='/usuarios' icon={<i className='ri-group-line' />}>
          Usuarios
        </MenuItem>
      </SubMenu>
      <MenuSection label='Apps & Pages'>
        <SubMenu
          label='Whatsapp'
          icon={<i className='ri-wechat-line' />}
        >
          <MenuItem href={`/whatsapp`} >
            Estado
          </MenuItem>
        </SubMenu>
        <SubMenu
          label='Configuraciones'
          icon={<i className='ri-home-gear-line' />}
        >
          <MenuItem href={`/configuracion/backup`} >
            Backup
          </MenuItem>
          <MenuItem href={'/configuracion/sistema'} >
            Sistema
          </MenuItem>
        </SubMenu>
      </MenuSection>
    </Menu>
  )
}

export default VerticalMenu
