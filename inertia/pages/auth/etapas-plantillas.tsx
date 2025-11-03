import { Head } from '@inertiajs/react'
import AppSidebar from '~/components/AppSidebar'
import { SimpleEditor } from '~/components/tiptap-templates/simple/simple-editor'
import { useState, useEffect } from 'react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Plus, FileText, Edit, Trash2, Eye, X, Link2, Unlink } from 'lucide-react'
import { useToast } from '~/hooks/useToast'
import ToastContainer from '~/components/ui/toast-container'
import { AlertDialog } from '~/components/ui/alert-dialog'

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

interface CampaignStage {
  id: number
  name: string
  stageNumber: number
  startsAt?: string
  campaignId: number
  campaign?: {
    id: number
    name: string
  }
  templates?: Template[]
  createdAt: string
  updatedAt: string
}

interface Campaign {
  id: number
  name: string
  description?: string
  status: string
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
  
  // Formulario de etapa
  const [stageFormData, setStageFormData] = useState({
    name: '',
    stageNumber: 1,
    campaignId: '',
    startsAt: ''
  })
  const [editingStageId, setEditingStageId] = useState<number | null>(null)
  
  // Formulario de template
  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    subject: '',
    content: '',
    active: true
  })
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null)

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
        setStages(data.data)
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
        setTemplates(data.data)
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
          startsAt: stageFormData.startsAt || undefined
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
  const handleEditStage = (stage: CampaignStage) => {
    setStageFormData({
      name: stage.name,
      stageNumber: stage.stageNumber,
      campaignId: stage.campaignId.toString(),
      startsAt: stage.startsAt ? new Date(stage.startsAt).toISOString().slice(0, 16) : ''
    })
    setEditingStageId(stage.id)
    setShowStageForm(true)
  }

  // Editar template
  const handleEditTemplate = (template: Template) => {
    setTemplateFormData({
      name: template.name,
      subject: template.subject,
      content: template.bodyMarkdown,
      active: template.active
    })
    setEditingTemplateId(template.id)
    setShowTemplateForm(true)
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

  // Resetear formularios
  const resetStageForm = () => {
    setStageFormData({
      name: '',
      stageNumber: 1,
      campaignId: '',
      startsAt: ''
    })
    setEditingStageId(null)
    setShowStageForm(false)
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
                onClick={() => setShowStageForm(!showStageForm)}
                variant={showStageForm ? "outline" : "default"}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                {showStageForm ? 'Cancelar' : 'Nueva Etapa'}
              </Button>
              <Button 
                onClick={() => setShowTemplateForm(!showTemplateForm)}
                variant={showTemplateForm ? "outline" : "default"}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                {showTemplateForm ? 'Cancelar' : 'Nueva Plantilla'}
              </Button>
            </div>
          </div>

          {/* Formulario de Etapa */}
          {showStageForm && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>{editingStageId ? 'Editar Etapa' : 'Nueva Etapa'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="stage-name">Nombre de la Etapa</Label>
                    <Input
                      id="stage-name"
                      value={stageFormData.name}
                      onChange={(e) => setStageFormData({ ...stageFormData, name: e.target.value })}
                      placeholder="Ej: Bienvenida"
                    />
                  </div>
                  <div>
                    <Label htmlFor="stage-campaign">Campaña</Label>
                    <select
                      id="stage-campaign"
                      value={stageFormData.campaignId}
                      onChange={(e) => setStageFormData({ ...stageFormData, campaignId: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Selecciona una campaña</option>
                      {campaigns.map(campaign => (
                        <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="stage-number">Número de Etapa</Label>
                    <Input
                      id="stage-number"
                      type="number"
                      min="1"
                      value={stageFormData.stageNumber}
                      onChange={(e) => setStageFormData({ ...stageFormData, stageNumber: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="stage-starts">Fecha de Inicio</Label>
                    <Input
                      id="stage-starts"
                      type="datetime-local"
                      value={stageFormData.startsAt}
                      onChange={(e) => setStageFormData({ ...stageFormData, startsAt: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex gap-3 justify-end pt-2 border-t">
                  <Button variant="outline" onClick={resetStageForm}>Cancelar</Button>
                  <Button onClick={handleSaveStage} disabled={savingStage}>
                    {savingStage ? 'Guardando...' : 'Guardar Etapa'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Formulario de Plantilla */}
          {showTemplateForm && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>{editingTemplateId ? 'Editar Plantilla' : 'Nueva Plantilla'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="template-name">Nombre</Label>
                    <Input
                      id="template-name"
                      value={templateFormData.name}
                      onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })}
                      placeholder="Ej: Bienvenida"
                    />
                  </div>
                  <div>
                    <Label htmlFor="template-subject">Asunto</Label>
                    <Input
                      id="template-subject"
                      value={templateFormData.subject}
                      onChange={(e) => setTemplateFormData({ ...templateFormData, subject: e.target.value })}
                      placeholder="Ej: ¡Bienvenido!"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="template-content">Contenido</Label>
                  <div className="border rounded-lg h-[400px] mt-2">
                    <SimpleEditor
                      content={templateFormData.content}
                      onChange={(content: string) => setTemplateFormData({ ...templateFormData, content })}
                    />
                  </div>
                </div>
                <div className="flex gap-3 justify-end pt-2 border-t">
                  <Button variant="outline" onClick={resetTemplateForm}>Cancelar</Button>
                  <Button onClick={handleSaveTemplate} disabled={savingTemplate}>
                    {savingTemplate ? 'Guardando...' : 'Guardar Plantilla'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista de Etapas */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Etapas de Campaña</h2>
            {loadingStages ? (
              <div className="text-center py-12 text-gray-500">Cargando etapas...</div>
            ) : stages.length === 0 ? (
              <Card className="border-2 border-dashed">
                <CardContent className="py-12 text-center">
                  <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No hay etapas creadas aún</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {stages.map((stage) => (
                  <Card key={stage.id} className="hover:shadow-lg transition-all">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{stage.name}</CardTitle>
                          <p className="text-sm text-gray-500 mt-1">
                            Etapa #{stage.stageNumber} - {stage.campaign?.name || 'Sin campaña'}
                          </p>
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
                <div dangerouslySetInnerHTML={{ __html: viewingTemplate.bodyMarkdown }} />
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
