import { Head } from '@inertiajs/react'
import AppSidebar from '~/components/AppSidebar'
import { useToast } from '~/hooks/useToast'
import ToastContainer from '~/components/ui/toast-container'
import { Mail, Eye, Trash2, RefreshCw, User, FileText, CheckCircle, XCircle, Clock, AlertCircle, Filter, X, Search } from 'lucide-react'
import { useState, useMemo } from 'react'

interface User {
  id: number
  fullName: string
  email: string
}

interface Contact {
  id: number
  email: string
  name: string
}

interface Template {
  id: number
  name: string
  subject: string
}

interface Sending {
  id: number
  contactId: number
  templateId: number | null
  sentAt: string | null
  sentSubject: string | null
  sentBody: string | null
  deliveryStatus: string
  messageId: string | null
  createdAt: string
  contact: Contact | null
  template: Template | null
}

interface EnviosProps {
  user: User
  sendings?: Sending[]
}

export default function Envios({ user, sendings = [] }: EnviosProps) {
  const { toasts, showSuccess, showError, removeToast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [currentSendings, setCurrentSendings] = useState<Sending[]>(sendings)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [viewingSending, setViewingSending] = useState<Sending | null>(null)
  const [sendingToDelete, setSendingToDelete] = useState<Sending | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false)
  const [isDeletingAll, setIsDeletingAll] = useState(false)
  
  // Estados para filtros
  const [filterContact, setFilterContact] = useState<string>('')
  const [filterTemplate, setFilterTemplate] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterDateFrom, setFilterDateFrom] = useState<string>('')
  const [filterDateTo, setFilterDateTo] = useState<string>('')

  // Función helper para obtener el token CSRF
  const getCsrfToken = () => {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
  }

  // Obtener listas únicas para los filtros
  const uniqueStatuses = useMemo(() => {
    const statuses = Array.from(
      new Set(currentSendings.map(s => s.deliveryStatus))
    ).sort()
    return statuses
  }, [currentSendings])

  // Filtrar envíos según todos los criterios
  const filteredSendings = useMemo(() => {
    return currentSendings.filter((sending) => {
      // Filtro de búsqueda general
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const matchesSearch = (
          sending.contact?.email.toLowerCase().includes(searchLower) ||
          sending.contact?.name.toLowerCase().includes(searchLower) ||
          sending.sentSubject?.toLowerCase().includes(searchLower) ||
          sending.deliveryStatus.toLowerCase().includes(searchLower) ||
          sending.template?.name.toLowerCase().includes(searchLower) ||
          sending.messageId?.toLowerCase().includes(searchLower)
        )
        if (!matchesSearch) return false
      }

      // Filtro por contacto (búsqueda por nombre o email)
      if (filterContact) {
        const contactSearch = filterContact.toLowerCase()
        const matchesContact = (
          sending.contact?.name.toLowerCase().includes(contactSearch) ||
          sending.contact?.email.toLowerCase().includes(contactSearch)
        )
        if (!matchesContact) return false
      }

      // Filtro por plantilla (búsqueda por nombre)
      if (filterTemplate) {
        const templateSearch = filterTemplate.toLowerCase()
        // Si busca "sin plantilla" o variaciones
        if (templateSearch.includes('sin') || templateSearch.includes('sin plantilla') || templateSearch.includes('sin-plantilla')) {
          if (sending.template !== null) return false
        } else {
          // Buscar por nombre de plantilla
          if (!sending.template || !sending.template.name.toLowerCase().includes(templateSearch)) {
            return false
          }
        }
      }

      // Filtro por estado
      if (filterStatus && sending.deliveryStatus !== filterStatus) {
        return false
      }

      // Filtro por fecha de envío
      if (filterDateFrom || filterDateTo) {
        if (!sending.sentAt) {
          // Si no tiene fecha de envío y hay filtros de fecha, excluir
          return false
        } else {
          // Normalizar la fecha de envío para comparar solo año, mes y día
          const sentDate = new Date(sending.sentAt)
          const sentDateOnly = new Date(sentDate.getFullYear(), sentDate.getMonth(), sentDate.getDate())
          
          // Si ambas fechas son iguales, buscar desde 00:00 hasta 23:59 del mismo día
          if (filterDateFrom && filterDateTo && filterDateFrom === filterDateTo) {
            // Crear fecha desde el string YYYY-MM-DD
            const [year, month, day] = filterDateFrom.split('-').map(Number)
            const targetDateOnly = new Date(year, month - 1, day)
            
            // Comparar solo las fechas (sin hora) - esto cubre todo el día desde 00:00 hasta 23:59
            if (sentDateOnly.getTime() !== targetDateOnly.getTime()) {
              return false
            }
          } else {
            // Lógica normal para rangos de fechas diferentes
            if (filterDateFrom) {
              const [year, month, day] = filterDateFrom.split('-').map(Number)
              const fromDate = new Date(year, month - 1, day, 0, 0, 0, 0)
              const fromDateOnly = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate())
              
              if (sentDateOnly < fromDateOnly) return false
            }

            if (filterDateTo) {
              const [year, month, day] = filterDateTo.split('-').map(Number)
              const toDate = new Date(year, month - 1, day, 23, 59, 59, 999)
              const toDateOnly = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate())
              
              if (sentDateOnly > toDateOnly) return false
            }
          }
        }
      }

      return true
    })
  }, [currentSendings, searchTerm, filterContact, filterTemplate, filterStatus, filterDateFrom, filterDateTo])

  // Función para limpiar todos los filtros
  const clearFilters = () => {
    setSearchTerm('')
    setFilterContact('')
    setFilterTemplate('')
    setFilterStatus('')
    setFilterDateFrom('')
    setFilterDateTo('')
  }

  // Verificar si hay filtros activos
  const hasActiveFilters = searchTerm || filterContact || filterTemplate || filterStatus || filterDateFrom || filterDateTo

  // Función para refrescar la lista de envíos
  const refreshSendings = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch('/sendings', {
        headers: {
          'Accept': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken()
        },
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setCurrentSendings(data.data.map((sending: any) => ({
            id: sending.id,
            contactId: sending.contactId,
            templateId: sending.templateId,
            sentAt: sending.sentAt,
            sentSubject: sending.sentSubject,
            sentBody: sending.sentBody,
            deliveryStatus: sending.deliveryStatus,
            messageId: sending.messageId,
            createdAt: sending.createdAt,
            contact: sending.contact,
            template: sending.template
          })))
          showSuccess('Lista de envíos actualizada correctamente')
        } else {
          showError('Error al actualizar la lista de envíos')
        }
      } else {
        // Si la respuesta no es OK, recargar la página
        window.location.reload()
      }
    } catch (error) {
      console.error('Error al actualizar envíos:', error)
      showError('Error de conexión al actualizar envíos')
    } finally {
      setIsRefreshing(false)
    }
  }

  // Función para ver detalles de un envío
  const handleView = (sending: Sending) => {
    setViewingSending(sending)
  }

  // Función para cerrar modal de vista
  const handleCloseView = () => {
    setViewingSending(null)
  }

  // Función para abrir confirmación de eliminación
  const handleDelete = (sending: Sending) => {
    setSendingToDelete(sending)
    setShowDeleteConfirm(true)
  }

  // Función para confirmar eliminación
  const confirmDelete = async () => {
    if (!sendingToDelete) return

    try {
      const response = await fetch(`/sendings/${sendingToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken()
        },
        credentials: 'include'
      })

      const result = await response.json()

      if (result.success) {
        setCurrentSendings(currentSendings.filter(s => s.id !== sendingToDelete.id))
        showSuccess('Envío eliminado exitosamente')
        setShowDeleteConfirm(false)
        setSendingToDelete(null)
      } else {
        showError(result.message || 'Error al eliminar el envío')
      }
    } catch (error) {
      console.error('Error al eliminar envío:', error)
      showError('Error de conexión al eliminar el envío')
    }
  }

  // Función para abrir confirmación de eliminar todo
  const handleDeleteAll = () => {
    if (currentSendings.length === 0) {
      showError('No hay envíos para eliminar')
      return
    }
    setShowDeleteAllConfirm(true)
  }

  // Función para confirmar eliminación de todos los envíos
  const confirmDeleteAll = async () => {
    if (currentSendings.length === 0) return

    setIsDeletingAll(true)
    let successCount = 0
    let errorCount = 0

    try {
      // Eliminar todos los envíos en paralelo (sin importar filtros)
      const deletePromises = currentSendings.map(async (sending) => {
        try {
          const response = await fetch(`/sendings/${sending.id}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'X-CSRF-TOKEN': getCsrfToken()
            },
            credentials: 'include'
          })

          const result = await response.json()
          if (result.success) {
            successCount++
            return true
          } else {
            errorCount++
            return false
          }
        } catch (error) {
          errorCount++
          return false
        }
      })

      await Promise.all(deletePromises)

      // Limpiar todos los envíos
      setCurrentSendings([])

      // Mostrar mensajes con toasts
      if (errorCount === 0) {
        showSuccess(`Se eliminaron exitosamente ${successCount} envío(s)`)
      } else {
        showError(`Se eliminaron ${successCount} envío(s), pero ${errorCount} fallaron`)
      }

      setShowDeleteAllConfirm(false)
    } catch (error) {
      console.error('Error al eliminar envíos:', error)
      showError('Error de conexión al eliminar los envíos')
    } finally {
      setIsDeletingAll(false)
    }
  }

  // Función para obtener el color del estado de entrega
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'sent':
      case 'delivered':
        return 'bg-green-100 text-green-800'
      case 'failed':
      case 'bounced':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Función para obtener el icono del estado
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'sent':
      case 'delivered':
        return <CheckCircle className="h-4 w-4" />
      case 'failed':
      case 'bounced':
        return <XCircle className="h-4 w-4" />
      case 'pending':
        return <Clock className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  // Función para formatear fecha
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <>
      <Head title="Envíos" />
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      <AppSidebar user={user} pageTitle="Envíos">
        <div className="space-y-6">
          {/* Header con acciones */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4">
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
                  onClick={refreshSendings}
                  disabled={isRefreshing}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Actualizar
                </button>
                <button
                  onClick={handleDeleteAll}
                  disabled={currentSendings.length === 0 || isDeletingAll}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  title="Eliminar todos los envíos (sin importar filtros)"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar Todo
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
                {/* Filtro por Contacto - Búsqueda */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Contacto
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre o email..."
                      value={filterContact}
                      onChange={(e) => setFilterContact(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                    />
                  </div>
                </div>

                {/* Filtro por Plantilla - Búsqueda */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Plantilla
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre de plantilla..."
                      value={filterTemplate}
                      onChange={(e) => setFilterTemplate(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                    />
                  </div>
                </div>

                {/* Filtro por Estado */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                  >
                    <option value="">Todos los estados</option>
                    {uniqueStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
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
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <div className="text-sm text-gray-600 mb-1">
                {hasActiveFilters ? 'Envíos Filtrados' : 'Total Envíos'}
              </div>
              <div className="text-2xl font-bold text-gray-900">{filteredSendings.length}</div>
              {hasActiveFilters && (
                <div className="text-xs text-gray-500 mt-1">
                  de {currentSendings.length} total
                </div>
              )}
            </div>
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <div className="text-sm text-gray-600 mb-1">Enviados</div>
              <div className="text-2xl font-bold text-green-600">
                {filteredSendings.filter(s => s.deliveryStatus.toLowerCase() === 'sent' || s.deliveryStatus.toLowerCase() === 'delivered').length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <div className="text-sm text-gray-600 mb-1">Pendientes</div>
              <div className="text-2xl font-bold text-yellow-600">
                {filteredSendings.filter(s => s.deliveryStatus.toLowerCase() === 'pending').length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <div className="text-sm text-gray-600 mb-1">Fallidos</div>
              <div className="text-2xl font-bold text-red-600">
                {filteredSendings.filter(s => s.deliveryStatus.toLowerCase() === 'failed' || s.deliveryStatus.toLowerCase() === 'bounced').length}
              </div>
            </div>
          </div>

          {/* Tabla de envíos */}
          <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contacto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Asunto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plantilla
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha Envío
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSendings.map((sending) => (
                    <tr key={sending.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {sending.contact?.name || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {sending.contact?.email || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate" title={sending.sentSubject || 'Sin asunto'}>
                          {sending.sentSubject || 'Sin asunto'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 text-gray-400 mr-2" />
                          <div className="text-sm text-gray-900">
                            {sending.template?.name || 'Sin plantilla'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(sending.deliveryStatus)}`}>
                          {getStatusIcon(sending.deliveryStatus)}
                          {sending.deliveryStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(sending.sentAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleView(sending)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="Ver detalles del envío"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(sending)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Eliminar envío"
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

            {filteredSendings.length === 0 && (
              <div className="text-center py-12">
                <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? 'No se encontraron envíos' : 'No hay envíos registrados'}
                </h3>
                <p className="text-gray-600">
                  {searchTerm
                    ? 'Intenta con otro término de búsqueda'
                    : 'Los envíos aparecerán aquí cuando se procesen las campanas'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal de Vista */}
        {viewingSending && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900">Detalles del Envío</h2>
                  <button
                    onClick={handleCloseView}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ID</label>
                    <div className="text-sm text-gray-900">{viewingSending.id}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(viewingSending.deliveryStatus)}`}>
                      {getStatusIcon(viewingSending.deliveryStatus)}
                      {viewingSending.deliveryStatus}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contacto</label>
                    <div className="text-sm text-gray-900">
                      {viewingSending.contact?.name || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {viewingSending.contact?.email || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Plantilla</label>
                    <div className="text-sm text-gray-900">
                      {viewingSending.template?.name || 'Sin plantilla'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Asunto</label>
                    <div className="text-sm text-gray-900">
                      {viewingSending.sentSubject || 'Sin asunto'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message ID</label>
                    <div className="text-sm text-gray-900 font-mono text-xs">
                      {viewingSending.messageId || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Envío</label>
                    <div className="text-sm text-gray-900">
                      {formatDate(viewingSending.sentAt)}
                    </div>
                  </div>
                </div>
                {viewingSending.sentBody && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contenido del Email</label>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
                      <div
                        className="text-sm text-gray-700 prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: viewingSending.sentBody }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end">
                <button
                  onClick={handleCloseView}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmación de Eliminación */}
        {showDeleteConfirm && sendingToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">¿Eliminar envío?</h2>
                <p className="text-gray-600 mb-6">
                  Esta acción no se puede deshacer. Se eliminará permanentemente el registro del envío
                  {sendingToDelete.contact && ` a ${sendingToDelete.contact.email}`}.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false)
                      setSendingToDelete(null)
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmación de Eliminar Todo */}
        {showDeleteAllConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">¿Eliminar todos los envíos?</h2>
                <p className="text-gray-600 mb-6">
                  Esta acción no se puede deshacer. Se eliminarán permanentemente{' '}
                  <strong className="text-red-600">{currentSendings.length}</strong> envío(s) en total.
                  {hasActiveFilters && (
                    <span className="block mt-2 text-sm text-orange-600 font-medium">
                      ⚠️ Se eliminarán TODOS los envíos, sin importar los filtros aplicados.
                    </span>
                  )}
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowDeleteAllConfirm(false)}
                    disabled={isDeletingAll}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmDeleteAll}
                    disabled={isDeletingAll}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isDeletingAll && (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    )}
                    {isDeletingAll ? 'Eliminando...' : 'Eliminar Todo'}
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

