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
import { Dialog } from '~/components/ui/dialog'

interface User {
  id: number
  fullName: string
  email: string
}

interface CustomVariable {
  id?: number
  name: string
  description?: string
  valor?: string
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
  lists?: List[] | any[]
  customVariablesWithValues?: CustomVariable[]
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
  smtpConfig?: {
    id: number
    port: string
    isActive: boolean
    host: string
    name: string | null
  } | null
}

interface List {
  id: number
  name: string
  slug: string
  description?: string
  status: 'active' | 'inactive' | 'archived'
  tenantId: number
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
  const [lists, setLists] = useState<List[]>([])
  const [loadingLists, setLoadingLists] = useState(false)
  
  // Estados del formulario
  const [showForm, setShowForm] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active' as 'active' | 'paused' | 'completed',
    emailSetupId: null as number | null,
    listIds: [] as number[],
    customVariables: [] as CustomVariable[]
  })
  const [isSaving, setIsSaving] = useState(false)
  const [allCustomVariables, setAllCustomVariables] = useState<CustomVariable[]>([])
  const [editingVariableId, setEditingVariableId] = useState<number | null>(null)
  const [editingVariableData, setEditingVariableData] = useState({ name: '', valor: '' })
  const [showAddVariableDialog, setShowAddVariableDialog] = useState(false)
  const [showEditVariableDialog, setShowEditVariableDialog] = useState(false)
  const [newVariableForm, setNewVariableForm] = useState({ name: '', valor: '' })
  
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

  // Cargar todas las variables personalizadas existentes
  const loadAllCustomVariables = async (): Promise<CustomVariable[]> => {
    try {
      const response = await fetch('/campaigns/custom-variables/all', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        credentials: 'include'
      })

      const result = await response.json()

      if (result.success) {
        const variables = result.data || []
        setAllCustomVariables(variables)
        return variables
      } else {
        console.error('Error al cargar variables personalizadas:', result.message)
        return []
      }
    } catch (error) {
      console.error('Error al cargar variables personalizadas:', error)
      return []
    }
  }

  // Cargar variables personalizadas de una campaña específica
  const loadCampaignCustomVariables = async (campaignId: number): Promise<CustomVariable[]> => {
    try {
      const response = await fetch(`/campaigns/${campaignId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        credentials: 'include'
      })

      const result = await response.json()

      if (result.success && result.data?.customVariablesWithValues) {
        const variables = result.data.customVariablesWithValues || []
        setAllCustomVariables(variables)
        return variables
      } else {
        setAllCustomVariables([])
        return []
      }
    } catch (error) {
      console.error('Error al cargar variables personalizadas de la campaña:', error)
      setAllCustomVariables([])
      return []
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

  // Cargar listas
  const loadLists = async () => {
    setLoadingLists(true)
    try {
      const response = await fetch('/lists', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        credentials: 'include'
      })

      const result = await response.json()

      if (result.success) {
        setLists(result.data || [])
      } else {
        console.error('Error al cargar listas:', result.message)
      }
    } catch (error) {
      console.error('Error al cargar listas:', error)
    } finally {
      setLoadingLists(false)
    }
  }

  // Cargar campañas al montar el componente
  useEffect(() => {
    loadCampaigns()
    loadEmailSetups()
    loadLists()
    loadAllCustomVariables()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      status: 'active',
      emailSetupId: null,
      listIds: [],
      customVariables: []
    })
    setEditingCampaign(null)
    setNewVariableForm({ name: '', valor: '' })
    setShowAddVariableDialog(false)
    setEditingVariableId(null)
    setEditingVariableData({ name: '', valor: '' })
    setShowEditVariableDialog(false)
  }

  // Abrir modal para crear
  const handleCreate = async () => {
    try {
      resetForm()
      // Al crear una nueva campaña, no hay variables asociadas aún
      setAllCustomVariables([])
      setFormData(prev => ({
        ...prev,
        customVariables: []
      }))
      setShowForm(true)
    } catch (error) {
      console.error('Error en handleCreate:', error)
      showError('Error', 'No se pudo abrir el formulario')
    }
  }

  // Abrir formulario para editar
  const handleEdit = async (campaign: Campaign) => {
    try {
      setEditingCampaign(campaign)
      
      // Cargar las listas asociadas a la campaña
      let campaignListIds: number[] = []
      if (campaign.id) {
        try {
          const response = await fetch(`/campaigns/${campaign.id}/lists`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'X-CSRF-TOKEN': getCsrfToken(),
            },
            credentials: 'include'
          })

          const result = await response.json()
          if (result.success && result.data) {
            campaignListIds = result.data.map((cl: any) => cl.list?.id || cl.listId).filter((id: any) => id)
          }
        } catch (error) {
          console.error('Error al cargar listas de la campaña:', error)
          // Si la campaña tiene listas en el objeto, usarlas
          if (campaign.lists && Array.isArray(campaign.lists)) {
            campaignListIds = campaign.lists.map((list: any) => list.id || list)
          }
        }
      }

      // Cargar solo las variables asociadas a esta campaña
      let campaignVariablesWithValues: CustomVariable[] = []
      if (campaign.id) {
        await loadCampaignCustomVariables(campaign.id)
        try {
          const varResponse = await fetch(`/campaigns/${campaign.id}`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'X-CSRF-TOKEN': getCsrfToken(),
            },
            credentials: 'include'
          })
          const varResult = await varResponse.json()
          if (varResult.success && varResult.data?.customVariablesWithValues) {
            campaignVariablesWithValues = varResult.data.customVariablesWithValues
          }
        } catch (error) {
          console.error('Error al cargar variables personalizadas de la campaña:', error)
        }
      }

      // Usar solo las variables de la campaña con sus valores
      const combinedVariables = campaignVariablesWithValues.map(cv => ({
        id: cv.id,
        name: cv.name,
        description: cv.description || '',
        valor: cv.valor !== undefined && cv.valor !== null && cv.valor !== '' ? String(cv.valor) : ''
      }))

      setFormData({
        name: campaign.name || '',
        description: campaign.description || '',
        status: campaign.status || 'active',
        emailSetupId: campaign.emailSetupId || null,
        listIds: campaignListIds,
        customVariables: combinedVariables
      })
      setShowForm(true)
    } catch (error) {
      console.error('Error al abrir formulario de edición:', error)
      showError('Error', 'No se pudo abrir el formulario de edición')
    }
  }

  // Cerrar formulario/modal
  const handleCloseForm = () => {
    if (!isSaving) {
      setShowForm(false)
      resetForm()
    }
  }

  // Agregar variable personalizada
  const handleAddVariable = async () => {
    const trimmed = newVariableForm.name.trim()
    if (!trimmed) {
      showError('Campo requerido', 'El nombre de la variable es obligatorio')
      return
    }

    // Validar formato: solo letras, números y guiones bajos
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
      showError('Formato inválido', 'El nombre de la variable solo puede contener letras, números y guiones bajos, y debe empezar con letra o guión bajo')
      return
    }

    // Verificar que no exista en las variables existentes
    if (allCustomVariables.some(v => v.name === trimmed)) {
      showError('Variable duplicada', 'Esta variable ya existe. Usa una variable existente y agrega su valor.')
      return
    }

    // Verificar que no exista en el formulario actual
    if (formData.customVariables.some(v => v.name === trimmed)) {
      showError('Variable duplicada', 'Esta variable ya está en la lista')
      return
    }

    // Si estamos creando una nueva campaña, solo agregar al formulario sin guardar en el backend
    if (!editingCampaign) {
      const newVar = {
        id: Date.now(), // ID temporal para identificar la variable en el formulario
        name: trimmed,
        description: '',
        valor: newVariableForm.valor.trim() || ''
      }
      
      setAllCustomVariables(prev => [...prev, newVar])
      setFormData(prev => ({
        ...prev,
        customVariables: [...prev.customVariables, newVar]
      }))
      
      showSuccess('Variable agregada', 'La variable se ha agregado al formulario', 3000)
      setNewVariableForm({ name: '', valor: '' })
      setShowAddVariableDialog(false)
      return
    }

    // Si estamos editando una campaña, guardar en el backend
    try {
      const requestBody: any = {
        name: trimmed,
        description: '',
        campaignId: editingCampaign.id,
        valor: newVariableForm.valor.trim() || null
      }

      const response = await fetch('/campaigns/custom-variables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      })

      const result = await response.json()

      if (result.success) {
        showSuccess('Variable creada', 'La variable personalizada se ha creado exitosamente', 3000)
        await loadCampaignCustomVariables(editingCampaign.id)
        await handleEdit(editingCampaign)
        setNewVariableForm({ name: '', valor: '' })
        setShowAddVariableDialog(false)
      } else {
        showError('Error al crear', result.message || 'No se pudo crear la variable personalizada')
      }
    } catch (error) {
      console.error('Error al crear variable:', error)
      showError('Error de conexión', 'No se pudo conectar con el servidor')
    }
  }


  // Abrir modal de edición de variable
  const handleOpenEditVariable = (variable: CustomVariable) => {
    // Obtener el valor de la variable desde formData.customVariables
    // Si estamos editando una campaña, el valor viene de campaign_custom_variables
    // Si estamos creando una nueva campaña, el valor viene del formulario
    let valor = ''
    const campaignVar = formData.customVariables.find(v => v.id === variable.id)
    if (campaignVar) {
      // Asegurar que obtenemos el valor correcto, incluso si es una cadena vacía
      valor = campaignVar.valor !== undefined && campaignVar.valor !== null 
        ? String(campaignVar.valor) 
        : ''
    }
    
    setEditingVariableId(variable.id!)
    setEditingVariableData({
      name: variable.name,
      valor: valor
    })
    setShowEditVariableDialog(true)
  }

  // Guardar edición de variable personalizada
  const handleSaveVariableEdit = async () => {
    if (!editingVariableId) return
    
    if (!editingVariableData.name.trim()) {
      showError('Campo requerido', 'El nombre de la variable es obligatorio')
      return
    }

    // Si estamos creando una nueva campaña, solo actualizar el formulario
    if (!editingCampaign) {
      const updatedVariable = {
        id: editingVariableId,
        name: editingVariableData.name.trim(),
        description: '',
        valor: editingVariableData.valor.trim() || ''
      }
      
      setAllCustomVariables(prev => 
        prev.map(v => v.id === editingVariableId ? updatedVariable : v)
      )
      setFormData(prev => ({
        ...prev,
        customVariables: prev.customVariables.map(v => 
          v.id === editingVariableId ? updatedVariable : v
        )
      }))
      
      showSuccess('Éxito', 'Se editó correctamente la variable', 3000)
      setEditingVariableId(null)
      setEditingVariableData({ name: '', valor: '' })
      setShowEditVariableDialog(false)
      return
    }

    // Si estamos editando una campaña, actualizar en el backend
    try {
      const requestBody: any = {
        name: editingVariableData.name.trim(),
        campaignId: editingCampaign.id,
        // Enviar el valor siempre: si está vacío o es undefined, enviar null; si tiene contenido, enviar el string trimmeado
        valor: editingVariableData.valor && editingVariableData.valor.trim() 
          ? editingVariableData.valor.trim() 
          : null
      }

      const response = await fetch(`/campaigns/custom-variables/${editingVariableId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      })

      const result = await response.json()

      if (response.ok && result.success) {
        showSuccess('Éxito', 'Se editó correctamente la variable', 3000)
        setEditingVariableId(null)
        setEditingVariableData({ name: '', valor: '' })
        setShowEditVariableDialog(false)
        // Recargar las variables de la campaña
        await loadCampaignCustomVariables(editingCampaign.id)
        // Recargar el formulario de edición sin mostrar errores si algo falla
        try {
          await handleEdit(editingCampaign)
        } catch (error) {
          console.error('Error al recargar formulario después de actualizar variable:', error)
          // No mostrar error al usuario ya que la variable se actualizó correctamente
        }
      } else {
        showError('Error al actualizar', result.message || 'No se pudo actualizar la variable')
      }
    } catch (error) {
      console.error('Error al actualizar variable:', error)
      showError('Error de conexión', 'No se pudo conectar con el servidor')
    }
  }

  // Eliminar variable personalizada
  const handleDeleteVariable = async (variableId: number) => {
    // Si estamos creando una nueva campaña, solo eliminar del formulario
    if (!editingCampaign) {
      setAllCustomVariables(prev => prev.filter(v => v.id !== variableId))
      setFormData(prev => ({
        ...prev,
        customVariables: prev.customVariables.filter(v => v.id !== variableId)
      }))
      showSuccess('Variable eliminada', 'La variable se ha eliminado del formulario', 3000)
      return
    }

    // Si estamos editando una campaña, eliminar del backend
    try {
      const response = await fetch(`/campaigns/custom-variables/${variableId}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        credentials: 'include'
      })

      const result = await response.json()

      if (result.success) {
        showSuccess('Variable eliminada', 'La variable personalizada se ha eliminado correctamente', 3000)
        // Recargar las variables de la campaña
        await loadCampaignCustomVariables(editingCampaign.id)
        await handleEdit(editingCampaign)
      } else {
        showError('Error al eliminar', result.message || 'No se pudo eliminar la variable')
      }
    } catch (error) {
      console.error('Error al eliminar variable:', error)
      showError('Error de conexión', 'No se pudo conectar con el servidor')
    }
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

      const customVariablesToSend = formData.customVariables.map(v => ({
        name: v.name,
        description: v.description || '',
        valor: v.valor || ''
      }))

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
          emailSetupId: formData.emailSetupId || null,
          listIds: formData.listIds,
          customVariables: customVariablesToSend
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
              variant="default"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Nueva Campaña
            </Button>
          </div>

          {/* Modal de Campaña */}
          <Dialog
            open={showForm}
            onOpenChange={(open) => {
              if (!open && !isSaving) {
                handleCloseForm()
              } else {
                setShowForm(open)
              }
            }}
            title={editingCampaign ? 'Editar Campaña' : 'Nueva Campaña'}
            maxWidth="2xl"
            footer={
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseForm}
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  form="campaign-form"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    editingCampaign ? 'Actualizar Campaña' : 'Guardar Campaña'
                  )}
                </Button>
              </>
            }
          >
            <form id="campaign-form" onSubmit={handleSave} className="space-y-4">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          emailSetups
                            .filter(setup => setup.smtpConfig) // Solo mostrar configuraciones que tengan smtpConfig
                            .map((setup) => {
                              // Priorizar el nombre de la configuración SMTP, luego el nombre del email setup, y finalmente un fallback
                              const displayName = setup.smtpConfig?.name || setup.name || 'Configuración SMTP'
                              const emailText = setup.email || setup.from || ''
                              const portText = setup.smtpConfig?.port ? ` • Puerto ${setup.smtpConfig.port}` : ''
                              const isActive = setup.smtpConfig?.isActive || false
                              
                              return (
                                <SelectItem 
                                  key={setup.id} 
                                  value={String(setup.id)}
                                >
                                  <div className="flex items-center gap-2 w-full">
                                    {isActive && (
                                      <span className="inline-block w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span>
                                    )}
                                    <div className="flex flex-col text-left flex-1 min-w-0">
                                      <span className="font-medium text-sm text-gray-900">
                                        {displayName}
                                      </span>
                                      {(emailText || portText) && (
                                        <span className="text-xs text-gray-500 mt-0.5">
                                          {emailText && `(${emailText})`}{portText}
                                        </span>
                                      )}
                                    </div>
                                  </div>
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
                  <Label>Listas de Contactos</Label>
                  {loadingLists ? (
                    <Input disabled placeholder="Cargando listas..." />
                  ) : (
                    <div className="border rounded-md p-3 max-h-48 overflow-y-auto overflow-x-hidden bg-background">
                      {lists && Array.isArray(lists) && lists.length > 0 ? (
                        lists
                          .filter(list => list.status === 'active')
                          .map((list) => (
                            <div key={list.id} className="flex items-center space-x-2 py-1">
                              <input
                                type="checkbox"
                                id={`list-${list.id}`}
                                checked={formData.listIds.includes(list.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({
                                      ...formData,
                                      listIds: [...formData.listIds, list.id]
                                    })
                                  } else {
                                    setFormData({
                                      ...formData,
                                      listIds: formData.listIds.filter(id => id !== list.id)
                                    })
                                  }
                                }}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                              />
                              <label
                                htmlFor={`list-${list.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {list.name}
                              </label>
                            </div>
                          ))
                      ) : (
                        <p className="text-sm text-gray-500">No hay listas disponibles</p>
                      )}
                    </div>
                  )}
                  {formData.listIds.length > 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      {formData.listIds.length} {formData.listIds.length === 1 ? 'lista seleccionada' : 'listas seleccionadas'}
                    </p>
                  )}
                </div>
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


              {/* Sección de gestión de variables personalizadas */}
              <div className="border rounded-lg p-4 space-y-4 mt-4">
                <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-semibold">Gestionar Variables Personalizadas</Label>
                      <p className="text-sm text-gray-500 mt-1">
                        Administra las variables personalizadas de esta campaña
                      </p>
                    </div>
                  <Button
                    type="button"
                    onClick={() => setShowAddVariableDialog(true)}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Variable
                  </Button>
                </div>

                  {allCustomVariables.length > 0 ? (
                    <div className="space-y-2">
                      {allCustomVariables.map((variable) => {
                        return (
                          <div key={variable.id} className="border rounded-md p-3 bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <span className="text-sm font-semibold">
                                  {variable.name.replace(/_/g, ' ')}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenEditVariable(variable)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteVariable(variable.id!)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No hay variables personalizadas creadas
                    </p>
                  )}
                </div>
            </form>
          </Dialog>

          {/* Dialog para agregar nueva variable */}
          <Dialog
            open={showAddVariableDialog}
            onOpenChange={(open) => {
              if (!open) {
                setShowAddVariableDialog(false)
                setNewVariableForm({ name: '', valor: '' })
              } else {
                setShowAddVariableDialog(open)
              }
            }}
            title="Crear Variable Personalizada"
            maxWidth="md"
            footer={
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddVariableDialog(false)
                    setNewVariableForm({ name: '', valor: '' })
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleAddVariable}
                >
                  Crear Variable
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-var-name">nombre_variable *</Label>
                <Input
                  id="new-var-name"
                  type="text"
                  value={newVariableForm.name}
                  onChange={(e) => setNewVariableForm({ ...newVariableForm, name: e.target.value })}
                  placeholder="Ej: nombre_producto"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddVariable()
                    }
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Solo letras, números y guiones bajos. Debe empezar con letra o guión bajo.
                </p>
              </div>
              <div>
                <Label htmlFor="new-var-valor">valor_variable</Label>
                <Input
                  id="new-var-valor"
                  type="text"
                  value={newVariableForm.valor}
                  onChange={(e) => setNewVariableForm({ ...newVariableForm, valor: e.target.value })}
                  placeholder="Ej: Camiseta"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddVariable()
                    }
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Valor por defecto para esta variable en la campaña.
                </p>
              </div>
            </div>
          </Dialog>

          {/* Dialog para editar variable */}
          <Dialog
            open={showEditVariableDialog}
            onOpenChange={(open) => {
              if (!open) {
                setShowEditVariableDialog(false)
                setEditingVariableId(null)
                setEditingVariableData({ name: '', valor: '' })
              } else {
                setShowEditVariableDialog(open)
              }
            }}
            title="Editar Variable Personalizada"
            maxWidth="md"
            footer={
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditVariableDialog(false)
                    setEditingVariableId(null)
                    setEditingVariableData({ name: '', valor: '' })
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveVariableEdit}
                >
                  Guardar Cambios
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-var-name">nombre_variable *</Label>
                <Input
                  id="edit-var-name"
                  type="text"
                  value={editingVariableData.name}
                  onChange={(e) => setEditingVariableData({ ...editingVariableData, name: e.target.value })}
                  placeholder="Ej: nombre_producto"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSaveVariableEdit()
                    }
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Solo letras, números y guiones bajos. Debe empezar con letra o guión bajo.
                </p>
              </div>
              <div>
                <Label htmlFor="edit-var-valor">valor_variable</Label>
                <Input
                  id="edit-var-valor"
                  type="text"
                  value={editingVariableData.valor !== undefined && editingVariableData.valor !== null ? editingVariableData.valor : ''}
                  onChange={(e) => setEditingVariableData({ ...editingVariableData, valor: e.target.value })}
                  placeholder="Ej: Camiseta"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSaveVariableEdit()
                    }
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Valor por defecto para esta variable en la campaña.
                </p>
              </div>
            </div>
          </Dialog>

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
              <Card className="border">
                <CardContent className="p-0">
                  <div className="max-h-[600px] overflow-y-auto p-4 space-y-4">
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
                              {/* Mostrar variables personalizadas */}
                              {campaign.customVariablesWithValues && campaign.customVariablesWithValues.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <p className="text-xs font-semibold text-gray-500 mb-2">Variables Personalizadas:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {campaign.customVariablesWithValues.map((variable: CustomVariable) => (
                                      <div
                                        key={variable.id}
                                        className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 border border-blue-200 rounded-md"
                                      >
                                        <span className="text-xs font-medium text-blue-700">
                                          {variable.name.replace(/_/g, ' ')}
                                        </span>
                                        {variable.valor && (
                                          <span className="text-xs text-blue-600">
                                            = {variable.valor}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
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
                </CardContent>
              </Card>
            )}
          </div>

          {/* Diálogo de confirmación de eliminación de campaña */}
          <AlertDialog
            open={showDeleteDialog && !!campaignToDelete}
            onOpenChange={(open) => {
              if (!open) {
                setShowDeleteDialog(false)
                setCampaignToDelete(null)
              }
            }}
            title="¿Estás seguro?"
            description={
              <>
                Esta acción no se puede deshacer. Se eliminará permanentemente la campaña
                <strong> "{campaignToDelete?.name}"</strong> y todos sus datos asociados.
              </>
            }
            onConfirm={confirmDelete}
            onCancel={() => {
              setShowDeleteDialog(false)
              setCampaignToDelete(null)
            }}
            confirmText="Eliminar"
            cancelText="Cancelar"
            variant="destructive"
          />

        </div>
      </AppSidebar>
    </>
  )
}
