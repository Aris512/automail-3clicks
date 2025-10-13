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
  const { toasts, showSuccess, showError, removeToast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isSavingConfig, setIsSavingConfig] = useState(false)
  
  // Estados para configuración SMTP
  const [smtpConfig, setSmtpConfig] = useState({
    host: '',
    port: '587',
    username: '',
    password: '',
    fromEmail: '',
    encryption: 'tls'
  })

  // Estados para envío de correo
  const [emailData, setEmailData] = useState({
    to: '',
    subject: '',
    message: ''
  })

  // Cargar configuración SMTP existente al montar el componente
  useEffect(() => {
    loadSmtpConfig()
  }, [])

  // Función helper para obtener el token CSRF
  const getCsrfToken = () => {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
  }

  const loadSmtpConfig = async () => {
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
        setSmtpConfig({
          host: result.data.host || '',
          port: result.data.port || '587',
          username: result.data.user || '',
          password: '••••••••', // Indicar que hay contraseña guardada
          fromEmail: result.data.fromEmail || '',
          encryption: result.data.protocole || 'tls'
        })
      }
    } catch (error) {
      console.error('Error al cargar configuración SMTP:', error)
    }
  }

  const handleSmtpConfigChange = (field: string, value: string) => {
    setSmtpConfig(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleEmailDataChange = (field: string, value: string) => {
    setEmailData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSaveSmtpConfig = async () => {
    if (!smtpConfig.host || !smtpConfig.username) {
      showError(" Campos Requeridos", "Por favor completa el servidor SMTP, usuario y contraseña")
      return
    }

    // Si la contraseña es el placeholder, no la incluimos en el envío
    const configToSend: any = { ...smtpConfig }
    if (configToSend.password === '••••••••') {
      delete configToSend.password
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
        showSuccess(" Configuración Guardada", "Tu servidor SMTP se ha configurado correctamente y está listo para enviar correos", 5000)
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
                          placeholder="Tu contraseña"
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
    </>
  )
}
