import { Head } from '@inertiajs/react'
import AppSidebar from '~/components/AppSidebar'
import { Users } from 'lucide-react'

interface User {
  id: number
  fullName: string
  email: string
}

interface ContactosProps {
  user: User
}

export default function Contactos({ user }: ContactosProps) {
  return (
    <>
      <Head title="Contactos" />
      
      <AppSidebar user={user} pageTitle="Contactos">
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="max-w-md w-full text-center">
            <div className="animate-fade-in">
              <Users className="h-16 w-16 text-orange-500 mx-auto mb-6 animate-slide-up" />
              <h1 className="text-4xl font-extrabold text-gray-800 mb-4 animate-slide-up">
                Contactos
              </h1>
              <p className="text-lg text-gray-600 mb-8 animate-slide-up-delayed">
                Importar, listar, filtrar o editar contactos de campañas.
              </p>
            </div>
          </div>
        </div>
      </AppSidebar>
    </>
  )
}
