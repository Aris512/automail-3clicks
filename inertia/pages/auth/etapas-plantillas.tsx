import { Head } from '@inertiajs/react'
import AppSidebar from '~/components/AppSidebar'
import { SimpleEditor } from '~/components/tiptap-templates/simple/simple-editor'
import { useState, useEffect, useMemo } from 'react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Plus, FileText, Edit, Trash2, Eye, X, Link2, Unlink, Filter, Search, RefreshCw } from 'lucide-react'
import { useToast } from '~/hooks/useToast'
import ToastContainer from '~/components/ui/toast-container'
import { AlertDialog } from '~/components/ui/alert-dialog'
import { Dialog } from '~/components/ui/dialog'
import "~/components/tiptap/tiptap-node/image-node/image-node.scss"

interface User {
  id: number
  fullName: string
  email: string
}

interface Template {
  id: number
  name: string
  subject: string
  bodyMarkdown: string
  active: boolean
  createdAt: string
  updatedAt: string
}

interface CustomVariable {
  id: number
  name: string
  description?: string
  valor?: string
  valorStage?: string
  valorFinal?: string
  isOverridden?: boolean
}

interface CampaignStage {
  id: number
  name: string
  stageNumber: number
  startsAt?: string
  campaignId: number
  campaign?: {
    id: number
    name: string
    status?: 'active' | 'paused' | 'completed'
  }
  templates?: Template[]
  customVariablesWithValues?: CustomVariable[]
  createdAt: string
  updatedAt: string
}

interface Campaign {
  id: number
  name: string
  description?: string
  status: 'active' | 'paused' | 'completed'
}

interface EtapasPlantillasProps {
  user: User
}

