import { Head } from '@inertiajs/react'
import { 
  SidebarInset, 
  SidebarProvider, 
  SidebarTrigger 
} from '~/components/ui/sidebar'
import AppSidebar from '~/components/AppSidebar'
import { Layers } from 'lucide-react'

interface User {
  id: number
  fullName: string
  email: string
}

interface EtapasPlantillasProps {
  user: User
}

export default function EtapasPlantillas({ user }: EtapasPlantillasProps) {
  return (
    <>
      <Head title="Etapas y Plantillas" />
      
      <SidebarProvider>
        <AppSidebar user={user} />
        
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-4">
            <SidebarTrigger className="-ml-1 hover:bg-gray-100" />
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-gray-800">Etapas y Plantillas</h1>
            </div>
          </header>
          
          <div className="flex flex-1 flex-col gap-4 p-4">
            <div className="min-h-screen flex items-center justify-center bg-white">
              <div className="max-w-md w-full text-center">
                <div className="animate-fade-in">
                  <Layers className="h-16 w-16 text-orange-500 mx-auto mb-6 animate-slide-up" />
                  <h1 className="text-4xl font-extrabold text-gray-800 mb-4 animate-slide-up">
                    Etapas y Plantillas
                  </h1>
                  <p className="text-lg text-gray-600 mb-8 animate-slide-up-delayed">
                    Configurar etapas y plantillas de email (Markdown/BBCode).
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
