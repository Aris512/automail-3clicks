import { Head } from '@inertiajs/react'
import AppSidebar from '~/components/AppSidebar'

interface User {
  id: number
  fullName: string
  email: string
}

interface DashboardProps {
  user: User
  isFirstVisit: boolean
}

export default function Dashboard({ user, isFirstVisit }: DashboardProps) {
  return (
    <>
      <Head title="Dashboard" />
      
      <AppSidebar user={user} pageTitle="Dashboard" isFirstVisit={isFirstVisit}>
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="max-w-md w-full text-center">
            <div className="animate-fade-in">
              <h1 className="text-4xl font-extrabold text-gray-800 mb-4 animate-slide-up">
                🎉 Dashboard
              </h1>
              <p className="text-lg text-gray-600 mb-8 animate-slide-up-delayed">
                ¡Bienvenido! El login/register funcionó correctamente.
              </p>
            </div>
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-4 rounded-lg shadow-lg animate-slide-up-card hover:shadow-xl transition-all duration-300 ease-out">
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl">✅</span>
                <span className="font-medium">Autenticación exitosa</span>
              </div>
            </div>
          </div>
        </div>
      </AppSidebar>
    </>
  )
}
