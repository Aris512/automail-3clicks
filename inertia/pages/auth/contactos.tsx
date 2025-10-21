import { Head, useForm } from '@inertiajs/react'
import { validateEmail } from '../../lib/validations'
import { useToast } from '~/hooks/useToast'
import ToastContainer from '~/components/ui/toast-container'
import AppSidebar from '~/components/AppSidebar'
import { Users, Plus, Upload, Search, Edit, Trash2, Mail, Calendar, RefreshCw, FileText, AlertCircle } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

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
  const { toasts, showError, removeToast } = useToast()
  const [activeTab, setActiveTab] = useState<'manual' | 'import'>('manual')
  const [searchTerm, setSearchTerm] = useState('')
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null)
  const [editingSubscriber, setEditingSubscriber] = useState<Subscriber | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{show: boolean, subscriber: Subscriber | null}>({show: false, subscriber: null})
  const [currentSubscribers, setCurrentSubscribers] = useState<Subscriber[]>(subscribers)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Estados para importación
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Mostrar notificación si hay mensaje flash
  useEffect(() => {
    if (flash?.success) {
      setNotification({ type: 'success', message: flash.success })
    } else if (flash?.error) {
      setNotification({ type: 'error', message: flash.error })
    }
  }, [flash])

  // Función para actualizar la lista de contactos
  const refreshSubscribers = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch('/api/public/subscribers')
      const result = await response.json()
      
      if (result.success) {
        setCurrentSubscribers(result.data)
        setNotification({ type: 'success', message: 'Lista de contactos actualizada correctamente' })
        setTimeout(() => setNotification(null), 3000)
      } else {
        setNotification({ type: 'error', message: 'Error al actualizar la lista de contactos' })
        setTimeout(() => setNotification(null), 3000)
      }
    } catch (error) {
      console.error('Error al actualizar contactos:', error)
      setNotification({ type: 'error', message: 'Error de conexión al actualizar contactos' })
      setTimeout(() => setNotification(null), 3000)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Formulario para agregar contacto manualmente
  const { data: formData, setData: setFormData, processing, errors, reset } = useForm({
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
    const emailValidation = validateEmail(formData.email)
    if (!emailValidation.isValid) {
      showError('Correo inválido', 'El correo tiene un mal formato')
      return
    }
    
    // Crear contacto usando fetch API
    fetch('/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
      },
      body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(result => {
      if (result.success) {
        reset()
        
        // Agregar el nuevo contacto a currentSubscribers
        const newSubscriber: Subscriber = {
          id: result.data.id,
          name: formData.name,
          email: formData.email,
          description: formData.description,
          status: formData.status as 'active' | 'inactive' | 'archived',
          createdAt: result.data.createdAt || new Date().toISOString()
        }
        
        setCurrentSubscribers(prevSubscribers => [newSubscriber, ...prevSubscribers])
        
        setNotification({ type: 'success', message: '¡Contacto agregado correctamente!' })
        setTimeout(() => setNotification(null), 3000)
      } else {
        setNotification({ type: 'error', message: result.message || 'Error al agregar contacto' })
        setTimeout(() => setNotification(null), 3000)
      }
    })
    .catch(error => {
      console.error('Error al crear contacto:', error)
      setNotification({ type: 'error', message: 'Error de conexión al crear contacto' })
      setTimeout(() => setNotification(null), 3000)
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
    
    if (editingSubscriber) {
      const emailValidation = validateEmail(editData.email)
      if (!emailValidation.isValid) {
        showError('Correo inválido', 'El correo tiene un mal formato')
        return
      }
      
      // Usar fetch API para actualizar contacto
      fetch(`/subscribers/${editingSubscriber.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
        body: JSON.stringify(editData)
      })
      .then(response => response.json())
      .then(result => {
        if (result.success) {
          handleCloseEdit()
          
          // Actualizar el contacto en currentSubscribers
          setCurrentSubscribers(prevSubscribers => 
            prevSubscribers.map(subscriber => 
              subscriber.id === editingSubscriber.id 
                ? { 
                    ...subscriber, 
                    name: editData.name,
                    email: editData.email,
                    description: editData.description,
                    status: editData.status as 'active' | 'inactive' | 'archived'
                  }
                : subscriber
            )
          )
          
          setNotification({ type: 'success', message: '¡Contacto actualizado correctamente!' })
          setTimeout(() => setNotification(null), 3000)
        } else {
          setNotification({ type: 'error', message: result.message || 'Error al actualizar contacto' })
          setTimeout(() => setNotification(null), 3000)
        }
      })
      .catch(error => {
        console.error('Error al actualizar contacto:', error)
        setNotification({ type: 'error', message: 'Error de conexión al actualizar contacto' })
        setTimeout(() => setNotification(null), 3000)
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
      fetch(`/subscribers/${showDeleteConfirm.subscriber.id}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        }
      })
      .then(response => response.json())
      .then(result => {
        if (result.success) {
          setShowDeleteConfirm({show: false, subscriber: null})
          
          // Remover el contacto de currentSubscribers
          setCurrentSubscribers(prevSubscribers => 
            prevSubscribers.filter(subscriber => 
              subscriber.id !== showDeleteConfirm.subscriber!.id
            )
          )
          
          setNotification({ type: 'success', message: '¡Contacto eliminado correctamente!' })
          setTimeout(() => setNotification(null), 3000)
        } else {
          setNotification({ type: 'error', message: result.message || 'Error al eliminar contacto' })
          setTimeout(() => setNotification(null), 3000)
        }
      })
      .catch(error => {
        console.error('Error al eliminar contacto:', error)
        setNotification({ type: 'error', message: 'Error de conexión al eliminar contacto' })
        setTimeout(() => setNotification(null), 3000)
      })
    }
  }

  // Función para cancelar borrado
  const cancelDelete = () => {
    setShowDeleteConfirm({show: false, subscriber: null})
  }

  // Funciones para manejo de archivos
  const handleFileSelect = (file: File) => {
    // Validar tipo de archivo
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
    const allowedExtensions = ['.csv', '.xls', '.xlsx']
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      setNotification({ type: 'error', message: 'Formato de archivo no válido. Solo se permiten archivos CSV, XLS y XLSX' })
      setTimeout(() => setNotification(null), 5000)
      return
    }

    // Validar tamaño (15MB máximo)
    const maxSize = 15 * 1024 * 1024 // 15MB
    if (file.size > maxSize) {
      setNotification({ type: 'error', message: 'El archivo excede el tamaño máximo permitido de 15MB' })
      setTimeout(() => setNotification(null), 5000)
      return
    }

    setSelectedFile(file)
    setNotification({ type: 'success', message: `Archivo seleccionado: ${file.name}` })
    setTimeout(() => setNotification(null), 3000)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  const handleImport = async () => {
    if (!selectedFile) {
      setNotification({ type: 'error', message: 'Por favor selecciona un archivo para importar' })
      setTimeout(() => setNotification(null), 3000)
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      // Simular progreso
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 200)

      const response = await fetch('/subscribers/import', {
        method: 'POST',
        headers: {
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
        body: formData
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      const result = await response.json()

      if (result.success) {
        setNotification({ 
          type: 'success', 
          message: `¡Importación exitosa! Se importaron ${result.imported} contactos` 
        })
        
        // Limpiar archivo seleccionado
        setSelectedFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        
        // Actualizar la lista de contactos
        await refreshSubscribers()
        
        setTimeout(() => setNotification(null), 5000)
      } else {
        setNotification({ 
          type: 'error', 
          message: result.message || 'Error al importar el archivo' 
        })
        setTimeout(() => setNotification(null), 5000)
      }
    } catch (error) {
      console.error('Error al importar archivo:', error)
      setNotification({ 
        type: 'error', 
        message: 'Error de conexión al importar el archivo' 
      })
      setTimeout(() => setNotification(null), 5000)
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const clearSelectedFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const filteredSubscribers = currentSubscribers.filter(subscriber =>
    subscriber.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subscriber.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (subscriber.description && subscriber.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <>
      <Head title="Contactos" />
      
      <AppSidebar user={user} pageTitle="Contactos">
        {/* Toasts */}
        <ToastContainer toasts={toasts} onClose={removeToast} />
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
                        onChange={(e) => setFormData('email', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                          errors.email ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="correo@ejemplo.com"
                        required
                      />
                      
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

            {/* Import Tab */}
            {activeTab === 'import' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Importar Contactos desde Archivo</h3>
                  <div className="space-y-6">
                    {/* Área de subida de archivos */}
                    <div 
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        dragActive 
                          ? 'border-orange-400 bg-orange-50' 
                          : selectedFile 
                            ? 'border-green-400 bg-green-50' 
                            : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      {selectedFile ? (
                        <div className="space-y-4">
                          <FileText className="h-12 w-12 text-green-500 mx-auto" />
                          <div>
                            <h4 className="text-lg font-medium text-gray-900 mb-2">Archivo Seleccionado</h4>
                            <p className="text-sm text-gray-600 mb-2">{selectedFile.name}</p>
                            <p className="text-xs text-gray-500">
                              Tamaño: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <button
                            onClick={clearSelectedFile}
                            className="text-sm text-red-600 hover:text-red-800 underline"
                          >
                            Cambiar archivo
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                          <h4 className="text-lg font-medium text-gray-900 mb-2">
                            Arrastra y suelta tu archivo aquí
                          </h4>
                          <p className="text-sm text-gray-600 mb-4">o</p>
                          <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
                          >
                            Seleccionar Archivo
                          </button>
                          <p className="text-xs text-gray-500 mt-4">
                            Formatos soportados: CSV, Excel (.xlsx, .xls) • Máximo 15MB
                          </p>
                        </div>
                      )}
                      
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xls,.xlsx"
                        onChange={handleFileInputChange}
                        className="hidden"
                      />
                    </div>

                    {/* Barra de progreso */}
                    {isUploading && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Importando contactos...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Información del formato */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="text-sm font-medium text-blue-900 mb-2">Formato de archivo requerido:</h4>
                          <div className="text-xs text-blue-800 space-y-1">
                            <p>• Primera fila debe contener los encabezados de columna</p>
                            <p>• <strong>Columna requerida:</strong> email</p>
                            <p>• <strong>Columnas opcionales:</strong> name, description</p>
                            <p>• Separador: coma (,)</p>
                            <p>• Codificación: UTF-8</p>
                            <p>• Tamaño máximo: 15MB</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Ejemplo de formato */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Ejemplo de formato CSV:</h4>
                      <div className="bg-white border rounded p-3 font-mono text-xs text-gray-700">
                        <div>email,name,description</div>
                        <div>juan@ejemplo.com,Juan Pérez,Cliente potencial</div>
                        <div>maria@empresa.com,Maria García,Lead calificado</div>
                      </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={clearSelectedFile}
                        disabled={isUploading}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Limpiar
                      </button>
                      <button
                        type="button"
                        onClick={handleImport}
                        disabled={!selectedFile || isUploading}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                          !selectedFile || isUploading
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-orange-500 hover:bg-orange-600'
                        } text-white`}
                      >
                        {isUploading ? 'Importando...' : 'Importar Contactos'}
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
                    <button
                      onClick={refreshSubscribers}
                      disabled={isRefreshing}
                      aria-label="Actualizar"
                      title="Actualizar"
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-300 ${
                        isRefreshing 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed animate-pulse' 
                          : 'bg-orange-100 text-orange-600 hover:bg-orange-200 hover:scale-105'
                      }`}
                    >
                        <RefreshCw 
                          className={`h-4 w-4 ${isRefreshing ? 'animate-spin-slow' : ''}`} 
                          style={isRefreshing ? { animation: 'spin 1s linear infinite' } : {}} />
                    </button>


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
                      onChange={(e) => setEditData('email', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                        editErrors.email ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="correo@ejemplo.com"
                      required
                    />
                    <p className="text-xs text-gray-500">Formato: usuario@dominio.com</p>
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
