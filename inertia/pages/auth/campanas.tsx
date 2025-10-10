import { Head } from '@inertiajs/react'
import AppSidebar from '~/components/AppSidebar'
import { Megaphone } from 'lucide-react'

interface User {
  id: number
  fullName: string
  email: string
}

interface CampanasProps {
  user: User
}

export default function Campanas({ user }: CampanasProps) {
  return (
    <>
      <Head title="Campañas" />
      
      <AppSidebar user={user} pageTitle="Campañas">
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="max-w-md w-full text-center">
            <div className="animate-fade-in">
              <Megaphone className="h-16 w-16 text-orange-500 mx-auto mb-6 animate-slide-up" />
              <h1 className="text-4xl font-extrabold text-gray-800 mb-4 animate-slide-up">
                Campañas
              </h1>
              <p className="text-lg text-gray-600 mb-8 animate-slide-up-delayed">
                Crear, editar, pausar o eliminar campañas.
              </p>
            </div>
          </div>
        </div>
      </AppSidebar>
    </>
  )
}
