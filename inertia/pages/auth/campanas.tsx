import { Head } from '@inertiajs/react'
import AppSidebar from '~/components/AppSidebar'
import { Megaphone, Plus, Edit, Trash2, RefreshCw, Search, Play, Square, Check } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useToast } from '~/hooks/useToast'
import ToastContainer from '~/components/ui/toast-container'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { AlertDialog } from '~/components/ui/alert-dialog'

interface User {
  id: number
  fullName: string
  email: string
}

interface Campaign {
  id: number
  name: string
  description?: string
  status: 'active' | 'paused' | 'completed'
  createdAt: string
  updatedAt: string
  userId: number
  tenantId: number
  emailSetupId?: number | null
  campaignStages?: any[]
  user?: {
    id: number
    fullName: string
    email: string
  }
}

interface EmailSetup {
  id: number
  email: string
  name: string | null
  from: string | null
  active: boolean
  tenantId: number
  userId: number
}

interface CampanasProps {
  user: User
}

export default function Campanas({ user }: CampanasProps) {
  const { toasts, showSuccess, showError, removeToast } = useToast()
  
  // Estados principales
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [emailSetups, setEmailSetups] = useState<EmailSetup[]>([])
  const [loadingEmailSetups, setLoadingEmailSetups] = useState(false)
  
  // Estados del formulario
  const [showForm, setShowForm] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active' as 'active' | 'paused' | 'completed',
    emailSetupId: null as number | null
  })
  const [isSaving, setIsSaving] = useState(false)
  
  // Estados para confirmación de eliminación
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null)

  // Función helper para obtener el token CSRF
  const getCsrfToken = () => {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
  }

  // Cargar campañas
  const loadCampaigns = async () => {
    setLoading(true)
    try {
      const response = await fetch('/campaigns', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        credentials: 'include'
      })

      const result = await response.json()

      if (result.success) {
        setCampaigns(result.data || [])
      } else {
        showError('Error al cargar', result.message || 'No se pudieron cargar las campañas')
      }
    } catch (error) {
      console.error('Error al cargar campañas:', error)
      showError('Error de conexión', 'No se pudo conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  // Cargar email setups
  const loadEmailSetups = async () => {
    setLoadingEmailSetups(true)
    try {
      const response = await fetch('/email-setups', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        credentials: 'include'
      })

      const result = await response.json()

      if (result.success) {
        setEmailSetups(result.data || [])
      } else {
        console.error('Error al cargar email setups:', result.message)
      }
    } catch (error) {
      console.error('Error al cargar email setups:', error)
    } finally {
      setLoadingEmailSetups(false)
    }
  }

  // Cargar campañas al montar el componente
  useEffect(() => {
    loadCampaigns()
    loadEmailSetups()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      status: 'active',
      emailSetupId: null
    })
    setEditingCampaign(null)
  }

  // Abrir/cerrar formulario para crear
  const handleCreate = () => {
    try {
      if (showForm) {
        // Si el formulario está abierto, cerrarlo
        handleCloseForm()
      } else {
        // Si el formulario está cerrado, abrirlo
        resetForm()
        setShowForm(true)
      }
    } catch (error) {
      console.error('Error en handleCreate:', error)
      showError('Error', 'No se pudo abrir el formulario')
    }
  }

  // Abrir formulario para editar
  const handleEdit = (campaign: Campaign) => {
    try {
      setEditingCampaign(campaign)
      setFormData({
        name: campaign.name || '',
        description: campaign.description || '',
        status: campaign.status || 'active',
        emailSetupId: campaign.emailSetupId || null
      })
      setShowForm(true)
    } catch (error) {
      console.error('Error al abrir formulario de edición:', error)
      showError('Error', 'No se pudo abrir el formulario de edición')
    }
  }

  // Cerrar formulario
  const handleCloseForm = () => {
    setShowForm(false)
    resetForm()
  }

  // Guardar campaña
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      showError('Campo requerido', 'El nombre de la campaña es obligatorio')
      return
    }

    setIsSaving(true)

    try {
      const url = editingCampaign ? `/campaigns/${editingCampaign.id}` : '/campaigns'
      const method = editingCampaign ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          status: formData.status,
          emailSetupId: formData.emailSetupId || null
        })
      })

      const result = await response.json()

      if (result.success) {
        showSuccess(
          editingCampaign ? 'Campaña actualizada' : 'Campaña creada',
          editingCampaign 
            ? 'La campaña se ha actualizado correctamente' 
            : 'La campaña se ha creado exitosamente',
          3000
        )
        handleCloseForm()
        loadCampaigns()
      } else {
        showError('Error al guardar', result.message || 'No se pudo guardar la campaña')
      }
    } catch (error) {
      console.error('Error al guardar campaña:', error)
      showError('Error de conexión', 'No se pudo conectar con el servidor')
    } finally {
      setIsSaving(false)
    }
  }

  // Cambiar estado de la campaña
  const handleStatusChange = async (campaign: Campaign, newStatus: 'active' | 'paused' | 'completed') => {
    if (campaign.status === newStatus) {
      return // No hacer nada si el estado es el mismo
    }

    try {
      const response = await fetch(`/campaigns/${campaign.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify({
          name: campaign.name,
          description: campaign.description,
          status: newStatus,
          emailSetupId: campaign.emailSetupId
        })
      })

      const result = await response.json()

      if (result.success) {
        const statusMessages = {
          active: 'activada',
          paused: 'pausada',
          completed: 'marcada como completada'
        }
        showSuccess(
          'Estado actualizado',
          `La campaña ha sido ${statusMessages[newStatus]}`,
          3000
        )
        loadCampaigns()
      } else {
        showError('Error al actualizar', result.message || 'No se pudo actualizar el estado')
      }
    } catch (error) {
      console.error('Error al cambiar estado:', error)
      showError('Error de conexión', 'No se pudo conectar con el servidor')
    }
  }

  // Confirmar eliminación
  const handleDeleteClick = (campaign: Campaign) => {
    setCampaignToDelete(campaign)
    setShowDeleteDialog(true)
  }

  // Eliminar campaña
  const confirmDelete = async () => {
    if (!campaignToDelete) return

    try {
      const response = await fetch(`/campaigns/${campaignToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        credentials: 'include'
      })

      const result = await response.json()

      if (result.success) {
        showSuccess('Campaña eliminada', 'La campaña se ha eliminado correctamente', 3000)
        loadCampaigns()
      } else {
        showError('Error al eliminar', result.message || 'No se pudo eliminar la campaña')
      }
    } catch (error) {
      console.error('Error al eliminar campaña:', error)
      showError('Error de conexión', 'No se pudo conectar con el servidor')
    } finally {
      setShowDeleteDialog(false)
      setCampaignToDelete(null)
    }
  }

  // Filtrar campañas por término de búsqueda
  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (campaign.description && campaign.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Obtener color del badge según el estado
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Obtener texto del estado en español
  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Activa'
      case 'paused':
        return 'Pausada'
      case 'completed':
        return 'Completada'
      default:
        return status
    }
  }

  return (
    <>
      <Head title="Campañas" />
      
      <AppSidebar user={user} pageTitle="Campañas">
        <ToastContainer toasts={toasts} onClose={removeToast} />
        
        <div className="w-full px-12 py-6 space-y-8">

          {/* Header con botón de crear */}
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Campañas</h1>
              <p className="text-gray-600 mt-0.5 text-sm">Gestiona tus campañas de email marketing</p>
            </div>
            <Button 
              onClick={handleCreate} 
              variant={showForm ? "outline" : "default"}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {showForm ? 'Cancelar' : 'Nueva Campaña'}
            </Button>
          </div>

          {/* Formulario de Campaña */}
          {showForm && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>{editingCampaign ? 'Editar Campaña' : 'Nueva Campaña'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nombre de la Campaña *</Label>
                      <Input
                        id="name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ej: Campaña de Bienvenida"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="status">Estado</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value: 'active' | 'paused' | 'completed') =>
                          setFormData({ ...formData, status: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Activa</SelectItem>
                          <SelectItem value="paused">Pausada</SelectItem>
                          <SelectItem value="completed">Completada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="emailSetupId">Dominio (Email Setup)</Label>
                    {loadingEmailSetups ? (
                      <Input disabled placeholder="Cargando dominios..." />
                    ) : (
                      <Select
                        value={formData.emailSetupId ? String(formData.emailSetupId) : undefined}
                        onValueChange={(value) => {
                          const newValue = value ? parseInt(value, 10) : null
                          setFormData({ 
                            ...formData, 
                            emailSetupId: newValue
                          })
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un dominio (opcional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {emailSetups && Array.isArray(emailSetups) && emailSetups.length > 0 ? (
                            emailSetups.map((setup) => {
                              const displayName = setup.name || setup.email || 'Sin nombre'
                              const fromText = setup.from ? ` (${setup.from})` : ''
                              return (
                                <SelectItem key={setup.id} value={String(setup.id)}>
                                  {displayName}{fromText}
                                </SelectItem>
                              )
                            })
                          ) : (
                            <SelectItem value="no-domains" disabled>
                              No hay dominios disponibles
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                    {formData.emailSetupId && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mt-2"
                        onClick={() => setFormData({ ...formData, emailSetupId: null })}
                      >
                        Limpiar selección
                      </Button>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe el propósito de esta campaña..."
                      rows={4}
                    />
                  </div>

                  <div className="flex gap-3 justify-end pt-2 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCloseForm}
                      disabled={isSaving}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        editingCampaign ? 'Actualizar Campaña' : 'Guardar Campaña'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Barra de búsqueda y filtros */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Buscar campañas por nombre o descripción..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={loadCampaigns}
                  disabled={loading}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Actualizar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lista de campañas */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Campañas</h2>
            {loading ? (
              <div className="text-center py-12 text-gray-500">Cargando campañas...</div>
            ) : filteredCampaigns.length === 0 ? (
              <Card className="border-2 border-dashed">
                <CardContent className="py-12 text-center">
                  <Megaphone className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">
                    {searchTerm ? 'No se encontraron campañas' : 'No hay campañas creadas aún'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredCampaigns.map((campaign) => (
                  <Card key={campaign.id} className="hover:shadow-lg transition-all">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{campaign.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(campaign.status)}`}>
                              {getStatusText(campaign.status)}
                            </span>
                            <span className="text-sm text-gray-500">
                              {campaign.campaignStages?.length || 0} etapas
                            </span>
                          </div>
                          {campaign.description && (
                            <p className="text-sm text-gray-600 mt-2">{campaign.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          {/* Botones de estado */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusChange(campaign, 'active')}
                            disabled={campaign.status === 'active'}
                            className={campaign.status === 'active' ? 'text-green-600 hover:text-green-700 hover:bg-green-50' : 'hover:text-green-600'}
                            title="Activar campaña"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusChange(campaign, 'paused')}
                            disabled={campaign.status === 'paused'}
                            className={campaign.status === 'paused' ? 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50' : 'hover:text-yellow-600'}
                            title="Pausar campaña"
                          >
                            <Square className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusChange(campaign, 'completed')}
                            disabled={campaign.status === 'completed'}
                            className={campaign.status === 'completed' ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50' : 'hover:text-blue-600'}
                            title="Marcar como completada"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(campaign)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(campaign)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Eliminar
                          </Button>
                        </div>
          </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Diálogo de confirmación de eliminación */}
          <AlertDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
            title="¿Estás seguro?"
            description={
              <>
                Esta acción no se puede deshacer. Se eliminará permanentemente la campaña
                <strong> "{campaignToDelete?.name}"</strong> y todos sus datos asociados.
              </>
            }
            onConfirm={confirmDelete}
            onCancel={() => setShowDeleteDialog(false)}
            confirmText="Eliminar"
            cancelText="Cancelar"
            variant="destructive"
          />
        </div>
      </AppSidebar>
    </>
  )
}
