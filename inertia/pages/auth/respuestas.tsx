import { Head } from '@inertiajs/react'
import { 
  SidebarInset, 
  SidebarProvider, 
  SidebarTrigger 
} from '~/components/ui/sidebar'
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
      
      <SidebarProvider>
        <AppSidebar user={user} />
        
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-4">
            <SidebarTrigger className="-ml-1 hover:bg-gray-100" />
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-gray-800">Respuestas</h1>
            </div>
          </header>
          
          <div className="flex flex-1 flex-col gap-4 p-4">
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
          </div>
        </SidebarInset>
      </SidebarProvider>
    </>
  )
}
