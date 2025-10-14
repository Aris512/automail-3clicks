import { Head } from '@inertiajs/react'
import AppSidebar from '~/components/AppSidebar'
import { Globe, Mail, Send, Settings, TestTube } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { useToast } from '~/hooks/useToast'
import ToastContainer from '~/components/ui/toast-container'

interface User {
  id: number
  fullName: string
  email: string
}

interface DominiosSMTPProps {
  user: User
}

export default function DominiosSMTP({ user }: DominiosSMTPProps) {
  const { toasts, showSuccess, showError, showWarning, removeToast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isSavingConfig, setIsSavingConfig] = useState(false)
  
  // Estados para configuración SMTP
  const [smtpConfig, setSmtpConfig] = useState({
    host: '',
    port: '587',
    username: '',
    password: '',
    fromEmail: '',
    encryption: 'tls',
    provider: ''
  })

  // Estados para configuraciones existentes
  const [existingConfigs, setExistingConfigs] = useState<any[]>([])
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(false)
  const [isEditingExisting, setIsEditingExisting] = useState(false)
  const [originalConfig, setOriginalConfig] = useState<any>(null)
  
  // Estados para eliminación
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [configToDelete, setConfigToDelete] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  // Estados para envío de correo
  const [emailData, setEmailData] = useState({
    to: '',
    subject: '',
    message: ''
  })


  // Cargar configuraciones existentes al montar el componente
  useEffect(() => {
    loadExistingConfigs()
  }, [])

  // Función helper para obtener el token CSRF
  const getCsrfToken = () => {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
  }

  // Función para formatear fecha en formato MM-DD HH:MM
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${month}-${day} ${hours}:${minutes}`
  }

  // Función para cargar configuraciones existentes
  const loadExistingConfigs = async () => {
    setIsLoadingConfigs(true)
    try {
      const response = await fetch('/smtp-config', {
        method: 'GET',
        headers: {
          'X-CSRF-TOKEN': getCsrfToken(),
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()

      if (result.success && result.data) {
        // Si hay configuraciones existentes, las agregamos a la lista
        setExistingConfigs(Array.isArray(result.data) ? result.data : [result.data])
      } else {
        setExistingConfigs([])
      }
    } catch (error) {
      console.error('Error al cargar configuraciones:', error)
      setExistingConfigs([])
    } finally {
      setIsLoadingConfigs(false)
    }
  }


  const handleSmtpConfigChange = (field: string, value: string) => {
    setSmtpConfig(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Si estamos editando una configuración existente y se modifica un campo,
    // cambiar el provider a 'custom' para indicar que es una nueva configuración
    if (isEditingExisting && originalConfig) {
      const hasChanged = (
        (field === 'host' && value !== originalConfig.host) ||
        (field === 'port' && value !== originalConfig.port) ||
        (field === 'username' && value !== originalConfig.user) ||
        (field === 'fromEmail' && value !== originalConfig.fromEmail) ||
        (field === 'encryption' && value !== originalConfig.protocole)
      )
      
      if (hasChanged) {
        setSmtpConfig(prev => ({
          ...prev,
          provider: 'custom' // Cambiar a configuración personalizada
        }))
        setIsEditingExisting(false) // Ya no estamos editando la configuración original
      }
    }
  }

  const handleProviderChange = (provider: string) => {
    // Si es una configuración existente (formato: "existing_${id}")
    if (provider.startsWith('existing_')) {
      const configId = provider.replace('existing_', '')
      const existingConfig = existingConfigs.find(config => config.id.toString() === configId)
      
      if (existingConfig) {
        // Guardar la configuración original para comparar cambios
        setOriginalConfig(existingConfig)
        setIsEditingExisting(true)
        
        setSmtpConfig(prev => ({
          ...prev,
          provider: provider,
          host: existingConfig.host || '',
          port: existingConfig.port || '587',
          username: existingConfig.user || '',
          password: '', // Limpiar contraseña para que el usuario la ingrese
          fromEmail: existingConfig.fromEmail || '',
          encryption: existingConfig.protocole || 'tls'
        }))
      }
    } else {
      // Configuraciones predefinidas
      const providerConfigs = {
        'gmail': {
          host: 'smtp.gmail.com',
          port: '587',
          encryption: 'tls'
        },
        'outlook': {
          host: 'smtp-mail.outlook.com',
          port: '587',
          encryption: 'tls'
        },
        'yahoo': {
          host: 'smtp.mail.yahoo.com',
          port: '587',
          encryption: 'tls'
        },
        'custom': {
          host: '',
          port: '587',
          encryption: 'tls'
        }
      }

      const config = providerConfigs[provider as keyof typeof providerConfigs]
      if (config) {
        // Resetear estado de edición para nueva configuración
        setIsEditingExisting(false)
        setOriginalConfig(null)
        
        setSmtpConfig(prev => ({
          ...prev,
          provider: provider,
          host: config.host,
          port: config.port,
          encryption: config.encryption,
          username: '', // Limpiar usuario para nueva configuración
          password: '', // Limpiar contraseña para nueva configuración
          fromEmail: '' // Limpiar email remitente para nueva configuración
        }))
      }
    }
    // Cerrar el dropdown después de seleccionar
    setIsDropdownOpen(false)
  }

  const handleEmailDataChange = (field: string, value: string) => {
    setEmailData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Función para manejar eliminación de configuración
  const handleDeleteConfig = (config: any) => {
    setConfigToDelete(config)
    setShowDeleteDialog(true)
    // Cerrar el dropdown cuando se abre el diálogo
    setIsDropdownOpen(false)
    setSmtpConfig(prev => ({ ...prev, provider: '' }))
  }

  // Función para confirmar eliminación
  const confirmDelete = async () => {
    if (!configToDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/smtp-config/${configToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-TOKEN': getCsrfToken(),
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()

      if (result.success) {
        showSuccess(" Configuración Eliminada", `La configuración ${configToDelete.host} ha sido eliminada correctamente`, 4000)
        // Recargar configuraciones después de eliminar
        loadExistingConfigs()
      } else {
        showError(" Error al Eliminar", result.message || "No se pudo eliminar la configuración")
      }
    } catch (error) {
      console.error('Error al eliminar configuración:', error)
      showError("🔌 Error de Conexión", "No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.")
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
      setConfigToDelete(null)
    }
  }

  // Función para cancelar eliminación
  const cancelDelete = () => {
    setShowDeleteDialog(false)
    setConfigToDelete(null)
  }

  const handleSaveSmtpConfig = async () => {
    if (!smtpConfig.host || !smtpConfig.username) {
      showError(" Campos Requeridos", "Por favor completa el servidor SMTP, usuario y contraseña")
      return
    }

    // Si estamos editando una configuración existente, requerir contraseña
    if (isEditingExisting && !smtpConfig.password) {
      showError(" Contraseña Requerida", "Por favor ingresa la contraseña para crear una nueva configuración")
      return
    }

    // Preparar datos para envío
    const configToSend: any = { ...smtpConfig }

    // Si estamos editando una configuración existente, siempre crear una nueva
    // Esto se detecta cuando el provider cambió a 'custom' después de modificar campos
    if (smtpConfig.provider === 'custom' && originalConfig) {
      // Limpiar el provider para que se trate como nueva configuración
      delete configToSend.provider
    }

    setIsSavingConfig(true)
    try {
      const response = await fetch('/smtp-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
          'Accept': 'application/json'
        },
        body: JSON.stringify(configToSend)
      })

      const result = await response.json()

      if (result.success) {
        if (result.isDuplicate) {
          showWarning(" Configuración Existente", result.message || "Ya tienes esta configuración SMTP guardada", 4000)
        } else {
          // Determinar el mensaje según si se creó una nueva configuración o se actualizó
          const message = (smtpConfig.provider === 'custom' && originalConfig) 
            ? "Nueva configuración SMTP creada basada en la configuración existente"
            : "Tu servidor SMTP se ha configurado correctamente y está listo para enviar correos"
          
          showSuccess(" Configuración Guardada", message, 5000)
          // Recargar configuraciones después de guardar
          loadExistingConfigs()
          
          // Resetear estados después de guardar
          setIsEditingExisting(false)
          setOriginalConfig(null)
        }
      } else {
        showError(" Error al Guardar", result.message || "No se pudo guardar la configuración SMTP")
      }
    } catch (error) {
      console.error('Error al guardar configuración:', error)
      showError("🔌 Error de Conexión", "No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.")
    } finally {
      setIsSavingConfig(false)
    }
  }

  const handleSendTestEmail = async () => {
    if (!emailData.to || !emailData.subject || !emailData.message) {
      showError(" Campos Incompletos", "Por favor completa el destinatario, asunto y mensaje del correo")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/send-mail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
          'Accept': 'application/json'
        },
        body: JSON.stringify(emailData)
      })

      const result = await response.json()

      if (result.success) {
        showSuccess(" Correo Enviado", `Tu correo de prueba se ha enviado exitosamente a ${emailData.to}`, 6000)
        // Limpiar formulario
        setEmailData({ to: '', subject: '', message: '' })
      } else {
        showError(" Error al Enviar", result.message || "No se pudo enviar el correo de prueba")
      }
    } catch (error) {
      console.error('Error al enviar correo:', error)
      showError("Error de Envío", "No se pudo enviar el correo. Verifica tu configuración SMTP e inténtalo de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Head title="Dominios / SMTP" />
      
      <AppSidebar user={user} pageTitle="Dominios / SMTP">
        <div className="min-h-screen bg-gray-50 p-6">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <Globe className="h-8 w-8 text-orange-500" />
                <h1 className="text-3xl font-bold text-gray-900">Dominios / SMTP</h1>
              </div>
              <p className="text-gray-600">Configura tus servidores SMTP y envía correos de prueba</p>
            </div>

            <Tabs defaultValue="config" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="config" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Configuración SMTP
                </TabsTrigger>
                <TabsTrigger value="test" className="flex items-center gap-2">
                  <TestTube className="h-4 w-4" />
                  Enviar Correo de Prueba
                </TabsTrigger>
              </TabsList>

              <TabsContent value="config" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Configuración del Servidor SMTP
                    </CardTitle>
                    <CardDescription>
                      Configura los parámetros de tu servidor SMTP para el envío de correos
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="provider">
                        Configuraciones {existingConfigs.length > 0 && `(${existingConfigs.length})`}
                      </Label>
                      <Select 
                        value={smtpConfig.provider} 
                        onValueChange={handleProviderChange} 
                        disabled={isLoadingConfigs}
                        open={isDropdownOpen}
                        onOpenChange={setIsDropdownOpen}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingConfigs ? "Cargando configuraciones..." : "Selecciona tu configuracion de servidor"} />
                        </SelectTrigger>
                        <SelectContent>
                          {/* Configuraciones existentes */}
                          {existingConfigs.map((config, index) => (
                            <div key={`existing_${config.id}`} className="relative">
                              <SelectItem value={`existing_${config.id}`}>
                                <div className="flex flex-col text-left w-full">
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium text-left">{config.host}</span>
                                  </div>
                                  <span className="text-xs text-gray-500 text-left">
                                    {config.user} • Puerto {config.port} • #{existingConfigs.length - index} • {formatDateTime(config.createdAt)}
                                  </span>
                                </div>
                              </SelectItem>
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleDeleteConfig(config)
                                }}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-md transition-colors flex items-center justify-center z-10"
                                title="Eliminar configuración"
                                type="button"
                              >
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                          ))}
                          
                          {/* Separador si hay configuraciones existentes */}
                          {existingConfigs.length > 0 && (
                            <div className="border-t border-gray-200 my-1"></div>
                          )}
                          <SelectItem value="custom">Configuración Personalizada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="host">Servidor SMTP</Label>
                        <Input
                          id="host"
                          placeholder="smtp.gmail.com"
                          value={smtpConfig.host}
                          onChange={(e) => handleSmtpConfigChange('host', e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="port">Puerto</Label>
                        <Select value={smtpConfig.port} onValueChange={(value: string) => handleSmtpConfigChange('port', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona el puerto" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="587">587 - TLS (Recomendado)</SelectItem>
                            <SelectItem value="465">465 - SSL</SelectItem>
                            <SelectItem value="25">25 - Sin cifrado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Usuario</Label>
                        <Input
                          id="username"
                          placeholder="tu-email@gmail.com"
                          value={smtpConfig.username}
                          onChange={(e) => handleSmtpConfigChange('username', e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="password">Contraseña</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder={isEditingExisting ? "Ingresa la contraseña para crear nueva configuración" : "Tu contraseña"}
                          value={smtpConfig.password}
                          onChange={(e) => handleSmtpConfigChange('password', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fromEmail">Email Remitente</Label>
                      <Input
                        id="fromEmail"
                        placeholder="noreply@tudominio.com"
                        value={smtpConfig.fromEmail}
                        onChange={(e) => handleSmtpConfigChange('fromEmail', e.target.value)}
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button 
                        onClick={handleSaveSmtpConfig}
                        disabled={isSavingConfig}
                        className="bg-orange-500 hover:bg-orange-600"
                      >
                        {isSavingConfig ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Guardando...
                          </>
                        ) : (
                          <>
                            <Settings className="h-4 w-4 mr-2" />
                            Guardar Configuración
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="test" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Enviar Correo de Prueba
                    </CardTitle>
                    <CardDescription>
                      Envía un correo de prueba usando la plantilla configurada
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="to">Destinatario</Label>
                      <Input
                        id="to"
                        placeholder="destinatario@ejemplo.com"
                        value={emailData.to}
                        onChange={(e) => handleEmailDataChange('to', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">Asunto</Label>
                      <Input
                        id="subject"
                        placeholder="Asunto del correo"
                        value={emailData.subject}
                        onChange={(e) => handleEmailDataChange('subject', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Mensaje</Label>
                      <Textarea
                        id="message"
                        placeholder="Escribe tu mensaje aquí..."
                        rows={6}
                        value={emailData.message}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleEmailDataChange('message', e.target.value)}
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button 
                        onClick={handleSendTestEmail}
                        disabled={isLoading}
                        className="bg-orange-500 hover:bg-orange-600"
                      >
                        {isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Enviar Correo
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </AppSidebar>
      
      {/* Toast Container para mensajes temporales */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      {/* Diálogo de confirmación para eliminar configuración */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-red-500 text-2xl">⚠️</div>
              <h3 className="text-lg font-semibold text-gray-900">
                Confirmar Eliminación
              </h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              ¿Estás seguro de que quieres eliminar la configuración <strong>{configToDelete?.host}</strong>?
              <br />
              <span className="text-sm text-gray-500">
                Esta acción no se puede deshacer.
              </span>
            </p>
            
            <div className="flex gap-3 justify-end">
              <Button
                onClick={cancelDelete}
                variant="outline"
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Eliminando...
                  </>
                ) : (
                  'Eliminar'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