export default function EtapasPlantillas({ user }: EtapasPlantillasProps) {
  const { toasts, showSuccess, showError, removeToast } = useToast()
  
  // Estados para etapas
  const [stages, setStages] = useState<CampaignStage[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [showStageForm, setShowStageForm] = useState(false)
  const [loadingStages, setLoadingStages] = useState(false)
  const [savingStage, setSavingStage] = useState(false)
  
  // Estados para templates
  const [templates, setTemplates] = useState<Template[]>([])
  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)
  
  // Estados para diálogos
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null)
  const [deleteType, setDeleteType] = useState<'stage' | 'template' | null>(null)
  const [itemToDelete, setItemToDelete] = useState<CampaignStage | Template | null>(null)
  
  // Estados para modales
  const [viewingTemplate, setViewingTemplate] = useState<Template | null>(null)
  
  // Estados para filtros de etapas
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCampaign, setFilterCampaign] = useState<string>('')
  const [filterDateFrom, setFilterDateFrom] = useState<string>('')
  const [filterDateTo, setFilterDateTo] = useState<string>('')
  const [filterHasTemplates, setFilterHasTemplates] = useState<string>('')
  const [isRefreshingStages, setIsRefreshingStages] = useState(false)
  
  // Formulario de etapa
  const [stageFormData, setStageFormData] = useState({
    name: '',
    stageNumber: 1,
    campaignId: '',
    startsAt: '',
    customVariableValues: [] as Array<{ customVarId: number; valor: string }>
  })
  const [editingStageId, setEditingStageId] = useState<number | null>(null)
  const [stageVariables, setStageVariables] = useState<CustomVariable[]>([])
  
  // Estados para gestión de variables personalizadas en etapa
  const [showAddVariableDialog, setShowAddVariableDialog] = useState(false)
  const [showEditVariableDialog, setShowEditVariableDialog] = useState(false)
  const [showEditStageValueDialog, setShowEditStageValueDialog] = useState(false)
  const [newVariableForm, setNewVariableForm] = useState({ name: '', valor: '' })
  const [editingVariableId, setEditingVariableId] = useState<number | null>(null)
  const [editingVariableData, setEditingVariableData] = useState({ name: '', valor: '' })
  const [editingStageValueData, setEditingStageValueData] = useState({ variableId: 0, variableName: '', valor: '' })
  
  // Formulario de template
  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    subject: '',
    content: '',
    active: true
  })
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null)
  const [availableCustomVariables, setAvailableCustomVariables] = useState<CustomVariable[]>([])
  const [currentStageId, setCurrentStageId] = useState<number | null>(null)
  const [currentCampaignId, setCurrentCampaignId] = useState<number | null>(null)

  // Función helper para obtener el token CSRF
  const getCsrfToken = () => {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
  }

  // Cargar campañas
  const loadCampaigns = async () => {
    try {
      const response = await fetch('/campaigns', {
        headers: { 'Accept': 'application/json' }
      })
      const data = await response.json()
      if (data.success) {
        setCampaigns(data.data)
      }
    } catch (error) {
      console.error('Error loading campaigns:', error)
    }
  }

  // Cargar etapas
  const loadStages = async () => {
    setLoadingStages(true)
    try {
      const response = await fetch('/campaign-stages/with-templates', {
        headers: { 'Accept': 'application/json' }
      })
      const data = await response.json()
      if (data.success) {
        // Ordenar por última modificación (más reciente primero)
        const sortedStages = [...data.data].sort((a, b) => {
          const dateA = new Date(a.updatedAt).getTime()
          const dateB = new Date(b.updatedAt).getTime()
          return dateB - dateA // Orden descendente (más reciente primero)
        })
        setStages(sortedStages)
      } else {
        showError('Error al cargar', 'No se pudieron cargar las etapas')
      }
    } catch (error) {
      console.error('Error loading stages:', error)
      showError('Error de conexión', 'No se pudo conectar con el servidor')
    } finally {
      setLoadingStages(false)
    }
  }

  // Cargar plantillas
  const loadTemplates = async () => {
    setLoadingTemplates(true)
    try {
      const response = await fetch('/templates', {
        headers: { 'Accept': 'application/json' }
      })
      const data = await response.json()
      if (data.success) {
        // Ordenar por última modificación (más reciente primero)
        const sortedTemplates = [...data.data].sort((a, b) => {
          const dateA = new Date(a.updatedAt).getTime()
          const dateB = new Date(b.updatedAt).getTime()
          return dateB - dateA // Orden descendente (más reciente primero)
        })
        setTemplates(sortedTemplates)
      } else {
        showError('Error al cargar', 'No se pudieron cargar las plantillas')
      }
    } catch (error) {
      console.error('Error loading templates:', error)
      showError('Error de conexión', 'No se pudo conectar con el servidor')
    } finally {
      setLoadingTemplates(false)
    }
  }

  useEffect(() => {
    loadCampaigns()
    loadStages()
    loadTemplates()
  }, [])

  // Filtrar etapas según todos los criterios
  const filteredStages = useMemo(() => {
    return stages.filter((stage) => {
      // Filtro de búsqueda general
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const matchesSearch = (
          stage.name.toLowerCase().includes(searchLower) ||
          stage.campaign?.name.toLowerCase().includes(searchLower) ||
          stage.stageNumber.toString().includes(searchLower) ||
          stage.templates?.some(t => t.name.toLowerCase().includes(searchLower) || t.subject.toLowerCase().includes(searchLower))
        )
        if (!matchesSearch) return false
      }

      // Filtro por campaña
      if (filterCampaign) {
        if (stage.campaignId.toString() !== filterCampaign) {
          return false
        }
      }

      // Filtro por plantillas asociadas
      if (filterHasTemplates) {
        if (filterHasTemplates === 'con' && (!stage.templates || stage.templates.length === 0)) {
          return false
        }
        if (filterHasTemplates === 'sin' && stage.templates && stage.templates.length > 0) {
          return false
        }
      }

      // Filtro por fecha de inicio
      if (filterDateFrom || filterDateTo) {
        if (!stage.startsAt) {
          // Si no tiene fecha de inicio y hay filtros de fecha, excluir
          return false
        } else {
          // Normalizar la fecha de inicio para comparar solo año, mes y día
          const startsDate = new Date(stage.startsAt)
          const startsDateOnly = new Date(startsDate.getFullYear(), startsDate.getMonth(), startsDate.getDate())
          
          // Si ambas fechas son iguales, buscar desde 00:00 hasta 23:59 del mismo día
          if (filterDateFrom && filterDateTo && filterDateFrom === filterDateTo) {
            // Crear fecha desde el string YYYY-MM-DD
            const [year, month, day] = filterDateFrom.split('-').map(Number)
            const targetDateOnly = new Date(year, month - 1, day)
            
            // Comparar solo las fechas (sin hora) - esto cubre todo el día desde 00:00 hasta 23:59
            if (startsDateOnly.getTime() !== targetDateOnly.getTime()) {
              return false
            }
          } else {
            // Lógica normal para rangos de fechas diferentes
            if (filterDateFrom) {
              const [year, month, day] = filterDateFrom.split('-').map(Number)
              const fromDate = new Date(year, month - 1, day, 0, 0, 0, 0)
              const fromDateOnly = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate())
              
              if (startsDateOnly < fromDateOnly) return false
            }

            if (filterDateTo) {
              const [year, month, day] = filterDateTo.split('-').map(Number)
              const toDate = new Date(year, month - 1, day, 23, 59, 59, 999)
              const toDateOnly = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate())
              
              if (startsDateOnly > toDateOnly) return false
            }
          }
        }
      }

      return true
    })
  }, [stages, searchTerm, filterCampaign, filterDateFrom, filterDateTo, filterHasTemplates])

  // Función para limpiar todos los filtros
  const clearFilters = () => {
    setSearchTerm('')
    setFilterCampaign('')
    setFilterDateFrom('')
    setFilterDateTo('')
    setFilterHasTemplates('')
  }

  // Verificar si hay filtros activos
  const hasActiveFilters = searchTerm || filterCampaign || filterDateFrom || filterDateTo || filterHasTemplates

  // Función para refrescar etapas
  const refreshStages = async () => {
    setIsRefreshingStages(true)
    try {
      await loadStages()
      showSuccess('Lista de etapas actualizada correctamente')
    } catch (error) {
      console.error('Error al actualizar etapas:', error)
      showError('Error de conexión', 'No se pudo actualizar la lista de etapas')
    } finally {
      setIsRefreshingStages(false)
    }
  }

  // Función para obtener el estilo del estado de la campaña
  const getCampaignStatusStyle = (status: 'active' | 'paused' | 'completed') => {
    switch (status) {
      case 'active':
        return {
          bg: 'bg-green-100',
          text: 'text-green-800',
          label: 'Activa'
        }
      case 'paused':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-800',
          label: 'En Pausa'
        }
      case 'completed':
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          label: 'Completada'
        }
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          label: 'Desconocido'
        }
    }
  }

  // Función para formatear fecha
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Función para convertir fecha a formato datetime-local sin cambiar zona horaria
  const formatDateForInput = (dateString: string | null | undefined) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    // Obtener componentes en zona horaria local
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  // Guardar etapa
  const handleSaveStage = async () => {
    if (!stageFormData.name.trim() || !stageFormData.campaignId) {
      showError('Campos incompletos', 'Por favor completa todos los campos obligatorios')
      return
    }

    setSavingStage(true)
    try {
      const url = editingStageId ? `/campaign-stages/${editingStageId}` : '/campaign-stages'
      const method = editingStageId ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        body: JSON.stringify({
          name: stageFormData.name,
          stageNumber: stageFormData.stageNumber,
          campaignId: parseInt(stageFormData.campaignId),
          startsAt: stageFormData.startsAt || undefined,
          customVariableValues: stageFormData.customVariableValues.filter(v => v.valor && v.valor.trim())
        })
      })

      const data = await response.json()
      
      if (data.success) {
        showSuccess(
          editingStageId ? 'Etapa actualizada' : 'Etapa creada',
          editingStageId ? 'La etapa se ha actualizado correctamente' : 'La etapa se ha creado exitosamente',
          3000
        )
        resetStageForm()
        loadStages()
      } else {
        showError('Error al guardar', data.message || 'No se pudo guardar la etapa')
      }
    } catch (error) {
      console.error('Error saving stage:', error)
      showError('Error de conexión', 'No se pudo conectar con el servidor')
    } finally {
      setSavingStage(false)
    }
  }

  // Guardar plantilla
  const handleSaveTemplate = async () => {
    if (!templateFormData.name.trim() || !templateFormData.subject.trim() || !templateFormData.content.trim()) {
      showError('Campos incompletos', 'Por favor completa todos los campos obligatorios')
      return
    }

    setSavingTemplate(true)
    try {
      const url = editingTemplateId ? `/templates/${editingTemplateId}` : '/templates'
      const method = editingTemplateId ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        body: JSON.stringify({
          name: templateFormData.name,
          subject: templateFormData.subject,
          bodyMarkdown: templateFormData.content,
          active: templateFormData.active
        })
      })

      const data = await response.json()
      
      if (data.success) {
        showSuccess(
          editingTemplateId ? 'Plantilla actualizada' : 'Plantilla creada',
          editingTemplateId ? 'La plantilla se ha actualizado correctamente' : 'La plantilla se ha creado exitosamente',
          3000
        )
        resetTemplateForm()
        loadTemplates()
        loadStages() // Recargar para actualizar templates asociadas
      } else {
        showError('Error al guardar', data.message || 'No se pudo guardar la plantilla')
      }
    } catch (error) {
      console.error('Error saving template:', error)
      showError('Error de conexión', 'No se pudo conectar con el servidor')
    } finally {
      setSavingTemplate(false)
    }
  }

  // Asociar template a etapa
  const handleAssociateTemplate = async (stageId: number, templateId: number) => {
    try {
      const response = await fetch(`/campaign-stages/${stageId}/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        body: JSON.stringify({ templateId })
      })

      const data = await response.json()
      
      if (data.success) {
        showSuccess('Plantilla asociada', 'La plantilla se ha asociado exitosamente a la etapa', 3000)
        loadStages()
      } else {
        showError('Error al asociar', data.message || 'No se pudo asociar la plantilla')
      }
    } catch (error) {
      console.error('Error associating template:', error)
      showError('Error de conexión', 'No se pudo conectar con el servidor')
    }
  }

  // Desasociar template de etapa
  const handleDissociateTemplate = async (stageId: number, templateId: number) => {
    try {
      const response = await fetch(`/campaign-stages/${stageId}/templates`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        body: JSON.stringify({ templateId })
      })

      const data = await response.json()
      
      if (data.success) {
        showSuccess('Plantilla desasociada', 'La plantilla se ha desasociado exitosamente', 3000)
        loadStages()
      } else {
        showError('Error al desasociar', data.message || 'No se pudo desasociar la plantilla')
      }
    } catch (error) {
      console.error('Error dissociating template:', error)
      showError('Error de conexión', 'No se pudo conectar con el servidor')
    }
  }

  // Editar etapa
  const handleEditStage = async (stage: CampaignStage) => {
    setStageFormData({
      name: stage.name,
      stageNumber: stage.stageNumber,
      campaignId: stage.campaignId.toString(),
      startsAt: formatDateForInput(stage.startsAt),
      customVariableValues: []
    })
    setEditingStageId(stage.id)
    
    // Cargar variables de la etapa
    try {
      const response = await fetch(`/campaign-stages/${stage.id}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        credentials: 'include'
      })
      const result = await response.json()
      if (result.success && result.data?.customVariablesWithValues) {
        setStageVariables(result.data.customVariablesWithValues)
        setStageFormData(prev => ({
          ...prev,
          // Incluir todas las variables que tienen un valor_stage de la etapa (isOverridden: true y valorStage existe)
          // Esto permite precargar los valores de etapa en el formulario
          customVariableValues: result.data.customVariablesWithValues
            .filter((v: CustomVariable) => {
              // Incluir solo variables que tienen un valor_stage definido (puede ser string vacío)
              return v.isOverridden && 
                     v.valorStage !== null && 
                     v.valorStage !== undefined
            })
            .map((v: CustomVariable) => ({
              customVarId: v.id,
              valor: String(v.valorStage || '') // Usar valor_stage de la etapa específica
            }))
        }))
      } else {
        // Si no hay variables, cargar desde la campaign
        await loadStageVariablesFromCampaign(stage.campaignId)
      }
    } catch (error) {
      console.error('Error al cargar variables de la etapa:', error)
      // Cargar desde campaign como fallback
      await loadStageVariablesFromCampaign(stage.campaignId)
    }
    
    setShowStageForm(true)
  }

  // Cargar variables desde la campaign
  const loadStageVariablesFromCampaign = async (campaignId: number) => {
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
        setStageVariables(result.data.customVariablesWithValues)
      }
    } catch (error) {
      console.error('Error al cargar variables de la campaign:', error)
    }
  }

  // Editar template
  const handleEditTemplate = async (template: Template, stageId?: number) => {
    // Resetear variables al inicio para evitar mostrar variables de ediciones anteriores
    setAvailableCustomVariables([])
    setCurrentStageId(null)
    setCurrentCampaignId(null)
    
    setTemplateFormData({
      name: template.name,
      subject: template.subject,
      content: template.bodyMarkdown,
      active: template.active
    })
    setEditingTemplateId(template.id)
    
    // Si se proporciona stageId, usar esa etapa específica para cargar las variables
    if (stageId) {
      const stage = stages.find(s => s.id === stageId)
      if (stage) {
        setCurrentStageId(stageId)
        setCurrentCampaignId(stage.campaignId)
        await loadVariablesFromStage(stageId)
      }
    } else {
      // Si no se proporciona stageId, buscar la primera etapa asociada (comportamiento para compatibilidad)
      const associatedStage = stages.find(s => s.templates?.some(t => t.id === template.id))
      if (associatedStage && associatedStage.id) {
        setCurrentStageId(associatedStage.id)
        setCurrentCampaignId(associatedStage.campaignId)
        // Cargar variables desde la etapa para obtener valor_stage
        await loadVariablesFromStage(associatedStage.id)
      } else if (associatedStage && associatedStage.campaignId) {
        setCurrentCampaignId(associatedStage.campaignId)
        // Si no hay etapa pero hay campaña, cargar desde la campaña
        await loadVariablesFromCampaign(associatedStage.campaignId)
      }
      // Si no hay etapa asociada, availableCustomVariables permanece vacío (ya reseteado arriba)
    }
    
    setShowTemplateForm(true)
  }

  // Cargar variables desde una etapa (para obtener valor_stage)
  const loadVariablesFromStage = async (stageId: number) => {
    try {
      const response = await fetch(`/campaign-stages/${stageId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        credentials: 'include'
      })
      const result = await response.json()
      if (result.success && result.data?.customVariablesWithValues) {
        // Las variables ya vienen con valorFinal que prioriza valor_stage sobre valor
        // Asegurar que sea un array válido
        const variables = Array.isArray(result.data.customVariablesWithValues) 
          ? result.data.customVariablesWithValues 
          : []
        setAvailableCustomVariables(variables)
      } else {
        // Si no hay variables o la respuesta no es exitosa, establecer array vacío
        setAvailableCustomVariables([])
      }
    } catch (error) {
      console.error('Error al cargar variables de la etapa:', error)
      // En caso de error, asegurar que el array esté vacío
      setAvailableCustomVariables([])
    }
  }

  // Cargar variables desde una campaña
  const loadVariablesFromCampaign = async (campaignId: number) => {
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
        // Asegurar que sea un array válido
        const variables = Array.isArray(result.data.customVariablesWithValues) 
          ? result.data.customVariablesWithValues 
          : []
        setAvailableCustomVariables(variables)
      } else {
        // Si no hay variables o la respuesta no es exitosa, establecer array vacío
        setAvailableCustomVariables([])
      }
    } catch (error) {
      console.error('Error al cargar variables de la campaña:', error)
      // En caso de error, asegurar que el array esté vacío
      setAvailableCustomVariables([])
    }
  }


  // Eliminar
  const handleDeleteClick = (id: number, type: 'stage' | 'template') => {
    if (type === 'stage') {
      const stage = stages.find(s => s.id === id)
      if (stage) {
        setItemToDelete(stage)
        setDeleteType('stage')
        setDeleteTargetId(id)
        setShowDeleteDialog(true)
      }
    } else {
      const template = templates.find(t => t.id === id)
      if (template) {
        setItemToDelete(template)
        setDeleteType('template')
        setDeleteTargetId(id)
        setShowDeleteDialog(true)
      }
    }
  }

  const confirmDelete = async () => {
    if (!deleteTargetId || !deleteType) return

    try {
      let url = ''
      if (deleteType === 'stage') {
        url = `/campaign-stages/${deleteTargetId}`
      } else {
        url = `/templates/${deleteTargetId}`
      }

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        }
      })

      const data = await response.json()
      
      if (data.success) {
        showSuccess(
          deleteType === 'stage' ? 'Etapa eliminada' : 'Plantilla eliminada',
          `El ${deleteType === 'stage' ? 'etapa' : 'plantilla'} se ha eliminado correctamente`,
          3000
        )
        if (deleteType === 'stage') {
          loadStages()
        } else {
          loadTemplates()
          loadStages()
        }
      } else {
        showError('Error al eliminar', data.message || `No se pudo eliminar el ${deleteType === 'stage' ? 'etapa' : 'plantilla'}`)
      }
    } catch (error) {
      console.error('Error deleting:', error)
      showError('Error de conexión', 'No se pudo conectar con el servidor')
    } finally {
      setShowDeleteDialog(false)
      setDeleteTargetId(null)
      setDeleteType(null)
      setItemToDelete(null)
    }
  }

  // Agregar variable personalizada desde el modal de etapa
  const handleAddVariable = async () => {
    if (!stageFormData.campaignId) {
      showError('Campaña requerida', 'Debes seleccionar una campaña primero')
      return
    }

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
    if (stageVariables.some(v => v.name === trimmed)) {
      showError('Variable duplicada', 'Esta variable ya existe. Usa una variable existente y agrega su valor.')
      return
    }

    try {
      const requestBody: any = {
        name: trimmed,
        description: '',
        campaignId: parseInt(stageFormData.campaignId),
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
        // Recargar variables de la campaña
        await loadStageVariablesFromCampaign(parseInt(stageFormData.campaignId))
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

  // Abrir modal de edición de valor para la etapa
  const handleOpenEditStageValue = (variable: CustomVariable) => {
    // Priorizar valor_stage de la etapa sobre valor de custom_variables
    // Primero verificar si hay un valor en customVariableValues (valor sobrescrito en el formulario)
    const existingValue = stageFormData.customVariableValues.find(v => v.customVarId === variable.id)
    
    // Determinar el valor a mostrar:
    // 1. Si hay un valor sobrescrito en customVariableValues, usarlo
    // 2. Si no, usar valor_stage de la etapa (si existe y no es null/undefined)
    // 3. Si no hay valor_stage, usar el valor de custom_variables
    let currentValor = ''
    if (existingValue) {
      // Si hay un valor en customVariableValues, usarlo (ya debería ser valor_stage)
      currentValor = existingValue.valor || ''
    } else if (variable.valorStage !== null && variable.valorStage !== undefined) {
      // Si no hay valor en customVariableValues pero hay valor_stage, usarlo
      currentValor = String(variable.valorStage)
    } else {
      // Si no hay valor_stage, usar el valor de custom_variables
      currentValor = variable.valor || ''
    }
    
    setEditingStageValueData({
      variableId: variable.id,
      variableName: variable.name,
      valor: currentValor
    })
    setShowEditStageValueDialog(true)
  }

  // Guardar valor de etapa
  const handleSaveStageValue = () => {
    if (!editingStageValueData.variableId || !editingStageId) return

    const updated = stageFormData.customVariableValues.filter(v => v.customVarId !== editingStageValueData.variableId)
    if (editingStageValueData.valor.trim()) {
      updated.push({ 
        customVarId: editingStageValueData.variableId, 
        valor: editingStageValueData.valor.trim() 
      })
    }
    
    setStageFormData({
      ...stageFormData,
      customVariableValues: updated
    })
    
    setShowEditStageValueDialog(false)
    setEditingStageValueData({ variableId: 0, variableName: '', valor: '' })
    
    // Nota: El valor se guardará cuando se guarde la etapa completa
    showSuccess('Valor actualizado', 'El valor se guardará cuando guardes la etapa', 2000)
  }

  // Guardar edición de variable personalizada
  const handleSaveVariableEdit = async () => {
    if (!editingVariableId || !stageFormData.campaignId) {
      showError('Error', 'Faltan datos necesarios para editar la variable')
      return
    }
    
    if (!editingVariableData.name.trim()) {
      showError('Campo requerido', 'El nombre de la variable es obligatorio')
      return
    }

    // Validar que la variable pertenece a la campaña de la etapa
    const variableInCampaign = stageVariables.find(v => v.id === editingVariableId)
    if (!variableInCampaign) {
      showError('Variable no válida', 'Esta variable no pertenece a la campaña de la etapa')
      setShowEditVariableDialog(false)
      setEditingVariableId(null)
      setEditingVariableData({ name: '', valor: '' })
      return
    }

    try {
      const requestBody: any = {
        name: editingVariableData.name.trim(),
        campaignId: parseInt(stageFormData.campaignId),
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

      if (result.success) {
        showSuccess('Éxito', 'Se editó correctamente la variable', 3000)
        setEditingVariableId(null)
        setEditingVariableData({ name: '', valor: '' })
        setShowEditVariableDialog(false)
        // Recargar variables de la campaña
        await loadStageVariablesFromCampaign(parseInt(stageFormData.campaignId))
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
    // Validar que hay una campaña seleccionada
    if (!stageFormData.campaignId) {
      showError('Campaña requerida', 'Debes seleccionar una campaña primero')
      return
    }

    // Validar que la variable pertenece a la campaña de la etapa
    const variableInCampaign = stageVariables.find(v => v.id === variableId)
    if (!variableInCampaign) {
      showError('Variable no válida', 'Esta variable no pertenece a la campaña de la etapa')
      return
    }

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
        // Recargar variables de la campaña
        await loadStageVariablesFromCampaign(parseInt(stageFormData.campaignId))
      } else {
        showError('Error al eliminar', result.message || 'No se pudo eliminar la variable')
      }
    } catch (error) {
      console.error('Error al eliminar variable:', error)
      showError('Error de conexión', 'No se pudo conectar con el servidor')
    }
  }

  // Resetear formularios
  const resetStageForm = () => {
    setStageFormData({
      name: '',
      stageNumber: 1,
      campaignId: '',
      startsAt: '',
      customVariableValues: []
    })
    setEditingStageId(null)
    setShowStageForm(false)
    setStageVariables([])
    setNewVariableForm({ name: '', valor: '' })
    setShowAddVariableDialog(false)
    setEditingVariableId(null)
    setEditingVariableData({ name: '', valor: '' })
    setShowEditVariableDialog(false)
    setShowEditStageValueDialog(false)
    setEditingStageValueData({ variableId: 0, variableName: '', valor: '' })
  }

  const resetTemplateForm = () => {
    setTemplateFormData({
      name: '',
      subject: '',
      content: '',
      active: true
    })
    setEditingTemplateId(null)
    setShowTemplateForm(false)
    setAvailableCustomVariables([])
    setCurrentStageId(null)
    setCurrentCampaignId(null)
  }

  // Recargar variables cuando se crea una nueva desde el editor
  const handleVariableCreated = async () => {
    if (currentStageId) {
      await loadVariablesFromStage(currentStageId)
    } else if (currentCampaignId) {
      await loadVariablesFromCampaign(currentCampaignId)
    }
  }

  return (
    <>
      <Head title="Etapas y Plantillas" />
      
      <AppSidebar user={user} pageTitle="Etapas y Plantillas">
        <ToastContainer toasts={toasts} onClose={removeToast} />
        
        <div className="w-full px-12 py-6 space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center border-b pb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Etapas y Plantillas</h1>
              <p className="text-gray-600 mt-0.5 text-sm">Gestiona etapas de campaña y sus plantillas asociadas</p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  resetStageForm()
                  setShowStageForm(true)
                }}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Nueva Etapa
              </Button>
              <Button 
                onClick={() => {
                  resetTemplateForm()
                  setShowTemplateForm(true)
                }}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Nueva Plantilla
              </Button>
            </div>
          </div>

          {/* Lista de Etapas */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Etapas de Campaña</h2>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                    title="Limpiar filtros"
                  >
                    <X className="h-4 w-4" />
                    Limpiar
                  </button>
                )}
                <button
                  onClick={refreshStages}
                  disabled={isRefreshingStages}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshingStages ? 'animate-spin' : ''}`} />
                  Actualizar
                </button>
              </div>
            </div>

            {/* Filtros */}
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-gray-500" />
                <h3 className="text-sm font-medium text-gray-700">Filtros</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Búsqueda general */}
                <div className="lg:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Búsqueda General
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre, campaña, número..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                    />
                  </div>
                </div>

                {/* Filtro por Campaña */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Campaña
                  </label>
                  <select
                    value={filterCampaign}
                    onChange={(e) => setFilterCampaign(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                  >
                    <option value="">Todas las campañas</option>
                    {campaigns.map((campaign) => (
                      <option key={campaign.id} value={campaign.id.toString()}>
                        {campaign.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro por Plantillas */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Plantillas
                  </label>
                  <select
                    value={filterHasTemplates}
                    onChange={(e) => setFilterHasTemplates(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                  >
                    <option value="">Todas</option>
                    <option value="con">Con plantillas</option>
                    <option value="sin">Sin plantillas</option>
                  </select>
                </div>

                {/* Filtro por Fecha Desde */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Fecha Desde
                  </label>
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                  />
                </div>

                {/* Filtro por Fecha Hasta */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Fecha Hasta
                  </label>
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    min={filterDateFrom}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                  />
                </div>
              </div>
            </div>

            {loadingStages ? (
              <div className="text-center py-12 text-gray-500">Cargando etapas...</div>
            ) : filteredStages.length === 0 ? (
              <Card className="border-2 border-dashed">
                <CardContent className="py-12 text-center">
                  <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">
                    {hasActiveFilters ? 'No se encontraron etapas con los filtros aplicados' : 'No hay etapas creadas aún'}
                  </p>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="mt-4 text-sm text-orange-600 hover:text-orange-700 underline"
                    >
                      Limpiar filtros
                    </button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="max-h-[600px] overflow-y-auto pr-2 space-y-4 border border-gray-200 rounded-lg p-4">
                {filteredStages.map((stage) => (
                  <Card key={stage.id} className="hover:shadow-lg transition-all">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{stage.name}</CardTitle>
                          <p className="text-sm text-gray-500 mt-1">
                            Número de etapas: {stage.stageNumber}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {stage.campaign && (
                              <>
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Campaña: {stage.campaign.name}
                                </span>
                                {stage.campaign.status && (
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getCampaignStatusStyle(stage.campaign.status).bg} ${getCampaignStatusStyle(stage.campaign.status).text}`}>
                                    {getCampaignStatusStyle(stage.campaign.status).label}
                                  </span>
                                )}
                              </>
                            )}
                            {stage.startsAt && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Fecha de inicio: {formatDate(stage.startsAt)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEditStage(stage)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(stage.id, 'stage')}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase mb-2">Plantillas Asociadas</p>
                          {stage.templates && stage.templates.length > 0 ? (
                            <div className="space-y-2">
                              {stage.templates.map((template) => (
                                <div key={template.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">{template.name}</p>
                                    <p className="text-xs text-gray-500">{template.subject}</p>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setViewingTemplate(template)}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditTemplate(template, stage.id)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDissociateTemplate(stage.id, template.id)}
                                    >
                                      <Unlink className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400">No hay plantillas asociadas</p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase mb-2">Asociar Plantilla</p>
                          <div className="flex gap-2 flex-wrap">
                            {templates.filter(t => !stage.templates?.some(st => st.id === t.id)).map((template) => (
                              <Button
                                key={template.id}
                                variant="outline"
                                size="sm"
                                onClick={() => handleAssociateTemplate(stage.id, template.id)}
                                className="flex items-center gap-1"
                              >
                                <Link2 className="h-3 w-3" />
                                {template.name}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Lista de Plantillas (simplificada) */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Todas las Plantillas</h2>
              <span className="text-sm text-gray-500">{templates.length} plantilla{templates.length !== 1 ? 's' : ''}</span>
            </div>
            {loadingTemplates ? (
              <div className="text-center py-12 text-gray-500">Cargando plantillas...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <Card key={template.id} className="hover:shadow-lg transition-all">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setViewingTemplate(template)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEditTemplate(template)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(template.id, 'template')}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">{template.subject}</p>
                      <span className={`text-xs px-2 py-1 rounded mt-2 inline-block ${
                        template.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {template.active ? 'Activa' : 'Inactiva'}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Diálogo de confirmación */}
        <AlertDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          title="⚠️ Confirmar eliminación"
          description={
            itemToDelete ? (
              <div className="space-y-2">
                <p className="font-medium text-gray-900">
                  ¿Estás seguro de que deseas eliminar {deleteType === 'stage' ? 'la etapa' : 'la plantilla'}?
                </p>
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm font-semibold text-red-800">
                    {deleteType === 'stage' ? (itemToDelete as CampaignStage).name : (itemToDelete as Template).name}
                  </p>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Esta acción es <strong>permanente</strong> y no se puede deshacer.
                </p>
              </div>
            ) : (
              '¿Estás seguro? Esta acción no se puede deshacer.'
            ) as React.ReactNode
          }
          onConfirm={confirmDelete}
          onCancel={() => {
            setShowDeleteDialog(false)
            setDeleteTargetId(null)
            setDeleteType(null)
            setItemToDelete(null)
          }}
          confirmText="Sí, eliminar"
          cancelText="Cancelar"
          variant="destructive"
        />

        {/* Modal de Etapa */}
        {showStageForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => resetStageForm()}>
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-xl font-semibold">{editingStageId ? 'Editar Etapa' : 'Nueva Etapa'}</h3>
                <Button variant="ghost" size="sm" onClick={() => resetStageForm()}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="modal-stage-name">Nombre de la Etapa</Label>
                      <Input
                        id="modal-stage-name"
                        value={stageFormData.name}
                        onChange={(e) => setStageFormData({ ...stageFormData, name: e.target.value })}
                        placeholder="Ej: Bienvenida"
                      />
                    </div>
                    <div>
                      <Label htmlFor="modal-stage-campaign">Campaña</Label>
                      <select
                        id="modal-stage-campaign"
                        value={stageFormData.campaignId}
                        onChange={async (e) => {
                          const campaignId = e.target.value
                          setStageFormData({ ...stageFormData, campaignId, customVariableValues: [] })
                          if (campaignId) {
                            await loadStageVariablesFromCampaign(parseInt(campaignId))
                          } else {
                            setStageVariables([])
                          }
                        }}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Selecciona una campaña</option>
                        {campaigns.map(campaign => (
                          <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="modal-stage-number">Número de Etapa</Label>
                      <Input
                        id="modal-stage-number"
                        type="number"
                        min="1"
                        value={stageFormData.stageNumber}
                        onChange={(e) => setStageFormData({ ...stageFormData, stageNumber: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="modal-stage-starts">Fecha de Inicio</Label>
                      <Input
                        id="modal-stage-starts"
                        type="datetime-local"
                        value={stageFormData.startsAt}
                        onChange={(e) => setStageFormData({ ...stageFormData, startsAt: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Variables heredadas de la campaign */}
                {stageFormData.campaignId && (
                  <div className="border rounded-lg p-4 space-y-4 mt-4">
                    <div>
                      <Label className="text-base font-semibold">Gestionar Variables Personalizadas</Label>
                      <p className="text-sm text-gray-500 mt-1">
                        Variables de la campaña. Puedes sobrescribir valores específicos para esta etapa.
                      </p>
                    </div>

                    {stageVariables.length > 0 ? (
                      <div className="space-y-2">
                        {stageVariables.map((variable) => {
                          // Priorizar valor_stage de la etapa sobre valor de custom_variables
                          // Verificar si existe valor_stage (no null ni undefined)
                          const tieneValorStage = variable.valorStage !== null && variable.valorStage !== undefined
                          
                          // Determinar el valor a mostrar: priorizar valor_stage sobre valor
                          let valorAMostrar = ''
                          if (tieneValorStage) {
                            // Si hay valor_stage, usarlo (puede ser string vacío)
                            valorAMostrar = String(variable.valorStage)
                          } else {
                            // Si no hay valor_stage, usar el valor de custom_variables
                            valorAMostrar = variable.valor || ''
                          }
                          
                          // Verificar si hay un valor sobrescrito en el formulario
                          const existingValue = stageFormData.customVariableValues.find(v => v.customVarId === variable.id)
                          const isOverridden = !!existingValue || tieneValorStage

                          return (
                            <div key={variable.id} className="border rounded-md p-3 bg-gray-50">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold">
                                      {`{{${variable.name}}}`}
                                    </span>
                                    {tieneValorStage && (
                                      <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">
                                        Valor de etapa
                                      </span>
                                    )}
                                    {isOverridden && !tieneValorStage && (
                                      <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                                        Valor sobrescrito
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Valor: <span className="font-mono">{valorAMostrar || '(vacío)'}</span>
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenEditStageValue(variable)}
                                    title="Editar valor para esta etapa"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteVariable(variable.id)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    title="Eliminar variable"
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
                )}
              </div>
              <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
                <Button variant="outline" onClick={() => resetStageForm()}>Cancelar</Button>
                <Button onClick={handleSaveStage} disabled={savingStage}>
                  {savingStage ? 'Guardando...' : editingStageId ? 'Actualizar Etapa' : 'Crear Etapa'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Plantilla */}
        {showTemplateForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => resetTemplateForm()}>
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-xl font-semibold">{editingTemplateId ? 'Editar Plantilla' : 'Nueva Plantilla'}</h3>
                <Button variant="ghost" size="sm" onClick={() => resetTemplateForm()}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="modal-template-name">Nombre</Label>
                      <Input
                        id="modal-template-name"
                        value={templateFormData.name}
                        onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })}
                        placeholder="Ej: Bienvenida"
                      />
                    </div>
                    <div>
                      <Label htmlFor="modal-template-subject">Asunto</Label>
                      <Input
                        id="modal-template-subject"
                        value={templateFormData.subject}
                        onChange={(e) => setTemplateFormData({ ...templateFormData, subject: e.target.value })}
                        placeholder="Ej: ¡Bienvenido!"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="modal-template-content">Contenido</Label>
                    <div className="border rounded-lg h-[400px] mt-2">
                      <SimpleEditor
                        content={templateFormData.content}
                        onChange={(content: string) => setTemplateFormData({ ...templateFormData, content })}
                        customVariables={availableCustomVariables}
                        campaignId={currentCampaignId}
                        stageId={currentStageId}
                        onVariableCreated={handleVariableCreated}
                      />
                    </div>
                  </div>

                  {/* Variables personalizadas disponibles */}
                  {availableCustomVariables.length > 0 && (
                    <div className="border rounded-lg p-4 space-y-3 mt-4">
                      <div>
                        <Label className="text-base font-semibold">Variables Personalizadas Disponibles</Label>
                        <p className="text-sm text-gray-500 mt-1">
                          Variables de la etapa asociada. Se muestra valor_stage si existe, de lo contrario el valor de la campaña.
                        </p>
                      </div>
                      <div className="space-y-2">
                        {availableCustomVariables.map((variable) => {
                          // Priorizar valor_stage sobre valor (usar valorFinal si está disponible, si no calcular)
                          const valorFinal = variable.valorFinal || (variable.valorStage || variable.valor || '')

                          return (
                            <div key={variable.id} className="border rounded-md p-3 bg-gray-50">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold">
                                      {`{{${variable.name}}}`}
                                    </span>
                                    {variable.valorStage && (
                                      <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">
                                        Valor de etapa
                                      </span>
                                    )}
                                  </div>
                                  {valorFinal && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      Valor: <span className="font-mono">{valorFinal}</span>
                                    </p>
                                  )}
                                  {variable.description && (
                                    <p className="text-xs text-gray-400 mt-1">
                                      {variable.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
                <Button variant="outline" onClick={() => resetTemplateForm()}>Cancelar</Button>
                <Button onClick={handleSaveTemplate} disabled={savingTemplate}>
                  {savingTemplate ? 'Guardando...' : editingTemplateId ? 'Actualizar Plantilla' : 'Crear Plantilla'}
                </Button>
              </div>
            </div>
          </div>
        )}

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

        {/* Dialog para editar variable de campaña */}
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
          title="Editar Variable Personalizada de Campaña"
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

        {/* Dialog para editar valor de variable para la etapa */}
        <Dialog
          open={showEditStageValueDialog}
          onOpenChange={(open) => {
            if (!open) {
              setShowEditStageValueDialog(false)
              setEditingStageValueData({ variableId: 0, variableName: '', valor: '' })
            } else {
              setShowEditStageValueDialog(open)
            }
          }}
          title={`Editar Valor para Etapa - {{${editingStageValueData.variableName}}}`}
          maxWidth="md"
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEditStageValueDialog(false)
                  setEditingStageValueData({ variableId: 0, variableName: '', valor: '' })
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSaveStageValue}
              >
                Guardar Valor
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-stage-valor">Valor para esta etapa</Label>
              <Input
                id="edit-stage-valor"
                type="text"
                value={editingStageValueData.valor}
                onChange={(e) => setEditingStageValueData({ ...editingStageValueData, valor: e.target.value })}
                placeholder="Ingresa el valor para esta etapa"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSaveStageValue()
                  }
                }}
              />
              <p className="text-xs text-gray-500 mt-1">
                Este valor sobrescribirá el valor de la campaña solo para esta etapa. Deja vacío para usar el valor de la campaña.
              </p>
            </div>
          </div>
        </Dialog>

        {/* Modal de visualización de plantilla */}
        {viewingTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setViewingTemplate(null)}>
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b">
                <div>
                  <h3 className="text-xl font-semibold">{viewingTemplate.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">Asunto: {viewingTemplate.subject}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setViewingTemplate(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="tiptap ProseMirror" dangerouslySetInnerHTML={{ __html: viewingTemplate.bodyMarkdown }} />
              </div>
              <div className="flex items-center justify-between p-6 border-t bg-gray-50">
                <span className={`text-xs px-2 py-1 rounded ${
                  viewingTemplate.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {viewingTemplate.active ? 'Activa' : 'Inactiva'}
                </span>
                <Button onClick={() => setViewingTemplate(null)} variant="outline">Cerrar</Button>
              </div>
            </div>
          </div>
        )}
      </AppSidebar>
    </>
  )
}
