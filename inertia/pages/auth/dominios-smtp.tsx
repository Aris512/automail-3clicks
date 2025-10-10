import { Head } from '@inertiajs/react'
import AppSidebar from '~/components/AppSidebar'
import { Globe } from 'lucide-react'

interface User {
  id: number
  fullName: string
  email: string
}

interface DominiosSMTPProps {
  user: User
}

export default function DominiosSMTP({ user }: DominiosSMTPProps) {
  return (
    <>
      <Head title="Dominios / SMTP" />
      
      <AppSidebar user={user} pageTitle="Dominios / SMTP">
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="max-w-md w-full text-center">
            <div className="animate-fade-in">
              <Globe className="h-16 w-16 text-orange-500 mx-auto mb-6 animate-slide-up" />
              <h1 className="text-4xl font-extrabold text-gray-800 mb-4 animate-slide-up">
                Dominios / SMTP
              </h1>
              <p className="text-lg text-gray-600 mb-8 animate-slide-up-delayed">
                Administrar dominios y credenciales SMTP.
              </p>
            </div>
          </div>
        </div>
      </AppSidebar>
    </>
  )
}
