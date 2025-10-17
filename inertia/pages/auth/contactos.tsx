import { Head, useForm, router } from '@inertiajs/react'
import AppSidebar from '~/components/AppSidebar'
import { Users, Plus, Upload, FileText, Search, Filter, Edit, Trash2, Mail, Calendar } from 'lucide-react'
import { useState, useEffect } from 'react'

interface User {
  id: number
  fullName: string
  email: string
}

interface Subscriber {
  id: number
  email: string
  name: string
  description?: string
  status: 'active' | 'inactive' | 'archived'
  createdAt: string
}

interface ContactosProps {
  user: User
  subscribers?: Subscriber[]
  flash?: {
    success?: string
    error?: string
  }
}

export default function Contactos({ user, subscribers = [], flash }: ContactosProps) {
  const [activeTab, setActiveTab] = useState<'manual' | 'form' | 'import'>('manual')
  const [searchTerm, setSearchTerm] = useState('')
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null)
  const [editingSubscriber, setEditingSubscriber] = useState<Subscriber | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{show: boolean, subscriber: Subscriber | null}>({show: false, subscriber: null})
  const [emailError, setEmailError] = useState<string>('')
  const [editEmailError, setEditEmailError] = useState<string>('')

  // Función de validación de email simplificada
  const validateEmail = (email: string): { isValid: boolean; message?: string } => {
    if (!email || email.trim() === '') {
      return { isValid: false, message: 'Ejemplo: usuario@dominio.com' }
    }

    // Verificar longitud mínima y máxima
    if (email.length < 5) {
      return { isValid: false, message: 'Ejemplo: usuario@dominio.com' }
    }

    if (email.length > 254) {
      return { isValid: false, message: 'Ejemplo: usuario@dominio.com' }
    }

    // Verificar que no tenga espacios al inicio o final
    if (email !== email.trim()) {
      return { isValid: false, message: 'Ejemplo: usuario@dominio.com' }
    }

    // Regex más robusta para validación de email
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    
    if (!emailRegex.test(email)) {
      return { isValid: false, message: 'Ejemplo: usuario@dominio.com' }
    }

    // Verificar que no tenga caracteres consecutivos problemáticos
    if (email.includes('..') || email.includes('@@')) {
      return { isValid: false, message: 'Ejemplo: usuario@dominio.com' }
    }

    // Verificar que el dominio tenga al menos un punto
    const domain = email.split('@')[1]
    if (!domain || !domain.includes('.')) {
      return { isValid: false, message: 'Ejemplo: usuario@dominio.com' }
    }

    // Verificar que el dominio no termine en punto
    if (domain.endsWith('.')) {
      return { isValid: false, message: 'Ejemplo: usuario@dominio.com' }
    }

    return { isValid: true }
  }

  // Función para validar email en tiempo real (formulario de agregar)
  const handleEmailChange = (email: string) => {
    setFormData('email', email)
    if (email.length > 0) {
      const validation = validateEmail(email)
      setEmailError(validation.isValid ? '' : validation.message!)
    } else {
      setEmailError('')
    }
  }

  // Función para validar email en tiempo real (formulario de editar)
  const handleEditEmailChange = (email: string) => {
    setEditData('email', email)
    if (email.length > 0) {
      const validation = validateEmail(email)
      setEditEmailError(validation.isValid ? '' : validation.message!)
    } else {
      setEditEmailError('')
    }
  }

  // Mostrar notificación si hay mensaje flash
  useEffect(() => {
    if (flash?.success) {
      setNotification({ type: 'success', message: flash.success })
    } else if (flash?.error) {
      setNotification({ type: 'error', message: flash.error })
    }
  }, [flash])

  // Formulario para agregar contacto manualmente
  const { data: formData, setData: setFormData, post, processing, errors, reset } = useForm({
    name: '',
    email: '',
    description: '',
    listId: '',
    status: 'active'
  })

  // Formulario para editar contacto
  const { data: editData, setData: setEditData, processing: editProcessing, errors: editErrors, reset: resetEdit } = useForm({
    name: '',
    email: '',
    description: '',
    status: 'active'
  })


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validación de email en el frontend usando la función mejorada
    const emailValidation = validateEmail(formData.email)
    if (!emailValidation.isValid) {
      setNotification({ type: 'error', message: emailValidation.message! })
      setTimeout(() => setNotification(null), 5000)
      return
    }
    
    post('/subscribers', {
      onSuccess: () => {
        reset()
        setNotification({ type: 'success', message: '¡Contacto agregado correctamente!' })
        // Limpiar la notificación después de 3 segundos
        setTimeout(() => setNotification(null), 3000)
      },
      onError: (errors) => {
        console.error('Errores del formulario:', errors)
        // Los errores se mostrarán automáticamente en los campos
      }
    })
  }

  // Función para abrir modal de edición
  const handleEdit = (subscriber: Subscriber) => {
    setEditingSubscriber(subscriber)
    setEditData({
      name: subscriber.name,
      email: subscriber.email,
      description: subscriber.description || '',
      status: subscriber.status
    })
  }

  // Función para cerrar modal de edición
  const handleCloseEdit = () => {
    setEditingSubscriber(null)
    resetEdit()
  }

  // Función para enviar formulario de edición
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Enviando formulario de edición:', editData)
    console.log('ID del contacto:', editingSubscriber?.id)
    
    // Validación de email en el frontend usando la función mejorada
    const emailValidation = validateEmail(editData.email)
    if (!emailValidation.isValid) {
      setNotification({ type: 'error', message: emailValidation.message! })
      setTimeout(() => setNotification(null), 5000)
      return
    }
    
    if (editingSubscriber) {
      // Usar router.put directamente en lugar de put del useForm
      router.put(`/subscribers/${editingSubscriber.id}`, editData, {
        preserveState: true,
        preserveScroll: true,
        onSuccess: (page) => {
          console.log('Edición exitosa:', page)
          handleCloseEdit()
          setNotification({ type: 'success', message: '¡Contacto actualizado correctamente!' })
          // Limpiar la notificación después de 3 segundos
          setTimeout(() => setNotification(null), 3000)
        },
        onError: (errors) => {
          console.error('Errores del formulario de edición:', errors)
          // Mostrar errores específicos
          if (errors.email) {
            alert(`Error de email: ${errors.email}`)
          } else if (errors.name) {
            alert(`Error de nombre: ${errors.name}`)
          } else {
            alert('Error al actualizar el contacto. Por favor, verifica los datos.')
          }
        }
      })
    }
  }

  // Función para mostrar confirmación de borrado
  const handleDelete = (subscriber: Subscriber) => {
    setShowDeleteConfirm({show: true, subscriber})
  }

  // Función para confirmar borrado
  const confirmDelete = () => {
    if (showDeleteConfirm.subscriber) {
      router.delete(`/subscribers/${showDeleteConfirm.subscriber.id}`, {
        preserveState: true,
        preserveScroll: true,
        onSuccess: () => {
          setShowDeleteConfirm({show: false, subscriber: null})
          setNotification({ type: 'success', message: '¡Contacto eliminado correctamente!' })
          // Limpiar la notificación después de 3 segundos
          setTimeout(() => setNotification(null), 3000)
        },
        onError: (errors) => {
          console.error('Error al eliminar contacto:', errors)
        }
      })
    }
  }

  // Función para cancelar borrado
  const cancelDelete = () => {
    setShowDeleteConfirm({show: false, subscriber: null})
  }

  const filteredSubscribers = subscribers.filter(subscriber =>
    subscriber.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subscriber.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (subscriber.description && subscriber.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <>
      <Head title="Contactos" />
      
      <AppSidebar user={user} pageTitle="Contactos">
        {/* Notificación */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
            notification.type === 'success' 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}>
            <div className="flex items-center space-x-2">
              <span>{notification.message}</span>
              <button
                onClick={() => setNotification(null)}
                className="ml-2 text-white hover:text-gray-200"
              >
                ×
              </button>
            </div>
          </div>
        )}
        
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <div className="bg-white shadow-sm border-b">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Users className="h-8 w-8 text-orange-500" />
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Contactos</h1>
                    <p className="text-sm text-gray-600">Gestiona tus contactos y listas de suscriptores</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white border-b">
            <div className="px-6">
              <nav className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('manual')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'manual'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Plus className="h-4 w-4" />
                    <span>Agregar Manual</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('form')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'form'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span>Formulario</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('import')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'import'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Upload className="h-4 w-4" />
                    <span>Importar</span>
                  </div>
                </button>
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Manual Tab */}
            {activeTab === 'manual' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Agregar Contacto Manualmente</h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData('name', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                          errors.name ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Ingresa el nombre completo"
                        required
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email *
                      </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleEmailChange(e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                            errors.email || emailError ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder="correo@ejemplo.com"
                          required
                          pattern="[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*"
                          title="Ingresa un email válido (ejemplo: usuario@dominio.com)"
                        />
                      {(errors.email || emailError) && (
                        <p className="mt-1 text-sm text-red-600">{errors.email || emailError}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Descripción
                      </label>
                      <textarea
                        rows={3}
                        value={formData.description}
                        onChange={(e) => setFormData('description', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                          errors.description ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Descripción opcional del contacto"
                      />
                      {errors.description && (
                        <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Estado
                      </label>
                      <select 
                        value={formData.status}
                        onChange={(e) => setFormData('status', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      >
                        <option value="active">Activo</option>
                        <option value="inactive">Inactivo</option>
                        <option value="archived">Archivado</option>
                      </select>
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => reset()}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Limpiar
                      </button>
                      <button
                        type="submit"
                        disabled={processing}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                          processing 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-orange-500 hover:bg-orange-600'
                        } text-white`}
                      >
                        {processing ? 'Agregando...' : 'Agregar Contacto'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Form Tab */}
            {activeTab === 'form' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurar Formulario de Suscripción</h3>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre del Formulario
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="Formulario de Newsletter"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Descripción
                      </label>
                      <textarea
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="Describe el propósito de este formulario..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Campos del Formulario
                      </label>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" defaultChecked className="rounded" />
                          <span className="text-sm text-gray-700">Email (obligatorio)</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" defaultChecked className="rounded" />
                          <span className="text-sm text-gray-700">Nombre</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="rounded" />
                          <span className="text-sm text-gray-700">Descripción</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="rounded" />
                          <span className="text-sm text-gray-700">Empresa</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Lista de Destino
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500">
                        <option value="">Selecciona una lista</option>
                        <option value="1">Lista Principal</option>
                        <option value="2">Newsletter</option>
                        <option value="3">Promociones</option>
                      </select>
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                      >
                        Generar Código HTML
                      </button>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Vista Previa del Formulario</h3>
                  <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                    <div className="max-w-md mx-auto">
                      <h4 className="text-lg font-medium text-gray-900 mb-2">Suscríbete a nuestro Newsletter</h4>
                      <p className="text-sm text-gray-600 mb-4">Recibe las últimas noticias y actualizaciones</p>
                      <form className="space-y-3">
                        <input
                          type="email"
                          placeholder="Tu email"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                        <input
                          type="text"
                          placeholder="Tu nombre completo"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                        <button
                          type="submit"
                          className="w-full bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 transition-colors"
                        >
                          Suscribirse
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Import Tab */}
            {activeTab === 'import' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Importar Contactos desde CSV</h3>
                  <div className="space-y-6">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">Arrastra y suelta tu archivo CSV aquí</h4>
                      <p className="text-sm text-gray-600 mb-4">o</p>
                      <button className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors">
                        Seleccionar Archivo
                      </button>
                      <p className="text-xs text-gray-500 mt-4">
                        Formatos soportados: CSV, Excel (.xlsx, .xls)
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Lista de Destino
                        </label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500">
                          <option value="">Selecciona una lista</option>
                          <option value="1">Lista Principal</option>
                          <option value="2">Newsletter</option>
                          <option value="3">Promociones</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Estado por Defecto
                        </label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500">
                          <option value="active">Activo</option>
                          <option value="inactive">Inactivo</option>
                          <option value="pending">Pendiente</option>
                        </select>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-blue-900 mb-2">Formato de archivo CSV requerido:</h4>
                      <div className="text-xs text-blue-800 space-y-1">
                        <p>• Primera fila debe contener los encabezados de columna</p>
                        <p>• Columnas requeridas: email</p>
                        <p>• Columnas opcionales: name, description</p>
                        <p>• Separador: coma (,)</p>
                        <p>• Codificación: UTF-8</p>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                      >
                        Importar Contactos
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Contact List */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Lista de Contactos</h3>
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar contactos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                    <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                      <Filter className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto max-h-80 overflow-y-auto relative scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
                {/* Gradiente superior para indicar contenido arriba */}
                <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-white to-transparent pointer-events-none z-20"></div>
                {/* Gradiente inferior para indicar más contenido */}
                <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white to-transparent pointer-events-none z-20"></div>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contacto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Descripción
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSubscribers.map((subscriber) => (
                      <tr key={subscriber.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-orange-600">
                                {subscriber.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {subscriber.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-900">
                            <Mail className="h-4 w-4 text-gray-400 mr-2" />
                            {subscriber.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {subscriber.description || 'Sin descripción'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            subscriber.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : subscriber.status === 'inactive'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {subscriber.status === 'active' ? 'Activo' : 
                             subscriber.status === 'inactive' ? 'Inactivo' : 'Archivado'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-900">
                            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                            {new Date(subscriber.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button 
                              onClick={() => handleEdit(subscriber)}
                              className="text-orange-600 hover:text-orange-900"
                              title="Editar contacto"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(subscriber)}
                              className="text-red-600 hover:text-red-900"
                              title="Eliminar contacto"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {filteredSubscribers.length === 0 && (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay contactos</h3>
                  <p className="text-gray-600 mb-4">Comienza agregando contactos manualmente o importando desde un archivo CSV.</p>
                  <button
                    onClick={() => setActiveTab('manual')}
                    className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    Agregar Primer Contacto
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal de Edición */}
        {editingSubscriber && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Editar Contacto</h3>
              </div>
              
              <form onSubmit={handleEditSubmit} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      value={editData.name}
                      onChange={(e) => setEditData('name', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                        editErrors.name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Ingresa el nombre completo"
                      required
                    />
                    {editErrors.name && (
                      <p className="mt-1 text-sm text-red-600">{editErrors.name}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                      <input
                        type="email"
                        value={editData.email}
                        onChange={(e) => handleEditEmailChange(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                          editErrors.email || editEmailError ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="correo@ejemplo.com"
                        required
                        pattern="[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*"
                        title="Ingresa un email válido (ejemplo: usuario@dominio.com)"
                      />
                    {(editErrors.email || editEmailError) && (
                      <p className="mt-1 text-sm text-red-600">{editErrors.email || editEmailError}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción
                    </label>
                    <textarea
                      rows={3}
                      value={editData.description}
                      onChange={(e) => setEditData('description', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                        editErrors.description ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Descripción opcional del contacto"
                    />
                    {editErrors.description && (
                      <p className="mt-1 text-sm text-red-600">{editErrors.description}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estado
                    </label>
                    <select 
                      value={editData.status}
                      onChange={(e) => setEditData('status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo</option>
                      <option value="archived">Archivado</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseEdit}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={editProcessing}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      editProcessing 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-orange-500 hover:bg-orange-600'
                    } text-white`}
                  >
                    {editProcessing ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de confirmación de borrado */}
        {showDeleteConfirm.show && showDeleteConfirm.subscriber && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Confirmar Eliminación</h3>
              </div>
              
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mr-4">
                    <Trash2 className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-gray-900 font-medium">¿Estás seguro de que quieres eliminar este contacto?</p>
                    <p className="text-sm text-gray-600 mt-1">
                      <strong>{showDeleteConfirm.subscriber.name}</strong> - {showDeleteConfirm.subscriber.email}
                    </p>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-6">
                  Esta acción no se puede deshacer. El contacto será eliminado permanentemente.
                </p>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={cancelDelete}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Eliminar Contacto
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AppSidebar>
    </>
  )
}
