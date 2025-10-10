import { Head } from '@inertiajs/react'
import AppSidebar from '~/components/AppSidebar'
import { UserX } from 'lucide-react'

interface User {
  id: number
  fullName: string
  email: string
}

interface CancelacionesProps {
  user: User
}

export default function Cancelaciones({ user }: CancelacionesProps) {
  return (
    <>
      <Head title="Cancelaciones" />
      
      <AppSidebar user={user} pageTitle="Cancelaciones">
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="max-w-md w-full text-center">
            <div className="animate-fade-in">
              <UserX className="h-16 w-16 text-orange-500 mx-auto mb-6 animate-slide-up" />
              <h1 className="text-4xl font-extrabold text-gray-800 mb-4 animate-slide-up">
                Cancelaciones
              </h1>
              <p className="text-lg text-gray-600 mb-8 animate-slide-up-delayed">
                Revisar y configurar palabras clave de baja.
              </p>
            </div>
          </div>
        </div>
      </AppSidebar>
    </>
  )
}
