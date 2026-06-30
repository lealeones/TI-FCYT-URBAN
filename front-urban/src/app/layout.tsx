// Third-party Imports
import 'react-perfect-scrollbar/dist/css/styles.css'

// Type Imports
import type { ChildrenType } from '@core/types'

// Style Imports
import '@/app/globals.css'

// Generated Icon CSS Imports
import '@assets/iconify-icons/generated-icons.css'
import { UserAuthProvider } from './context/UserAuth'
import { AxiosInterceptorProvider } from '@/lib/AxiosInterceptorProvider'
import { Suspense } from 'react'

export const metadata = {
  title: 'Urban dance',
  description: 'Gestión de clases y usuarios de Urban Dance'
}

const RootLayout = ({ children }: ChildrenType) => {
  // Vars
  const direction = 'ltr'

  return (
    <html id='__next' dir={direction}>
      <body className='flex is-full min-bs-full flex-auto flex-col'>
        <Suspense fallback={null}>
          <UserAuthProvider>
            <AxiosInterceptorProvider>
              {children}
            </AxiosInterceptorProvider>
          </UserAuthProvider>
        </Suspense>
      </body>
    </html>
  )
}

export default RootLayout
