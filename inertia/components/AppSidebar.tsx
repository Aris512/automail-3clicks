import React from 'react'
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger
} from './ui/sidebar'
import { Link } from '@inertiajs/react'
import { 
  Home, 
  Mail, 
  Megaphone, 
  Layers, 
  Users, 
  Globe, 
  MessageSquare, 
  Reply, 
  UserX, 
  Building2,
  LogOut,
  User
} from 'lucide-react'

interface User {
  id: number
  fullName: string
  email: string
}

interface AppSidebarProps {
  user: User
  children: React.ReactNode
  pageTitle: string
  isFirstVisit?: boolean
}

export default function AppSidebar({ user, children, pageTitle, isFirstVisit = false }: AppSidebarProps) {
  return (
    <SidebarProvider defaultOpen={!isFirstVisit}>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-2 transition-all duration-300 ease-in-out hover:bg-orange-50 rounded-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white transition-all duration-300 ease-in-out hover:scale-110 hover:shadow-lg">
              <Mail className="h-4 w-4 transition-transform duration-300 ease-in-out" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold text-gray-800 transition-colors duration-300 ease-in-out">AutoMail</span>
              <span className="truncate text-xs text-gray-600 transition-colors duration-300 ease-in-out">Sistema de correo</span>
            </div>
          </div>
        </SidebarHeader>
        
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navegación</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="transition-all duration-300 ease-in-out hover:bg-orange-50 hover:text-orange-700 hover:scale-[1.02] hover:shadow-sm">
                    <Link href="/dashboard">
                      <Home className="h-4 w-4 transition-transform duration-300 ease-in-out group-hover:scale-110" />
                      <span className="transition-colors duration-300 ease-in-out">Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="transition-all duration-300 ease-in-out hover:bg-orange-50 hover:text-orange-700 hover:scale-[1.02] hover:shadow-sm">
                    <Link href="/campanas">
                      <Megaphone className="h-4 w-4 transition-transform duration-300 ease-in-out group-hover:scale-110" />
                      <span className="transition-colors duration-300 ease-in-out">Campañas</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="transition-all duration-300 ease-in-out hover:bg-orange-50 hover:text-orange-700 hover:scale-[1.02] hover:shadow-sm">
                    <Link href="/etapas-plantillas">
                      <Layers className="h-4 w-4 transition-transform duration-300 ease-in-out group-hover:scale-110" />
                      <span className="transition-colors duration-300 ease-in-out">Etapas y Plantillas</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="transition-all duration-300 ease-in-out hover:bg-orange-50 hover:text-orange-700 hover:scale-[1.02] hover:shadow-sm">
                    <Link href="/contactos">
                      <Users className="h-4 w-4 transition-transform duration-300 ease-in-out group-hover:scale-110" />
                      <span className="transition-colors duration-300 ease-in-out">Contactos</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="transition-all duration-300 ease-in-out hover:bg-orange-50 hover:text-orange-700 hover:scale-[1.02] hover:shadow-sm">
                    <Link href="/dominios-smtp">
                      <Globe className="h-4 w-4 transition-transform duration-300 ease-in-out group-hover:scale-110" />
                      <span className="transition-colors duration-300 ease-in-out">Dominios / SMTP</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="transition-all duration-300 ease-in-out hover:bg-orange-50 hover:text-orange-700 hover:scale-[1.02] hover:shadow-sm">
                    <Link href="/respuestas">
                      <MessageSquare className="h-4 w-4 transition-transform duration-300 ease-in-out group-hover:scale-110" />
                      <span className="transition-colors duration-300 ease-in-out">Respuestas</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="transition-all duration-300 ease-in-out hover:bg-orange-50 hover:text-orange-700 hover:scale-[1.02] hover:shadow-sm">
                    <Link href="/bounces">
                      <Reply className="h-4 w-4 transition-transform duration-300 ease-in-out group-hover:scale-110" />
                      <span className="transition-colors duration-300 ease-in-out">Bounces</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="transition-all duration-300 ease-in-out hover:bg-orange-50 hover:text-orange-700 hover:scale-[1.02] hover:shadow-sm">
                    <Link href="/envios">
                      <Mail className="h-4 w-4 transition-transform duration-300 ease-in-out group-hover:scale-110" />
                      <span className="transition-colors duration-300 ease-in-out">Envíos</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="transition-all duration-300 ease-in-out hover:bg-orange-50 hover:text-orange-700 hover:scale-[1.02] hover:shadow-sm">
                    <Link href="/cancelaciones">
                      <UserX className="h-4 w-4 transition-transform duration-300 ease-in-out group-hover:scale-110" />
                      <span className="transition-colors duration-300 ease-in-out">Cancelaciones</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="transition-all duration-300 ease-in-out hover:bg-orange-50 hover:text-orange-700 hover:scale-[1.02] hover:shadow-sm">
                    <Link href="/configuracion-tenant">
                      <Building2 className="h-4 w-4 transition-transform duration-300 ease-in-out group-hover:scale-110" />
                      <span className="transition-colors duration-300 ease-in-out">Configuración tenant</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        
        <SidebarFooter>
          {/* Información del usuario */}
          <div className="p-2 mb-2">
            <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg transition-all duration-300 ease-in-out hover:from-orange-100 hover:to-orange-200">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                <User className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">
                  {user.fullName}
                </div>
              </div>
            </div>
          </div>
          
          {/* Botón de logout */}
          <div className="p-2">
            <Link 
              href="/logout" 
              method="post"
              className="flex items-center gap-2 w-full p-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-300 ease-in-out"
            >
              <LogOut className="h-4 w-4" />
              <span>Cerrar Sesión</span>
            </Link>
          </div>
          
          {/* Versión */}
          <div className="p-2">
            <div className="text-xs text-muted-foreground text-center">
              AutoMail v1.0
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-4">
          <SidebarTrigger className="-ml-1 hover:bg-gray-100" />
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-800">{pageTitle}</h1>
          </div>
        </header>
        
        <div className="flex flex-1 flex-col gap-4 p-4">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
