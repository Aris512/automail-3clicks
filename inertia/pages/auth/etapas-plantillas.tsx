import { Head } from '@inertiajs/react'
import AppSidebar from '~/components/AppSidebar'
import { SimpleEditor } from '~/components/tiptap-templates/simple/simple-editor'
import { useState, useEffect } from 'react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Plus, FileText, Edit, Trash2, Eye, X } from 'lucide-react'
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

interface EtapasPlantillasProps {
  user: User
}

export default function EtapasPlantillas({ user }: EtapasPlantillasProps) {
  const { toasts, showSuccess, showError, removeToast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Estado para el diálogo de confirmación
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null)
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null)
  
  // Estado para el modal de visualización
  const [viewingTemplate, setViewingTemplate] = useState<Template | null>(null)
  
  // Formulario
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    content: '',
    active: true
  })
  const [editingId, setEditingId] = useState<number | null>(null)

  // Función helper para obtener el token CSRF
  const getCsrfToken = () => {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
  }

  // Cargar plantillas
  const loadTemplates = async () => {
    setLoading(true)
    try {
      const response = await fetch('/templates', {
        headers: {
          'Accept': 'application/json',
        }
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
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  // Guardar plantilla
  const handleSave = async () => {
    if (!formData.name.trim() || !formData.subject.trim() || !formData.content.trim()) {
      showError('Campos incompletos', 'Por favor completa todos los campos obligatorios')
      return
    }

    setSaving(true)
    try {
      const url = editingId ? `/templates/${editingId}` : '/templates'
      const method = editingId ? 'PUT' : 'POST'
      
      console.log('📤 [FRONTEND] Enviando datos:', {
        url,
        method,
        name: formData.name,
        subject: formData.subject,
        contentLength: formData.content.length,
        active: formData.active
      })
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        body: JSON.stringify({
          name: formData.name,
          subject: formData.subject,
          bodyMarkdown: formData.content,
          active: formData.active
        })
      })

      console.log('📥 [FRONTEND] Respuesta recibida:', response.status)
      const data = await response.json()
      console.log('📥 [FRONTEND] Datos respuesta:', data)
      
      if (data.success) {
        showSuccess(
          editingId ? 'Plantilla actualizada' : 'Plantilla creada',
          editingId 
            ? 'La plantilla se ha actualizado correctamente' 
            : 'La plantilla se ha creado exitosamente',
          3000
        )
        resetForm()
        loadTemplates()
      } else {
        showError('Error al guardar', data.message || 'No se pudo guardar la plantilla')
      }
    } catch (error) {
      console.error('❌ [FRONTEND] Error saving template:', error)
      showError('Error de conexión', 'No se pudo conectar con el servidor. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  // Abrir diálogo de confirmación para eliminar
  const handleDeleteClick = (id: number) => {
    const template = templates.find(t => t.id === id)
    if (template) {
      setTemplateToDelete(template)
      setDeleteTargetId(id)
      setShowDeleteDialog(true)
    }
  }

  // Confirmar eliminación de plantilla
  const confirmDelete = async () => {
    if (!deleteTargetId) return

    try {
      const response = await fetch(`/templates/${deleteTargetId}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        }
      })

      const data = await response.json()
      
      if (data.success) {
        showSuccess('Plantilla eliminada', 'La plantilla se ha eliminado correctamente', 3000)
        loadTemplates()
      } else {
        showError('Error al eliminar', data.message || 'No se pudo eliminar la plantilla')
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      showError('Error de conexión', 'No se pudo conectar con el servidor. Inténtalo de nuevo.')
    } finally {
      setShowDeleteDialog(false)
      setDeleteTargetId(null)
      setTemplateToDelete(null)
    }
  }

  // Editar plantilla
  const handleEdit = async (id: number) => {
    const template = templates.find(t => t.id === id)
    if (template) {
      setFormData({
        name: template.name,
        subject: template.subject,
        content: template.bodyMarkdown,
        active: template.active
      })
      setEditingId(id)
      setShowForm(true)
    }
  }

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      name: '',
      subject: '',
      content: '',
      active: true
    })
    setEditingId(null)
    setShowForm(false)
  }

  // Abrir modal de visualización
  const handleView = (template: Template) => {
    setViewingTemplate(template)
  }

  // Cerrar modal de visualización
  const handleCloseView = () => {
    setViewingTemplate(null)
  }

  return (
    <>
      <Head title="Etapas y Plantillas" />
      
      <AppSidebar user={user} pageTitle="Etapas y Plantillas">
        {/* Toasts */}
        <ToastContainer toasts={toasts} onClose={removeToast} />
        
        <div className="w-full px-12 py-6 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center border-b pb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Plantillas de Correos</h1>
              <p className="text-gray-600 mt-0.5 text-sm">Crea y gestiona plantillas para tus contactos</p>
            </div>
            <Button 
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2"
              variant={showForm ? "outline" : "default"}
            >
              <Plus className="h-4 w-4" />
              {showForm ? 'Cancelar' : 'Nueva Plantilla'}
            </Button>
          </div>

          {/* Formulario */}
          {showForm && (
            <Card className="shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl">{editingId ? 'Editar Plantilla' : 'Nueva Plantilla'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className="text-sm font-medium">Nombre de la Plantilla</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ej: Bienvenida para nuevos usuarios"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="subject" className="text-sm font-medium">Asunto del Email</Label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="Ej: ¡Bienvenido a nuestra plataforma!"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="content" className="text-sm font-medium mb-2 block">Contenido del Email</Label>
                  <div className="border border-gray-200 rounded-lg shadow-sm bg-white h-[600px] overflow-hidden">
                    <SimpleEditor
                      content={formData.content}
                      onChange={(content: string) => setFormData({ ...formData, content })}
                      placeholder="Escribe el contenido de tu plantilla aquí... Puedes usar negrita, cursiva, listas y más."
                      className="h-full"
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-2 border-t">
                  <Button variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar Plantilla'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista de Plantillas */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">Mis Plantillas</h2>
              <span className="text-sm text-gray-500">{templates.length} plantilla{templates.length !== 1 ? 's' : ''}</span>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="text-gray-500">Cargando plantillas...</div>
              </div>
            ) : templates.length === 0 ? (
              <Card className="border-2 border-dashed">
                <CardContent className="py-12 text-center">
                  <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No hay plantillas creadas aún</p>
                  <p className="text-gray-400 text-sm mt-2">Crea tu primera plantilla usando el botón "Nueva Plantilla"</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <Card key={template.id} className="hover:shadow-lg transition-all duration-200 border hover:border-blue-300">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start gap-2">
                        <CardTitle className="text-base font-semibold leading-tight">{template.name}</CardTitle>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(template)}
                            title="Visualizar"
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(template.id)}
                            title="Editar"
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(template.id)}
                            title="Eliminar"
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Asunto</p>
                          <p className="text-sm text-gray-700 leading-relaxed">{template.subject}</p>
                        </div>
                        
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Preview</p>
                          <div className="preview-content text-sm text-gray-600 bg-gray-50 p-2 rounded border border-gray-100 max-h-40 overflow-hidden">
                            <div 
                              dangerouslySetInnerHTML={{ __html: template.bodyMarkdown }}
                              style={{
                                maxHeight: '160px',
                                overflow: 'hidden'
                              }}
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className={`text-xs font-medium px-2 py-1 rounded ${
                            template.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {template.active ? '✓ Activa' : '✗ Inactiva'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(template.createdAt).toLocaleDateString('es-ES', { 
                              day: 'numeric', 
                              month: 'short', 
                              year: 'numeric' 
                            })}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Diálogo de confirmación para eliminar */}
        <AlertDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          title="⚠️ Confirmar eliminación"
          description={
            templateToDelete ? (
              <div className="space-y-2">
                <p className="font-medium text-gray-900">
                  ¿Estás seguro de que deseas eliminar la plantilla?
                </p>
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm font-semibold text-red-800">
                    "{templateToDelete.name}"
                  </p>
                  {templateToDelete.subject && (
                    <p className="text-xs text-red-600 mt-1">
                      Asunto: {templateToDelete.subject}
                    </p>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Esta acción es <strong>permanente</strong> y no se puede deshacer. 
                  La plantilla será eliminada de forma definitiva.
                </p>
              </div>
            ) : (
              '¿Estás seguro de que deseas eliminar esta plantilla? Esta acción no se puede deshacer.'
            ) as React.ReactNode
          }
          onConfirm={confirmDelete}
          onCancel={() => {
            setShowDeleteDialog(false)
            setDeleteTargetId(null)
            setTemplateToDelete(null)
          }}
          confirmText="Sí, eliminar"
          cancelText="Cancelar"
          variant="destructive"
        />

        {/* Modal de visualización de plantilla */}
        {viewingTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {viewingTemplate.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Asunto: {viewingTemplate.subject}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseView}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-white">
                <div className="prose max-w-none">
                  <div 
                    dangerouslySetInnerHTML={{ __html: viewingTemplate.bodyMarkdown }}
                    className="preview-content prose-headings:font-bold"
                    style={{
                      lineHeight: '1.6',
                      color: '#333'
                    }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-6 border-t bg-gray-50">
                <div className="flex items-center gap-4">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    viewingTemplate.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {viewingTemplate.active ? '✓ Activa' : '✗ Inactiva'}
                  </span>
                  <span className="text-xs text-gray-500">
                    Creada: {new Date(viewingTemplate.createdAt).toLocaleDateString('es-ES', { 
                      day: 'numeric', 
                      month: 'short', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <Button onClick={handleCloseView} variant="outline">
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        )}
      </AppSidebar>
    </>
  )
}
