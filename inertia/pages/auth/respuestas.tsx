import { Head } from '@inertiajs/react'
import AppSidebar from '~/components/AppSidebar'
import { MessageSquare } from 'lucide-react'

interface User {
  id: number
  fullName: string
  email: string
}

interface RespuestasProps {
  user: User
}

export default function Respuestas({ user }: RespuestasProps) {
  return (
    <>
      <Head title="Respuestas" />
      
      <AppSidebar user={user} pageTitle="Respuestas">
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="max-w-md w-full text-center">
            <div className="animate-fade-in">
              <MessageSquare className="h-16 w-16 text-orange-500 mx-auto mb-6 animate-slide-up" />
              <h1 className="text-4xl font-extrabold text-gray-800 mb-4 animate-slide-up">
                Respuestas
              </h1>
              <p className="text-lg text-gray-600 mb-8 animate-slide-up-delayed">
                Visualizar y gestionar respuestas de destinatarios.
              </p>
            </div>
          </div>
        </div>
      </AppSidebar>
    </>
  )
}
