import { Head } from '@inertiajs/react'
import AppSidebar from '~/components/AppSidebar'
import { Globe, Mail, Send, Settings, TestTube, Edit, RefreshCw, Plus, Trash2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Dialog } from '~/components/ui/dialog'
import { useToast } from '~/hooks/useToast'
import ToastContainer from '~/components/ui/toast-container'
import { validateEmail } from '~/lib/validations'

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

  // Estados para configuraciones existentes
  const [existingConfigs, setExistingConfigs] = useState<any[]>([])
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(false)
  
  // Estados para eliminación
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [configToDelete, setConfigToDelete] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Estados para activación
  const [isActivating, setIsActivating] = useState(false)

  // Estados para modal de edición
  const [showEditModal, setShowEditModal] = useState(false)
  const [configToEdit, setConfigToEdit] = useState<any>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [editFormData, setEditFormData] = useState({
    name: '',
    host: '',
    port: '587',
    username: '',
    password: '',
    fromEmail: '',
    encryption: 'tls'
  })

  // Estados para modal de creación
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createFormData, setCreateFormData] = useState({
    name: '',
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


  // Función para seleccionar una configuración existente (solo para mostrar detalles)
  const handleSelectConfig = (_config: any) => {
    // Esta función ahora solo se usa para mostrar detalles, no para editar
    // La edición se hace a través del modal
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

  // Función para activar una configuración SMTP
  const handleActivateConfig = async (config: any) => {
    if (config.isActive) {
      showWarning(" Ya Activa", `La configuración ${config.host} ya está activa`)
      return
    }

    setIsActivating(true)
    try {
      const response = await fetch(`/smtp-config/${config.id}/activate`, {
        method: 'PUT',
        headers: {
          'X-CSRF-TOKEN': getCsrfToken(),
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()

      if (result.success) {
        showSuccess(" Configuración Activada", `Ahora estás usando la configuración ${config.host} (${config.user})`, 4000)
        // Recargar configuraciones después de activar
        loadExistingConfigs()
      } else {
        showError(" Error al Activar", result.message || "No se pudo activar la configuración")
      }
    } catch (error) {
      console.error('Error al activar configuración:', error)
      showError("🔌 Error de Conexión", "No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.")
    } finally {
      setIsActivating(false)
    }
  }

  // Función para abrir el modal de edición
  const handleOpenEditModal = (config: any) => {
    setConfigToEdit(config)
    setEditFormData({
      name: config.name || '',
      host: config.host || '',
      port: config.port || '587',
      username: config.user || '',
      password: '', // No prellenar la contraseña por seguridad
      fromEmail: config.fromEmail || '',
      encryption: config.protocole || 'tls'
    })
    setShowEditModal(true)
  }

  // Función para cerrar el modal de edición
  const handleCloseEditModal = () => {
    setShowEditModal(false)
    setConfigToEdit(null)
    setEditFormData({
      name: '',
      host: '',
      port: '587',
      username: '',
      password: '',
      fromEmail: '',
      encryption: 'tls'
    })
  }

  // Función para actualizar el formulario de edición
  const handleEditFormChange = (field: string, value: string) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Función para actualizar el formulario de creación
  const handleCreateFormChange = (field: string, value: string) => {
    setCreateFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Función para cerrar el modal de creación
  const handleCloseCreateModal = () => {
    setShowCreateModal(false)
    setCreateFormData({
      name: '',
      host: '',
      port: '587',
      username: '',
      password: '',
      fromEmail: '',
      encryption: 'tls'
    })
  }

  // Función para guardar nueva configuración
  const handleCreateConfig = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!createFormData.host || !createFormData.username || !createFormData.password) {
      showError(" Campos Requeridos", "Por favor completa el servidor SMTP, usuario y contraseña")
      return
    }

    // Validación de formato de email remitente
    if (createFormData.fromEmail && !validateEmail(createFormData.fromEmail).isValid) {
      showError('Correo inválido', 'El correo tiene un mal formato')
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch('/smtp-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          host: createFormData.host,
          port: createFormData.port,
          username: createFormData.username,
          password: createFormData.password,
          fromEmail: createFormData.fromEmail,
          name: createFormData.name
        })
      })

      const result = await response.json()

      if (result.success) {
        if (result.isDuplicate) {
          showWarning(" Configuración Existente", result.message || "Ya tienes esta configuración SMTP guardada", 4000)
        } else {
          showSuccess(" Configuración Creada", "Tu servidor SMTP se ha configurado correctamente y está listo para enviar correos", 5000)
          // Recargar configuraciones después de guardar
          loadExistingConfigs()
          // Cerrar el modal
          handleCloseCreateModal()
        }
      } else {
        showError(" Error al Guardar", result.message || "No se pudo guardar la configuración SMTP")
      }
    } catch (error) {
      console.error('Error al guardar configuración:', error)
      showError("🔌 Error de Conexión", "No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.")
    } finally {
      setIsCreating(false)
    }
  }

  // Función para guardar los cambios de edición
  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!configToEdit) return

    if (!editFormData.host || !editFormData.username) {
      showError(" Campos Requeridos", "Por favor completa el servidor SMTP y usuario")
      return
    }

    // Validar que se proporcione la contraseña
    if (!editFormData.password || editFormData.password.trim() === '') {
      showError(" Contraseña Requerida", "Por favor ingresa la contraseña para verificar la actualización")
      return
    }

    // Validación de formato de email remitente
    if (editFormData.fromEmail && !validateEmail(editFormData.fromEmail).isValid) {
      showError('Correo inválido', 'El correo tiene un mal formato')
      return
    }

    setIsUpdating(true)
    try {
      const response = await fetch(`/smtp-config/${configToEdit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          id: configToEdit.id, // Incluir el ID en el body para mayor seguridad
          host: editFormData.host,
          port: editFormData.port,
          username: editFormData.username,
          password: editFormData.password, // Contraseña requerida para validar
          fromEmail: editFormData.fromEmail,
          name: editFormData.name
        })
      })

      const result = await response.json()

      if (result.success) {
        showSuccess(" Configuración Actualizada", "La configuración SMTP se ha actualizado correctamente", 4000)
        // Recargar configuraciones después de actualizar
        loadExistingConfigs()
        // Cerrar el modal
        handleCloseEditModal()
      } else {
        showError(" Error al Actualizar", result.message || "No se pudo actualizar la configuración SMTP")
      }
    } catch (error) {
      console.error('Error al actualizar configuración:', error)
      showError("🔌 Error de Conexión", "No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.")
    } finally {
      setIsUpdating(false)
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
                      <div className="flex items-center justify-between">
                        <Label>
                          Configuraciones {existingConfigs.length > 0 && `(${existingConfigs.length})`}
                        </Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCreateFormData({
                              name: '',
                              host: '',
                              port: '587',
                              username: '',
                              password: '',
                              fromEmail: '',
                              encryption: 'tls'
                            })
                            setShowCreateModal(true)
                          }}
                          className="flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Nueva Configuración
                        </Button>
                      </div>
                      
                      {isLoadingConfigs ? (
                        <div className="text-center py-8 text-gray-500">Cargando configuraciones...</div>
                      ) : existingConfigs.length === 0 ? (
                        <Card className="border-2 border-dashed">
                          <CardContent className="py-12 text-center">
                            <Settings className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 font-medium">No hay configuraciones guardadas aún</p>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="max-h-[600px] overflow-y-auto pr-2 space-y-4 border border-gray-200 rounded-lg p-4 custom-scrollbar">
                          {existingConfigs.map((config, index) => (
                            <Card 
                              key={config.id} 
                              className="hover:shadow-lg transition-all cursor-pointer"
                              onClick={() => handleSelectConfig(config)}
                            >
                              <CardHeader>
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      {/* Botón de activación (checkmark verde) */}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleActivateConfig(config)
                                        }}
                                        disabled={isActivating}
                                        className={`p-1 rounded-md transition-colors flex items-center justify-center ${
                                          config.isActive 
                                            ? 'bg-green-500 hover:bg-green-600 text-white' 
                                            : 'bg-gray-200 hover:bg-green-500 hover:text-white text-gray-500'
                                        }`}
                                        title={config.isActive ? "Configuración activa" : "Activar configuración"}
                                      >
                                        {isActivating ? (
                                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                                        ) : (
                                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                          </svg>
                                        )}
                                      </Button>
                                      <CardTitle className="text-lg">
                                        {config.name || `config-${existingConfigs.length - index}`}
                                      </CardTitle>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        {config.host}
                                      </span>
                                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                        Puerto: {config.port}
                                      </span>
                                      {config.isActive && (
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                          Activa
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-500 mt-2">
                                      {config.user} • #{existingConfigs.length - index} • {formatDateTime(config.createdAt)}
                                    </p>
                                  </div>
                                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleOpenEditModal(config)}
                                      title="Editar configuración"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteConfig(config)}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      title="Eliminar configuración"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </CardHeader>
                            </Card>
                          ))}
                        </div>
                      )}
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

      {/* Modal de edición de configuración SMTP */}
      <Dialog
        open={showEditModal}
        onOpenChange={(open) => {
          if (!open && !isUpdating) {
            handleCloseEditModal()
          } else {
            setShowEditModal(open)
          }
        }}
        title="Editar Configuración SMTP"
        maxWidth="2xl"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleCloseEditModal()
              }}
              disabled={isUpdating}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                // Obtener el formulario y hacer submit
                const form = document.getElementById('smtp-config-edit-form') as HTMLFormElement
                if (form) {
                  form.requestSubmit()
                } else {
                  // Si no encuentra el formulario, llamar directamente a la función
                  handleUpdateConfig(e as any)
                }
              }}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Actualizar Configuración'
              )}
            </Button>
          </>
        }
      >
        <form id="smtp-config-edit-form" onSubmit={handleUpdateConfig} className="space-y-4">
          {/* Información de la configuración que se está editando */}
          {configToEdit && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-900">Editando Configuración:</span>
              </div>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>ID:</strong> {configToEdit.id}</p>
                <p><strong>Nombre:</strong> {configToEdit.name || `config-${configToEdit.id}`}</p>
                <p><strong>Host:</strong> {configToEdit.host}</p>
                <p><strong>Usuario:</strong> {configToEdit.user}</p>
                <p><strong>Puerto:</strong> {configToEdit.port}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-name">Nombre del Dominio</Label>
              <Input
                id="edit-name"
                type="text"
                placeholder="Ej: Gmail Personal, Outlook Empresa, etc."
                value={editFormData.name}
                onChange={(e) => handleEditFormChange('name', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="edit-port">Puerto</Label>
              <Select 
                value={editFormData.port} 
                onValueChange={(value: string) => {
                  handleEditFormChange('port', value)
                  // Actualizar el protocolo según el puerto
                  const protocolMap: Record<string, string> = {
                    '587': 'tls',
                    '465': 'ssl',
                    '25': 'insecure'
                  }
                  handleEditFormChange('encryption', protocolMap[value] || 'tls')
                }}
              >
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
            <div>
              <Label htmlFor="edit-host">Servidor SMTP *</Label>
              <Input
                id="edit-host"
                type="text"
                placeholder="smtp.gmail.com"
                value={editFormData.host}
                onChange={(e) => handleEditFormChange('host', e.target.value)}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="edit-username">Usuario *</Label>
              <Input
                id="edit-username"
                type="text"
                placeholder="tu-email@gmail.com"
                value={editFormData.username}
                onChange={(e) => handleEditFormChange('username', e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="edit-password">Contraseña *</Label>
            <Input
              id="edit-password"
              type="password"
              placeholder="Ingresa la contraseña actual para verificar"
              value={editFormData.password}
              onChange={(e) => handleEditFormChange('password', e.target.value)}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              La contraseña es requerida para verificar que eres el propietario de esta configuración
            </p>
          </div>

          <div>
            <Label htmlFor="edit-fromEmail">Email Remitente</Label>
            <Input
              id="edit-fromEmail"
              type="email"
              placeholder="noreply@tudominio.com"
              value={editFormData.fromEmail}
              onChange={(e) => handleEditFormChange('fromEmail', e.target.value)}
            />
          </div>
        </form>
      </Dialog>

      {/* Modal de creación de configuración SMTP */}
      <Dialog
        open={showCreateModal}
        onOpenChange={(open) => {
          if (!open && !isCreating) {
            handleCloseCreateModal()
          } else {
            setShowCreateModal(open)
          }
        }}
        title="Nueva Configuración SMTP"
        maxWidth="2xl"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseCreateModal}
              disabled={isCreating}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                // Obtener el formulario y hacer submit
                const form = document.getElementById('smtp-config-create-form') as HTMLFormElement
                if (form) {
                  form.requestSubmit()
                } else {
                  // Si no encuentra el formulario, llamar directamente a la función
                  handleCreateConfig(e as any)
                }
              }}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Crear Configuración'
              )}
            </Button>
          </>
        }
      >
        <form id="smtp-config-create-form" onSubmit={handleCreateConfig} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="create-name">Nombre del Dominio</Label>
              <Input
                id="create-name"
                type="text"
                placeholder="Ej: Gmail Personal, Outlook Empresa, etc."
                value={createFormData.name}
                onChange={(e) => handleCreateFormChange('name', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="create-port">Puerto</Label>
              <Select 
                value={createFormData.port} 
                onValueChange={(value: string) => {
                  handleCreateFormChange('port', value)
                  // Actualizar el protocolo según el puerto
                  const protocolMap: Record<string, string> = {
                    '587': 'tls',
                    '465': 'ssl',
                    '25': 'insecure'
                  }
                  handleCreateFormChange('encryption', protocolMap[value] || 'tls')
                }}
              >
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
            <div>
              <Label htmlFor="create-host">Servidor SMTP *</Label>
              <Input
                id="create-host"
                type="text"
                placeholder="smtp.gmail.com"
                value={createFormData.host}
                onChange={(e) => handleCreateFormChange('host', e.target.value)}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="create-username">Usuario *</Label>
              <Input
                id="create-username"
                type="text"
                placeholder="tu-email@gmail.com"
                value={createFormData.username}
                onChange={(e) => handleCreateFormChange('username', e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="create-password">Contraseña *</Label>
            <Input
              id="create-password"
              type="password"
              placeholder="Tu contraseña"
              value={createFormData.password}
              onChange={(e) => handleCreateFormChange('password', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="create-fromEmail">Email Remitente</Label>
            <Input
              id="create-fromEmail"
              type="email"
              placeholder="noreply@tudominio.com"
              value={createFormData.fromEmail}
              onChange={(e) => handleCreateFormChange('fromEmail', e.target.value)}
            />
          </div>
        </form>
      </Dialog>
    </>
  )
}
