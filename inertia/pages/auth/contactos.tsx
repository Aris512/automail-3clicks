import { Head, useForm } from '@inertiajs/react'
import { validateEmail } from '../../lib/validations'
import { useToast } from '~/hooks/useToast'
import ToastContainer from '~/components/ui/toast-container'
import AppSidebar from '~/components/AppSidebar'
import { Users, Plus, Upload, Search, Edit, Trash2, Mail, Calendar, RefreshCw, FileText, AlertCircle, List, Folder, Eye, Link2, Copy, ExternalLink, Clock } from 'lucide-react'
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
  lists?: ListItem[]
}

interface ListItem {
  id: number
  name: string
  slug: string
  description?: string
  status: 'active' | 'inactive' | 'archived'
  createdAt: string
}

interface ContactForm {
  id: number
  name: string
  uniqueId: string
  fields: {
    nombre?: boolean
    email: boolean
    telefono?: boolean
    descripcion?: boolean
  }
  listId: number | null
  list?: ListItem | null
  expiresAt: string
  active: boolean
  createdAt: string
  updatedAt: string
}

interface ContactosProps {
  user: User
  subscribers?: Subscriber[]
  lists?: ListItem[]
  flash?: {
    success?: string
    error?: string
  }
}

export default function Contactos({ user, subscribers = [], lists = [], flash }: ContactosProps) {
  const { toasts, showError, removeToast } = useToast()
  const [activeTab, setActiveTab] = useState<'manual' | 'import' | 'lists' | 'forms'>('manual')
  const [searchTerm, setSearchTerm] = useState('')
  const [listSearchTerm, setListSearchTerm] = useState('')
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null)
  const [editingSubscriber, setEditingSubscriber] = useState<Subscriber | null>(null)
  const [viewingSubscriber, setViewingSubscriber] = useState<Subscriber | null>(null)
  const [viewingList, setViewingList] = useState<ListItem | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{show: boolean, subscriber: Subscriber | null}>({show: false, subscriber: null})
  const [currentSubscribers, setCurrentSubscribers] = useState<Subscriber[]>(subscribers)
  const [currentLists, setCurrentLists] = useState<ListItem[]>(lists)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isRefreshingLists, setIsRefreshingLists] = useState(false)
  
  // Estados para importación
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const [importSelectedListIds, setImportSelectedListIds] = useState<number[]>([])
  const [showImportConfirm, setShowImportConfirm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estados para agregar contactos manualmente
  const [manualContacts, setManualContacts] = useState<Array<{
    id: string
    name: string
    email: string
    description: string
    status: 'active' | 'inactive' | 'archived'
    listIds: number[]
  }>>([{
    id: '1',
    name: '',
    email: '',
    description: '',
    status: 'active',
    listIds: []
  }])
  const [isSavingManual, setIsSavingManual] = useState(false)
  const [editSelectedListIds, setEditSelectedListIds] = useState<number[]>([])

  // Estados para gestión de listas
  const [editingList, setEditingList] = useState<ListItem | null>(null)
  const [showDeleteListConfirm, setShowDeleteListConfirm] = useState<{show: boolean, list: ListItem | null}>({show: false, list: null})
  const [isSavingList, setIsSavingList] = useState(false)
  const [showCreateListForm, setShowCreateListForm] = useState(false)

  // Estados para formularios públicos
  const [forms, setForms] = useState<ContactForm[]>([])
  const [isLoadingForms, setIsLoadingForms] = useState(false)
  const [showCreateFormModal, setShowCreateFormModal] = useState(false)
  const [editingForm, setEditingForm] = useState<ContactForm | null>(null)
  const [showDeleteFormConfirm, setShowDeleteFormConfirm] = useState<{show: boolean, form: ContactForm | null}>({show: false, form: null})
  const [isSavingForm, setIsSavingForm] = useState(false)
  const { data: formData, setData: setFormData, errors: formErrors, reset: resetForm } = useForm({
    name: '',
    fields: {
      nombre: true,
      email: true,
      telefono: false,
      descripcion: false
    },
    listId: null as number | null,
    durationDays: 7
  })

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
        setTimeout(() => setNotification(null), 10000)
      }
    } catch (error) {
      console.error('Error al actualizar contactos:', error)
      setNotification({ type: 'error', message: 'Error de conexión al actualizar contactos' })
      setTimeout(() => setNotification(null), 10000)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Función para actualizar la lista de listas
  const refreshLists = async () => {
    setIsRefreshingLists(true)
    try {
      const response = await fetch('/lists')
      const result = await response.json()
      
      if (result.success) {
        setCurrentLists(result.data)
        setNotification({ type: 'success', message: 'Lista de listas actualizada correctamente' })
        setTimeout(() => setNotification(null), 3000)
      } else {
        setNotification({ type: 'error', message: 'Error al actualizar la lista de listas' })
        setTimeout(() => setNotification(null), 10000)
      }
    } catch (error) {
      console.error('Error al actualizar listas:', error)
      setNotification({ type: 'error', message: 'Error de conexión al actualizar listas' })
      setTimeout(() => setNotification(null), 10000)
    } finally {
      setIsRefreshingLists(false)
    }
  }

  // Formulario para editar contacto
  const { data: editData, setData: setEditData, processing: editProcessing, errors: editErrors, reset: resetEdit } = useForm({
    name: '',
    email: '',
    description: '',
    status: 'active'
  })

  // Formulario para crear/editar lista
  const { data: listData, setData: setListData, errors: listErrors, reset: resetList } = useForm({
    name: '',
    description: '',
    status: 'active'
  })

  // Función para abrir modal de vista
  const handleView = (subscriber: Subscriber) => {
    setViewingSubscriber(subscriber)
  }

  // Función para cerrar modal de vista
  const handleCloseView = () => {
    setViewingSubscriber(null)
  }

  // Función para abrir modal de visualización de lista
  const handleViewList = (list: ListItem) => {
    setViewingList(list)
  }

  // Función para cerrar modal de visualización de lista
  const handleCloseListView = () => {
    setViewingList(null)
  }

  // Función para redirigir al tab de listas
  const handleCreateNewList = () => {
    setActiveTab('lists')
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
    // Cargar todas las listas del contacto
    const listIds = subscriber.lists ? subscriber.lists.map(list => list.id) : []
    setEditSelectedListIds(listIds)
  }

  // Función para cerrar modal de edición
  const handleCloseEdit = () => {
    setEditingSubscriber(null)
    resetEdit()
    setEditSelectedListIds([])
  }

  const toggleEditListSelection = (listId: number) => {
    const isSelected = editSelectedListIds.includes(listId)
    
    if (isSelected) {
      // Remover la lista si ya está seleccionada
      setEditSelectedListIds(editSelectedListIds.filter(id => id !== listId))
    } else {
      // Agregar la lista si no está seleccionada
      setEditSelectedListIds([...editSelectedListIds, listId])
    }
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
        body: JSON.stringify({
          ...editData,
          listIds: editSelectedListIds
        })
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
                    status: editData.status as 'active' | 'inactive' | 'archived',
                    lists: editSelectedListIds.length > 0 ? 
                      currentLists.filter(list => editSelectedListIds.includes(list.id)) : 
                      []
                  }
                : subscriber
            )
          )
          
          setNotification({ type: 'success', message: '¡Contacto actualizado correctamente!' })
          setTimeout(() => setNotification(null), 3000)
        } else {
          setNotification({ type: 'error', message: result.message || 'Error al actualizar contacto' })
          setTimeout(() => setNotification(null), 10000)
        }
      })
      .catch(error => {
        console.error('Error al actualizar contacto:', error)
        setNotification({ type: 'error', message: 'Error de conexión al actualizar contacto' })
        setTimeout(() => setNotification(null), 10000)
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
          setTimeout(() => setNotification(null), 10000)
        }
      })
      .catch(error => {
        console.error('Error al eliminar contacto:', error)
        setNotification({ type: 'error', message: 'Error de conexión al eliminar contacto' })
        setTimeout(() => setNotification(null), 10000)
      })
    }
  }

  // Función para cancelar borrado
  const cancelDelete = () => {
    setShowDeleteConfirm({show: false, subscriber: null})
  }

  // Funciones para manejo de archivos
  const toggleImportListSelection = (listId: number) => {
    const isSelected = importSelectedListIds.includes(listId)
    
    if (isSelected) {
      // Remover la lista si ya está seleccionada
      setImportSelectedListIds(importSelectedListIds.filter(id => id !== listId))
    } else {
      // Agregar la lista si no está seleccionada
      setImportSelectedListIds([...importSelectedListIds, listId])
    }
  }

  const handleFileSelect = (file: File) => {
    // Validar tipo de archivo
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
    const allowedExtensions = ['.csv', '.xls', '.xlsx']
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      setNotification({ type: 'error', message: 'Formato de archivo no válido. Solo se permiten archivos CSV, XLS y XLSX' })
      setTimeout(() => setNotification(null), 10000)
      return
    }

    // Validar tamaño (15MB máximo)
    const maxSize = 15 * 1024 * 1024 // 15MB
    if (file.size > maxSize) {
      setNotification({ type: 'error', message: 'El archivo excede el tamaño máximo permitido de 15MB' })
      setTimeout(() => setNotification(null), 10000)
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
      setTimeout(() => setNotification(null), 10000)
      return
    }

    // Verificar si se han seleccionado listas
    if (importSelectedListIds.length === 0) {
      setShowImportConfirm(true)
      return
    }

    // Proceder con la importación
    await performImport()
  }

  const performImport = async () => {
    setIsUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      if (selectedFile) {
        formData.append('file', selectedFile)
      }
      formData.append('listIds', JSON.stringify(importSelectedListIds))

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
        // Construir mensaje detallado basado en la respuesta
        let successMessage = result.message
        
        // Si hay emails omitidos, mostrar información adicional
        if (result.skipped > 0) {
          successMessage += `\n\nEmails omitidos (${result.skipped}): ${result.skippedEmails.join(', ')}`
        }
        
        // Si hay emails importados, mostrarlos también
        if (result.importedEmails && result.importedEmails.length > 0) {
          successMessage += `\n\nEmails importados (${result.imported}): ${result.importedEmails.join(', ')}`
        }
        
        setNotification({ 
          type: 'success', 
          message: successMessage
        })
        
        // Limpiar archivo seleccionado y listas
        setSelectedFile(null)
        setImportSelectedListIds([])
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        
        // Actualizar la lista de contactos
        await refreshSubscribers()
        
        // Mensajes de éxito duran más tiempo cuando hay información detallada
        const timeoutDuration = result.skipped > 0 ? 15000 : 5000
        setTimeout(() => setNotification(null), timeoutDuration)
      } else {
        setNotification({ 
          type: 'error', 
          message: result.message || 'Error al importar el archivo' 
        })
        setTimeout(() => setNotification(null), 10000)
      }
    } catch (error) {
      console.error('Error al importar archivo:', error)
      setNotification({ 
        type: 'error', 
        message: 'Error de conexión al importar el archivo' 
      })
      setTimeout(() => setNotification(null), 10000)
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const clearSelectedFile = () => {
    setSelectedFile(null)
    setImportSelectedListIds([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const confirmImportWithoutLists = async () => {
    setShowImportConfirm(false)
    await performImport()
  }

  const cancelImportWithoutLists = () => {
    setShowImportConfirm(false)
  }

  // Funciones para manejo de contactos manuales
  const addManualContact = () => {
    const newId = (manualContacts.length + 1).toString()
    setManualContacts([...manualContacts, {
      id: newId,
      name: '',
      email: '',
      description: '',
      status: 'active',
      listIds: []
    }])
  }

  const removeManualContact = (id: string) => {
    if (manualContacts.length > 1) {
      setManualContacts(manualContacts.filter(contact => contact.id !== id))
    }
  }

  const updateManualContact = (id: string, field: string, value: string | number | number[]) => {
    setManualContacts(manualContacts.map(contact => 
      contact.id === id ? { ...contact, [field]: value } : contact
    ))
  }

  const clearManualContacts = () => {
    setManualContacts([{
      id: '1',
      name: '',
      email: '',
      description: '',
      status: 'active',
      listIds: []
    }])
  }

  const toggleListSelection = (contactId: string, listId: number) => {
    setManualContacts(manualContacts.map(contact => {
      if (contact.id === contactId) {
        const currentListIds = contact.listIds
        const isSelected = currentListIds.includes(listId)
        
        if (isSelected) {
          // Remover la lista si ya está seleccionada
          return { ...contact, listIds: currentListIds.filter(id => id !== listId) }
        } else {
          // Agregar la lista si no está seleccionada
          return { ...contact, listIds: [...currentListIds, listId] }
        }
      }
      return contact
    }))
  }

  const handleManualSubmit = async () => {
    // Validar que todos los contactos tengan email
    const validContacts = manualContacts.filter(contact => 
      contact.email.trim() && contact.name.trim()
    )

    if (validContacts.length === 0) {
      setNotification({ 
        type: 'error', 
        message: 'Por favor completa al menos un contacto con nombre y email' 
      })
      setTimeout(() => setNotification(null), 10000)
      return
    }

    // Validar emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const invalidEmails = validContacts.filter(contact => !emailRegex.test(contact.email))
    
    if (invalidEmails.length > 0) {
      setNotification({ 
        type: 'error', 
        message: `Se encontraron ${invalidEmails.length} emails con formato inválido: ${invalidEmails.map(c => c.email).join(', ')}` 
      })
      setTimeout(() => setNotification(null), 10000)
      return
    }

    setIsSavingManual(true)

    try {
      const response = await fetch('/subscribers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
        body: JSON.stringify({ 
          contacts: validContacts.map(contact => ({
            name: contact.name,
            email: contact.email,
            description: contact.description,
            status: contact.status,
            listIds: contact.listIds
          }))
        })
      })

      const result = await response.json()

      if (result.success) {
        // Construir mensaje detallado basado en la respuesta
        let successMessage = result.message
        
        // Si hay emails omitidos, mostrar información adicional
        if (result.skipped > 0) {
          successMessage += `\n\nEmails omitidos (${result.skipped}): ${result.skippedEmails.join(', ')}`
        }
        
        // Si hay emails importados, mostrarlos también
        if (result.importedEmails && result.importedEmails.length > 0) {
          successMessage += `\n\nEmails agregados (${result.imported}): ${result.importedEmails.join(', ')}`
        }
        
        setNotification({ 
          type: 'success', 
          message: successMessage
        })
        
        // Limpiar formulario
        clearManualContacts()
        
        // Actualizar la lista de contactos
        await refreshSubscribers()
        
        // Mensajes de éxito duran más tiempo cuando hay información detallada
        const timeoutDuration = result.skipped > 0 ? 15000 : 5000
        setTimeout(() => setNotification(null), timeoutDuration)
      } else {
        // Manejar errores específicos de duplicados
        let errorMessage = result.message || 'Error al agregar contactos'
        
        // Si hay información específica de emails duplicados, mostrarla
        if (result.duplicateEmail) {
          errorMessage = `${result.duplicateEmail} ya está en la lista de contactos`
        } else if (result.duplicateEmails && result.duplicateEmails.length > 0) {
          errorMessage = `Los siguientes emails ya están en la lista de contactos: ${result.duplicateEmails.join(', ')}`
        }
        
        setNotification({ 
          type: 'error', 
          message: errorMessage
        })
        setTimeout(() => setNotification(null), 10000)
      }
    } catch (error) {
      console.error('Error al agregar contactos:', error)
      setNotification({ 
        type: 'error', 
        message: 'Error de conexión al agregar contactos' 
      })
      setTimeout(() => setNotification(null), 10000)
    } finally {
      setIsSavingManual(false)
    }
  }

  // Funciones para gestión de listas
  const handleCreateList = () => {
    setShowCreateListForm(true)
    resetList()
  }

  const handleEditList = (list: ListItem) => {
    setEditingList(list)
    setListData({
      name: list.name,
      description: list.description || '',
      status: list.status
    })
  }

  const handleCloseListForm = () => {
    setShowCreateListForm(false)
    setEditingList(null)
    resetList()
  }

  const handleListSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!listData.name.trim()) {
      setNotification({ type: 'error', message: 'El nombre de la lista es requerido' })
      setTimeout(() => setNotification(null), 5000)
      return
    }

    setIsSavingList(true)

    try {
      const url = editingList ? `/lists/${editingList.id}` : '/lists'
      const method = editingList ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
        body: JSON.stringify(listData)
      })

      const result = await response.json()

      if (result.success) {
        handleCloseListForm()
        await refreshLists()
        setNotification({ 
          type: 'success', 
          message: editingList ? 'Lista actualizada correctamente' : 'Lista creada correctamente'
        })
        setTimeout(() => setNotification(null), 3000)
      } else {
        setNotification({ type: 'error', message: result.message || 'Error al procesar la lista' })
        setTimeout(() => setNotification(null), 10000)
      }
    } catch (error) {
      console.error('Error al procesar lista:', error)
      setNotification({ type: 'error', message: 'Error de conexión al procesar la lista' })
      setTimeout(() => setNotification(null), 10000)
    } finally {
      setIsSavingList(false)
    }
  }

  const handleDeleteList = (list: ListItem) => {
    setShowDeleteListConfirm({show: true, list})
  }

  const confirmDeleteList = async () => {
    if (showDeleteListConfirm.list) {
      try {
        const response = await fetch(`/lists/${showDeleteListConfirm.list.id}`, {
          method: 'DELETE',
          headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
          }
        })

        const result = await response.json()

        if (result.success) {
          setShowDeleteListConfirm({show: false, list: null})
          await refreshLists()
          setNotification({ type: 'success', message: 'Lista eliminada correctamente' })
          setTimeout(() => setNotification(null), 3000)
        } else {
          setNotification({ type: 'error', message: result.message || 'Error al eliminar la lista' })
          setTimeout(() => setNotification(null), 10000)
        }
      } catch (error) {
        console.error('Error al eliminar lista:', error)
        setNotification({ type: 'error', message: 'Error de conexión al eliminar la lista' })
        setTimeout(() => setNotification(null), 10000)
      }
    }
  }

  const cancelDeleteList = () => {
    setShowDeleteListConfirm({show: false, list: null})
  }

  // Funciones para formularios públicos
  const loadForms = async () => {
    setIsLoadingForms(true)
    try {
      const response = await fetch('/formularios')
      const result = await response.json()
      if (result.success) {
        setForms(result.data)
      } else {
        setNotification({ type: 'error', message: 'Error al cargar formularios' })
        setTimeout(() => setNotification(null), 5000)
      }
    } catch (error) {
      console.error('Error al cargar formularios:', error)
      setNotification({ type: 'error', message: 'Error de conexión al cargar formularios' })
      setTimeout(() => setNotification(null), 5000)
    } finally {
      setIsLoadingForms(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'forms') {
      loadForms()
    }
  }, [activeTab])

  const handleCreateForm = () => {
    setEditingForm(null)
    resetForm()
    setFormData({
      name: '',
      fields: {
        nombre: true,
        email: true,
        telefono: false,
        descripcion: false
      },
      listId: null,
      durationDays: 7
    })
    setShowCreateFormModal(true)
  }

  const handleEditForm = (form: ContactForm) => {
    setEditingForm(form)
    setFormData({
      name: form.name,
      fields: {
        nombre: form.fields.nombre ?? false,
        email: form.fields.email ?? true,
        telefono: form.fields.telefono ?? false,
        descripcion: form.fields.descripcion ?? false
      },
      listId: form.listId,
      durationDays: 7 // No se puede cambiar la duración de un formulario existente
    })
    setShowCreateFormModal(true)
  }

  const handleCloseFormModal = () => {
    setShowCreateFormModal(false)
    setEditingForm(null)
    resetForm()
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingForm(true)
    try {
      const url = editingForm ? `/formularios/${editingForm.id}` : '/api/formularios/crear'
      const method = editingForm ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()
      
      if (result.success) {
        setNotification({ 
          type: 'success', 
          message: editingForm ? 'Formulario actualizado correctamente' : 'Formulario creado correctamente'
        })
        setTimeout(() => setNotification(null), 3000)
        handleCloseFormModal()
        await loadForms()
      } else {
        setNotification({ type: 'error', message: result.message || 'Error al guardar el formulario' })
        setTimeout(() => setNotification(null), 10000)
      }
    } catch (error) {
      console.error('Error al guardar formulario:', error)
      setNotification({ type: 'error', message: 'Error de conexión al guardar el formulario' })
      setTimeout(() => setNotification(null), 10000)
    } finally {
      setIsSavingForm(false)
    }
  }

  const handleDeleteForm = async () => {
    if (!showDeleteFormConfirm.form) return
    
    try {
      const response = await fetch(`/formularios/${showDeleteFormConfirm.form.id}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        }
      })

      const result = await response.json()
      
      if (result.success) {
        setNotification({ type: 'success', message: 'Formulario eliminado correctamente' })
        setTimeout(() => setNotification(null), 3000)
        setShowDeleteFormConfirm({show: false, form: null})
        await loadForms()
      } else {
        setNotification({ type: 'error', message: result.message || 'Error al eliminar el formulario' })
        setTimeout(() => setNotification(null), 10000)
      }
    } catch (error) {
      console.error('Error al eliminar formulario:', error)
      setNotification({ type: 'error', message: 'Error de conexión al eliminar el formulario' })
      setTimeout(() => setNotification(null), 10000)
    }
  }

  const copyFormLink = (uniqueId: string) => {
    const link = `${window.location.origin}/form/${uniqueId}`
    navigator.clipboard.writeText(link).then(() => {
      setNotification({ type: 'success', message: 'Link copiado al portapapeles' })
      setTimeout(() => setNotification(null), 3000)
    }).catch(() => {
      setNotification({ type: 'error', message: 'Error al copiar el link' })
      setTimeout(() => setNotification(null), 5000)
    })
  }

  const toggleFormActive = async (form: ContactForm) => {
    try {
      const response = await fetch(`/formularios/${form.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
        body: JSON.stringify({ active: !form.active })
      })

      const result = await response.json()
      
      if (result.success) {
        setNotification({ 
          type: 'success', 
          message: form.active ? 'Formulario desactivado' : 'Formulario activado'
        })
        setTimeout(() => setNotification(null), 3000)
        await loadForms()
      } else {
        setNotification({ type: 'error', message: result.message || 'Error al actualizar el formulario' })
        setTimeout(() => setNotification(null), 10000)
      }
    } catch (error) {
      console.error('Error al actualizar formulario:', error)
      setNotification({ type: 'error', message: 'Error de conexión al actualizar el formulario' })
      setTimeout(() => setNotification(null), 10000)
    }
  }

  const filteredSubscribers = currentSubscribers.filter(subscriber =>
    subscriber.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subscriber.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (subscriber.description && subscriber.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const filteredLists = currentLists.filter(list =>
    list.name.toLowerCase().includes(listSearchTerm.toLowerCase()) ||
    (list.description && list.description.toLowerCase().includes(listSearchTerm.toLowerCase()))
  )

  return (
    <>
      <Head title="Contactos" />
      
      <AppSidebar user={user} pageTitle="Contactos">
        {/* Toasts */}
        <ToastContainer toasts={toasts} onClose={removeToast} />
        {/* Notificación */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-md ${
            notification.type === 'success' 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}>
            <div className="flex items-start space-x-2">
              <div className="flex-1">
                <div className="whitespace-pre-line text-sm">
                  {notification.message}
                </div>
              </div>
              <button
                onClick={() => setNotification(null)}
                className="ml-2 text-white hover:text-gray-200 flex-shrink-0"
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
                <button
                  onClick={() => setActiveTab('lists')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'lists'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <List className="h-4 w-4" />
                    <span>Listas</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('forms')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'forms'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Link2 className="h-4 w-4" />
                    <span>Formularios Públicos</span>
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
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Agregar Contactos Manualmente</h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={addManualContact}
                        className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                      >
                        <Plus className="h-4 w-4 inline mr-1" />
                        Agregar Fila
                      </button>
                      <button
                        onClick={clearManualContacts}
                        className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        Limpiar Todo
                      </button>
                    </div>
                  </div>


                  {/* Tabla de contactos */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Nombre *
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email *
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Descripción
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Estado
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Lista
                          </th>
                          <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {manualContacts.map((contact) => (
                          <tr key={contact.id} className="hover:bg-gray-50">
                            <td className="px-3 py-3">
                              <input
                                type="text"
                                value={contact.name}
                                onChange={(e) => updateManualContact(contact.id, 'name', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                                placeholder="Nombre completo"
                              />
                            </td>
                            <td className="px-3 py-3">
                              <input
                                type="email"
                                value={contact.email}
                                onChange={(e) => updateManualContact(contact.id, 'email', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                                placeholder="correo@ejemplo.com"
                              />
                            </td>
                            <td className="px-3 py-3">
                              <input
                                type="text"
                                value={contact.description}
                                onChange={(e) => updateManualContact(contact.id, 'description', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                                placeholder="Descripción opcional"
                              />
                            </td>
                            <td className="px-3 py-3">
                              <select
                                value={contact.status}
                                onChange={(e) => updateManualContact(contact.id, 'status', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                              >
                                <option value="active">Activo</option>
                                <option value="inactive">Inactivo</option>
                                <option value="archived">Archivado</option>
                              </select>
                            </td>
                            <td className="px-3 py-3">
                              <div className="relative">
                                <div className="text-xs text-gray-500 mb-2 font-medium">Listas</div>
                                <div className="border border-gray-200 rounded-lg bg-white">
                                  <div className="max-h-24 overflow-y-auto p-2">
                                    {currentLists.length > 0 ? (
                                      <div className="space-y-1">
                                        {currentLists.map((list) => (
                                          <label key={list.id} className="flex items-center space-x-2 text-xs cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors">
                                            <input
                                              type="checkbox"
                                              checked={contact.listIds.includes(list.id)}
                                              onChange={() => toggleListSelection(contact.id, list.id)}
                                              className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 w-3 h-3"
                                            />
                                            <span className="text-gray-700 truncate">{list.name}</span>
                                          </label>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-xs text-gray-400 italic text-center py-2">Sin listas</div>
                                    )}
                                  </div>
                                  <div className="border-t border-gray-100 px-2 py-1">
                                    <button
                                      type="button"
                                      onClick={handleCreateNewList}
                                      className="text-xs text-orange-600 hover:text-orange-700 font-medium transition-colors"
                                    >
                                      ➕ Nueva lista
                                    </button>
                                  </div>
                                </div>
                                {contact.listIds.length > 0 && (
                                  <div className="mt-1 text-xs text-gray-500">
                                    {contact.listIds.length} lista{contact.listIds.length !== 1 ? 's' : ''} seleccionada{contact.listIds.length !== 1 ? 's' : ''}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <button
                                onClick={() => removeManualContact(contact.id)}
                                disabled={manualContacts.length === 1}
                                className={`text-red-600 hover:text-red-800 ${
                                  manualContacts.length === 1 ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                                title={manualContacts.length === 1 ? 'Debe haber al menos una fila' : 'Eliminar fila'}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                    <button
                      onClick={clearManualContacts}
                      disabled={isSavingManual}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Limpiar Todo
                    </button>
                    <button
                      onClick={handleManualSubmit}
                      disabled={isSavingManual}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        isSavingManual 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-orange-500 hover:bg-orange-600'
                      } text-white`}
                    >
                      {isSavingManual ? 'Guardando...' : `Agregar Contactos`}
                    </button>
                  </div>

                  {/* Información adicional */}
                  <div className="mt-4 text-xs text-gray-500">
                    <p>• Los campos marcados con * son obligatorios</p>
                    <p>• Puedes agregar múltiples filas usando el botón "Agregar Fila"</p>
                    <p>• Cada contacto puede ser asignado a múltiples listas usando los checkboxes</p>
                    <p>• Se validarán los emails antes de guardar</p>
                    <p>• Los emails duplicados se omitirán automáticamente</p>
                  </div>
                </div>
              </div>
            )}

            {/* Import Tab */}
            {activeTab === 'import' && (
              <div className="space-y-6">
                {/* Selector de listas para importación */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Asignar a Listas</h4>
                  <div className="space-y-3">
                    <div className="text-xs text-gray-600 mb-2">
                      Selecciona las listas a las que se asignarán los contactos importados:
                    </div>
                    <div className="border border-gray-200 rounded-lg bg-white">
                      <div className="max-h-32 overflow-y-auto p-3">
                        {currentLists.length > 0 ? (
                          <div className="space-y-2">
                            {currentLists.map((list) => (
                              <label key={list.id} className="flex items-center space-x-3 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                                <input
                                  type="checkbox"
                                  checked={importSelectedListIds.includes(list.id)}
                                  onChange={() => toggleImportListSelection(list.id)}
                                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                />
                                <div className="flex-1">
                                  <span className="text-gray-900 font-medium">{list.name}</span>
                                  {list.description && (
                                    <p className="text-xs text-gray-500 mt-1">{list.description}</p>
                                  )}
                                </div>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <div className="text-gray-400 mb-2">
                              <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <p className="text-sm text-gray-500 mb-2">No hay listas disponibles</p>
                            <button
                              type="button"
                              onClick={handleCreateNewList}
                              className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                            >
                              Crear primera lista
                            </button>
                          </div>
                        )}
                      </div>
                      {currentLists.length > 0 && (
                        <div className="border-t border-gray-100 px-3 py-2 bg-gray-50 rounded-b-lg">
                          <button
                            type="button"
                            onClick={handleCreateNewList}
                            className="text-sm text-orange-600 hover:text-orange-700 font-medium transition-colors"
                          >
                            ➕ Crear nueva lista
                          </button>
                        </div>
                      )}
                    </div>
                    {importSelectedListIds.length > 0 && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">{importSelectedListIds.length}</span> lista{importSelectedListIds.length !== 1 ? 's' : ''} seleccionada{importSelectedListIds.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>

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

            {/* Lists Tab */}
            {activeTab === 'lists' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Gestionar Listas</h3>
                    <button
                      onClick={handleCreateList}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm flex items-center space-x-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Crear Lista</span>
                    </button>
                  </div>

                  <div className="text-sm text-gray-600 mb-4">
                    <p>• Las listas te permiten organizar tus contactos en grupos específicos</p>
                    <p>• Puedes crear múltiples listas para diferentes campañas o segmentos</p>
                    <p>• Cada lista puede tener su propio estado (activa, inactiva, archivada)</p>
                  </div>
                </div>

                {/* Lists Table */}
                <div className="bg-white rounded-lg shadow-sm border">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Mis Listas</h3>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={refreshLists}
                          disabled={isRefreshingLists}
                          aria-label="Actualizar listas"
                          title="Actualizar listas"
                          className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-300 ${
                            isRefreshingLists 
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed animate-pulse' 
                              : 'bg-orange-100 text-orange-600 hover:bg-orange-200 hover:scale-105'
                          }`}
                        >
                          <RefreshCw 
                            className={`h-4 w-4 ${isRefreshingLists ? 'animate-spin-slow' : ''}`} 
                            style={isRefreshingLists ? { animation: 'spin 1s linear infinite' } : {}} />
                        </button>

                        <div className="relative">
                          <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Buscar listas..."
                            value={listSearchTerm}
                            onChange={(e) => setListSearchTerm(e.target.value)}
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
                            Lista
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
                        {filteredLists.map((list) => (
                          <tr key={list.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                  <Folder className="h-5 w-5 text-blue-600" />
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {list.name}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                list.status === 'active' 
                                  ? 'bg-green-100 text-green-800' 
                                  : list.status === 'inactive'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {list.status === 'active' ? 'Activa' : 
                                 list.status === 'inactive' ? 'Inactiva' : 'Archivada'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center text-sm text-gray-900">
                                <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                                {new Date(list.createdAt).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end space-x-2">
                                <button 
                                  onClick={() => handleViewList(list)}
                                  className="text-blue-600 hover:text-blue-900"
                                  title="Ver detalles de la lista"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button 
                                  onClick={() => handleEditList(list)}
                                  className="text-orange-600 hover:text-orange-900"
                                  title="Editar lista"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteList(list)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Eliminar lista"
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
                  
                  {filteredLists.length === 0 && (
                    <div className="text-center py-12">
                      <List className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No hay listas</h3>
                      <p className="text-gray-600 mb-4">Comienza creando tu primera lista para organizar tus contactos.</p>
                      <button
                        onClick={handleCreateList}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                      >
                        Crear Primera Lista
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Forms Tab */}
            {activeTab === 'forms' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Formularios Públicos</h3>
                    <button
                      onClick={handleCreateForm}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm flex items-center space-x-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Crear Formulario</span>
                    </button>
                  </div>

                  <div className="text-sm text-gray-600 mb-4">
                    <p>• Crea formularios públicos con duración limitada (máximo 7 días)</p>
                    <p>• Personaliza los campos que quieres capturar (nombre, email, teléfono, descripción)</p>
                    <p>• Comparte el link único con quien quieras para que llenen el formulario</p>
                    <p>• Los contactos se agregarán automáticamente a tu base de datos</p>
                  </div>
                </div>

                {/* Forms Table */}
                <div className="bg-white rounded-lg shadow-sm border">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h4 className="text-md font-semibold text-gray-900">Formularios Creados</h4>
                      {isLoadingForms && (
                        <RefreshCw className="h-4 w-4 text-gray-400 animate-spin" />
                      )}
                    </div>
                  </div>

                  {isLoadingForms ? (
                    <div className="text-center py-12">
                      <RefreshCw className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-spin" />
                      <p className="text-gray-600">Cargando formularios...</p>
                    </div>
                  ) : forms.length === 0 ? (
                    <div className="text-center py-12">
                      <Link2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No hay formularios</h3>
                      <p className="text-gray-600 mb-4">Comienza creando tu primer formulario público para capturar contactos.</p>
                      <button
                        onClick={handleCreateForm}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                      >
                        Crear Primer Formulario
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Nombre
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Campos
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Lista
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Expira
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Estado
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Acciones
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {forms.map((form) => {
                            const expiresAt = new Date(form.expiresAt)
                            const now = new Date()
                            const isExpired = expiresAt < now
                            const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                            
                            const fieldsList = []
                            if (form.fields.nombre) fieldsList.push('Nombre')
                            if (form.fields.email) fieldsList.push('Email')
                            if (form.fields.telefono) fieldsList.push('Teléfono')
                            if (form.fields.descripcion) fieldsList.push('Descripción')

                            return (
                              <tr key={form.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">{form.name}</div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    Creado: {new Date(form.createdAt).toLocaleDateString()}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="text-sm text-gray-900">
                                    {fieldsList.join(', ')}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">
                                    {form.list ? form.list.name : 'Sin lista'}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center space-x-2">
                                    <Clock className={`h-4 w-4 ${isExpired ? 'text-red-500' : daysLeft <= 2 ? 'text-orange-500' : 'text-gray-400'}`} />
                                    <div>
                                      <div className={`text-sm ${isExpired ? 'text-red-600 font-medium' : daysLeft <= 2 ? 'text-orange-600' : 'text-gray-900'}`}>
                                        {isExpired ? 'Expirado' : `${daysLeft} día${daysLeft !== 1 ? 's' : ''}`}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {expiresAt.toLocaleDateString()}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    form.active && !isExpired
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {form.active && !isExpired ? 'Activo' : 'Inactivo'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                  <div className="flex items-center justify-center space-x-2">
                                    <button
                                      onClick={() => copyFormLink(form.uniqueId)}
                                      className="text-blue-600 hover:text-blue-900"
                                      title="Copiar link"
                                    >
                                      <Copy className="h-4 w-4" />
                                    </button>
                                    <a
                                      href={`/form/${form.uniqueId}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-green-600 hover:text-green-900"
                                      title="Ver formulario"
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </a>
                                    <button
                                      onClick={() => toggleFormActive(form)}
                                      className={`${form.active ? 'text-orange-600 hover:text-orange-900' : 'text-green-600 hover:text-green-900'}`}
                                      title={form.active ? 'Desactivar' : 'Activar'}
                                    >
                                      {form.active ? '⏸' : '▶'}
                                    </button>
                                    <button
                                      onClick={() => handleEditForm(form)}
                                      className="text-blue-600 hover:text-blue-900"
                                      title="Editar"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => setShowDeleteFormConfirm({show: true, form})}
                                      className="text-red-600 hover:text-red-900"
                                      title="Eliminar"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contact List */}
            <div className="bg-white rounded-lg shadow-sm border mt-8">
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
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Listas
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
                          <div className="flex flex-wrap gap-1">
                            {subscriber.lists && subscriber.lists.length > 0 ? (
                              subscriber.lists.map((list) => (
                                <span
                                  key={list.id}
                                  className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800"
                                >
                                  {list.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-500 italic">Sin listas</span>
                            )}
                          </div>
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
                              onClick={() => handleView(subscriber)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Ver detalles del contacto"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
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
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] flex flex-col">
              <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
                <h3 className="text-lg font-semibold text-gray-900">Editar Contacto</h3>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1">
                <form onSubmit={handleEditSubmit}>
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
                  
                  {/* Selección de múltiples listas */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Listas Asignadas
                    </label>
                    <div className="border border-gray-200 rounded-lg bg-white shadow-sm">
                      <div className="max-h-48 overflow-y-auto p-3">
                        {currentLists.length > 0 ? (
                          <div className="space-y-2">
                            {currentLists.map((list) => (
                              <label key={list.id} className="flex items-center space-x-3 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                                <input
                                  type="checkbox"
                                  checked={editSelectedListIds.includes(list.id)}
                                  onChange={() => toggleEditListSelection(list.id)}
                                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                />
                                <div className="flex-1">
                                  <span className="text-gray-900 font-medium">{list.name}</span>
                                  {list.description && (
                                    <p className="text-xs text-gray-500 mt-1">{list.description}</p>
                                  )}
                                </div>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <div className="text-gray-400 mb-2">
                              <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <p className="text-sm text-gray-500 mb-3">No hay listas disponibles</p>
                            <button
                              type="button"
                              onClick={handleCreateNewList}
                              className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                            >
                              Crear primera lista
                            </button>
                          </div>
                        )}
                      </div>
                      {currentLists.length > 0 && (
                        <div className="border-t border-gray-100 px-3 py-2 bg-gray-50 rounded-b-lg">
                          <button
                            type="button"
                            onClick={handleCreateNewList}
                            className="text-sm text-orange-600 hover:text-orange-700 font-medium transition-colors"
                          >
                            ➕ Crear nueva lista
                          </button>
                        </div>
                      )}
                    </div>
                    {editSelectedListIds.length > 0 && (
                      <div className="mt-2 flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">{editSelectedListIds.length}</span> lista{editSelectedListIds.length !== 1 ? 's' : ''} seleccionada{editSelectedListIds.length !== 1 ? 's' : ''}
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditSelectedListIds([])}
                          className="text-xs text-red-600 hover:text-red-700 font-medium underline"
                        >
                          Quitar de todas las listas
                        </button>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      Selecciona una o más listas para asignar al contacto
                    </p>
                  </div>
                  
                  {/* Botones dentro del formulario */}
                  <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
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
          </div>
        )}

        {/* Modal de Vista de Solo Lectura para Listas */}
        {viewingList && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] flex flex-col">
              <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
                <h3 className="text-lg font-semibold text-gray-900">Detalles de la Lista</h3>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre
                    </label>
                    <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900">
                      {viewingList.name}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Slug
                    </label>
                    <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900">
                      {viewingList.slug}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción
                    </label>
                    <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 min-h-[60px]">
                      {viewingList.description || 'Sin descripción'}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estado
                    </label>
                    <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        viewingList.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {viewingList.status === 'active' ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Creación
                    </label>
                    <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900">
                      {new Date(viewingList.createdAt).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0">
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleCloseListView}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Vista de Solo Lectura */}
        {viewingSubscriber && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] flex flex-col">
              <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
                <h3 className="text-lg font-semibold text-gray-900">Detalles del Contacto</h3>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre
                    </label>
                    <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900">
                      {viewingSubscriber.name}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900">
                      {viewingSubscriber.email}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción
                    </label>
                    <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 min-h-[60px]">
                      {viewingSubscriber.description || 'Sin descripción'}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estado
                    </label>
                    <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        viewingSubscriber.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : viewingSubscriber.status === 'inactive'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {viewingSubscriber.status === 'active' ? 'Activo' : 
                         viewingSubscriber.status === 'inactive' ? 'Inactivo' : 'Archivado'}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Listas Asignadas
                    </label>
                    <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 min-h-[60px]">
                      <div className="flex flex-wrap gap-1">
                        {viewingSubscriber.lists && viewingSubscriber.lists.length > 0 ? (
                          viewingSubscriber.lists.map((list) => (
                            <span
                              key={list.id}
                              className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800"
                            >
                              {list.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500 italic">Sin listas asignadas</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Creación
                    </label>
                    <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900">
                      {new Date(viewingSubscriber.createdAt).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0">
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleCloseView}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
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

        {/* Modal de confirmación de borrado de lista */}
        {showDeleteListConfirm.show && showDeleteListConfirm.list && (
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
                    <p className="text-gray-900 font-medium">¿Estás seguro de eliminar esta lista?</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Puede afectar a varios suscriptores
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Lista: <strong>{showDeleteListConfirm.list.name}</strong>
                    </p>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-6">
                  Esta acción no se puede deshacer. La lista será eliminada permanentemente.
                </p>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={cancelDeleteList}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmDeleteList}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Eliminar Lista
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Crear/Editar Lista */}
        {(showCreateListForm || editingList) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingList ? 'Editar Lista' : 'Crear Nueva Lista'}
                </h3>
              </div>
              
              <form onSubmit={handleListSubmit} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de la Lista *
                    </label>
                    <input
                      type="text"
                      value={listData.name}
                      onChange={(e) => setListData('name', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                        listErrors.name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Ej: Lista de Clientes VIP"
                      required
                    />
                    {listErrors.name && (
                      <p className="mt-1 text-sm text-red-600">{listErrors.name}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción
                    </label>
                    <textarea
                      rows={3}
                      value={listData.description}
                      onChange={(e) => setListData('description', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                        listErrors.description ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Descripción opcional de la lista"
                    />
                    {listErrors.description && (
                      <p className="mt-1 text-sm text-red-600">{listErrors.description}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estado
                    </label>
                    <select 
                      value={listData.status}
                      onChange={(e) => setListData('status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="active">Activa</option>
                      <option value="inactive">Inactiva</option>
                      <option value="archived">Archivada</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseListForm}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingList}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      isSavingList 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-orange-500 hover:bg-orange-600'
                    } text-white`}
                  >
                    {isSavingList ? 'Guardando...' : (editingList ? 'Actualizar Lista' : 'Crear Lista')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Crear/Editar Formulario */}
        {showCreateFormModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingForm ? 'Editar Formulario' : 'Crear Nuevo Formulario'}
                </h3>
              </div>
              
              <form onSubmit={handleFormSubmit} className="p-6">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre del Formulario *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData('name', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                        formErrors.name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Ej: Formulario de Contacto"
                      required
                    />
                    {formErrors.name && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Campos del Formulario *
                    </label>
                    <div className="space-y-3 border border-gray-200 rounded-lg p-4">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.fields.nombre}
                          onChange={(e) => setFormData('fields', { ...formData.fields, nombre: e.target.checked })}
                          className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-700">Nombre</span>
                      </label>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.fields.email}
                          disabled
                          className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-700">Email <span className="text-gray-500">(requerido)</span></span>
                      </label>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.fields.telefono}
                          onChange={(e) => setFormData('fields', { ...formData.fields, telefono: e.target.checked })}
                          className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-700">Teléfono</span>
                      </label>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.fields.descripcion}
                          onChange={(e) => setFormData('fields', { ...formData.fields, descripcion: e.target.checked })}
                          className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-700">Descripción</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Asignar a Lista (Opcional)
                    </label>
                    <select
                      value={formData.listId || ''}
                      onChange={(e) => setFormData('listId', e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="">Sin lista</option>
                      {currentLists.filter(list => list.status === 'active').map((list) => (
                        <option key={list.id} value={list.id}>
                          {list.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Los contactos que completen este formulario se agregarán automáticamente a la lista seleccionada
                    </p>
                  </div>

                  {!editingForm && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Duración (días) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="7"
                        value={formData.durationDays}
                        onChange={(e) => setFormData('durationDays', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        El formulario expirará después de {formData.durationDays} día{formData.durationDays !== 1 ? 's' : ''} (máximo 7 días)
                      </p>
                    </div>
                  )}

                  {editingForm && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-yellow-800">
                        <strong>Nota:</strong> No se puede cambiar la duración de un formulario existente. 
                        El formulario expirará el {new Date(editingForm.expiresAt).toLocaleDateString()}.
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseFormModal}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingForm}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      isSavingForm 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-orange-500 hover:bg-orange-600'
                    } text-white`}
                  >
                    {isSavingForm ? 'Guardando...' : (editingForm ? 'Actualizar Formulario' : 'Crear Formulario')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de confirmación de eliminación de formulario */}
        {showDeleteFormConfirm.show && showDeleteFormConfirm.form && (
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
                    <p className="text-gray-900 font-medium">¿Estás seguro de eliminar este formulario?</p>
                    <p className="text-sm text-gray-600 mt-1">
                      El formulario: <strong>{showDeleteFormConfirm.form.name}</strong>
                    </p>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-6">
                  Esta acción no se puede deshacer. El formulario será eliminado permanentemente y el link dejará de funcionar.
                </p>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowDeleteFormConfirm({show: false, form: null})}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDeleteForm}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Eliminar Formulario
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmación para importar sin listas */}
        {showImportConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex-shrink-0">
                  <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Confirmar Importación</h3>
                  <p className="text-sm text-gray-500">Sin lista asignada</p>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700">
                  No has seleccionado ninguna lista para asignar a los contactos importados. 
                  Los contactos se importarán <strong>sin estar asignados a ninguna lista</strong>.
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  ¿Estás seguro de que quieres continuar con la importación?
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelImportWithoutLists}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmImportWithoutLists}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
                >
                  Importar Sin Lista
                </button>
              </div>
            </div>
          </div>
        )}
      </AppSidebar>
    </>
  )
}
