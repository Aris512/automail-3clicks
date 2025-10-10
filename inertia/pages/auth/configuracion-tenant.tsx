import { Head } from '@inertiajs/react'
import AppSidebar from '~/components/AppSidebar'
import { Building2 } from 'lucide-react'

interface User {
  id: number
  fullName: string
  email: string
}

interface ConfiguracionTenantProps {
  user: User
}

export default function ConfiguracionTenant({ user }: ConfiguracionTenantProps) {
  return (
    <>
      <Head title="Configuración del Tenant" />
      
      <AppSidebar user={user} pageTitle="Configuración del Tenant">
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="max-w-md w-full text-center">
            <div className="animate-fade-in">
              <Building2 className="h-16 w-16 text-orange-500 mx-auto mb-6 animate-slide-up" />
              <h1 className="text-4xl font-extrabold text-gray-800 mb-4 animate-slide-up">
                Configuración del Tenant
              </h1>
              <p className="text-lg text-gray-600 mb-8 animate-slide-up-delayed">
                Datos generales y miembros del tenant.
              </p>
            </div>
          </div>
        </div>
      </AppSidebar>
    </>
  )
}
