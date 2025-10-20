import React, { useState } from 'react'
import { useForm } from '@inertiajs/react'
import { useToast } from '../hooks/useToast'
import { Code, Copy, Eye, Settings } from 'lucide-react'

interface GenerateFormProps {
  onSubmit?: (formData: FormData) => void
  onPreview?: (formData: FormData) => void
  onGenerateCode?: (formData: FormData) => void
}

interface FormData {
  formName: string
  formDescription: string
  fields: {
    email: { enabled: boolean; required: boolean }
    name: { enabled: boolean; required: boolean }
    description: { enabled: boolean; required: boolean }
    company: { enabled: boolean; required: boolean }
  }
  targetList: string
  submitButtonText: string
  successMessage: string
  styling: {
    showLabels: boolean
  }
}

export default function GenerateForm({ onSubmit, onPreview }: GenerateFormProps) {
  const { showError, showSuccess } = useToast()
  const [activeTab, setActiveTab] = useState<'config' | 'preview' | 'code'>('config')
  const [generatedCode, setGeneratedCode] = useState('')
  const [showCodeModal, setShowCodeModal] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [clearSuccess, setClearSuccess] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const { data, setData, errors } = useForm<FormData>({
    formName: '',
    formDescription: '',
    fields: {
      email: { enabled: true, required: true },
      name: { enabled: true, required: true },
      description: { enabled: false, required: false },
      company: { enabled: false, required: false }
    },
    targetList: '',
    submitButtonText: 'Suscribirse',
    successMessage: '¡Gracias por suscribirte!',
    styling: {
      showLabels: true
    }
  })

  // Función personalizada para reset que mantiene campos obligatorios
  const resetForm = () => {
    // Verificar si hay datos para limpiar
    const hasData = data.formName || data.formDescription || data.targetList || 
                   data.submitButtonText !== 'Suscribirse' || 
                   data.successMessage !== '¡Gracias por suscribirte!' ||
                   data.fields.description.enabled || data.fields.company.enabled ||
                   !data.styling.showLabels

    if (!hasData) {
      showError('Información', 'No hay datos para limpiar. El formulario ya está vacío.')
      return
    }

    // Mostrar modal de confirmación
    setShowClearConfirm(true)
  }

  // Función para confirmar la limpieza
  const confirmClear = () => {
    setData({
      formName: '',
      formDescription: '',
      fields: {
        email: { enabled: true, required: true },
        name: { enabled: true, required: true },
        description: { enabled: false, required: false },
        company: { enabled: false, required: false }
      },
      targetList: '',
      submitButtonText: 'Suscribirse',
      successMessage: '¡Gracias por suscribirte!',
      styling: {
        showLabels: true
      }
    })

    // Limpiar también el código generado
    setGeneratedCode('')
    
    // Mostrar feedback de éxito
    setClearSuccess(true)
    showSuccess('¡Éxito!', 'Formulario limpiado correctamente')
    
    // Cerrar modal y limpiar estado
    setShowClearConfirm(false)
    
    // Limpiar el estado de éxito después de 2 segundos
    setTimeout(() => {
      setClearSuccess(false)
    }, 2000)
  }

  // Función para cancelar la limpieza
  const cancelClear = () => {
    setShowClearConfirm(false)
  }

  const handleFieldToggle = (fieldName: keyof FormData['fields'], property: 'enabled' | 'required') => {
    // No permitir deshabilitar campos obligatorios (email y name)
    if (property === 'enabled' && (fieldName === 'email' || fieldName === 'name')) {
      return
    }
    
    setData('fields', {
      ...data.fields,
      [fieldName]: {
        ...data.fields[fieldName],
        [property]: !data.fields[fieldName][property]
      }
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validaciones básicas
    if (!data.formName.trim()) {
      showError('Error', 'El nombre del formulario es requerido')
      return
    }

    if (!data.targetList) {
      showError('Error', 'Debes seleccionar una lista de destino')
      return
    }

    if (onSubmit) {
      onSubmit(data)
    }
  }

  const handlePreview = () => {
    if (onPreview) {
      onPreview(data)
    }
    setActiveTab('preview')
  }

  const generateHTMLCode = (showModal: boolean = true) => {
    const themeColors = {
      orange: { primary: '#f97316', hover: '#ea580c', focus: '#fed7aa' }
    }

    const colors = themeColors.orange

    let htmlCode = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Formulario de Suscripción</title>
</head>
<body>
<!-- Formulario de Suscripción Generado -->
<div style="max-width: 400px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h3 style="font-size: 20px; font-weight: 600; color: #111827; margin: 0 0 8px 0;">${data.formName || 'Suscríbete'}</h3>
    ${data.formDescription ? `<p style="font-size: 14px; color: #6b7280; margin: 0;">${data.formDescription}</p>` : ''}
  </div>
  
  <form style="display: flex; flex-direction: column; gap: 16px;" action="/api/public/subscribe" method="POST">
    <input type="hidden" name="listId" value="${data.targetList}">
    
    ${data.fields.email.enabled ? `
    <div>
      ${data.styling.showLabels ? '<label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 4px;">Email' + (data.fields.email.required ? ' *' : '') + '</label>' : ''}
      <input 
        type="email" 
        name="email" 
        placeholder="Tu email"
        ${data.fields.email.required ? 'required' : ''}
        style="width: 100%; padding: 12px 16px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; transition: all 0.2s; box-sizing: border-box;"
        onfocus="this.style.borderColor='#f97316'; this.style.outline='none'; this.style.boxShadow='0 0 0 3px rgba(249, 115, 22, 0.1)'"
        onblur="this.style.borderColor='#d1d5db'; this.style.boxShadow='none'"
      />
    </div>
    ` : ''}
    
    ${data.fields.name.enabled ? `
    <div>
      ${data.styling.showLabels ? '<label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 4px;">Nombre' + (data.fields.name.required ? ' *' : '') + '</label>' : ''}
      <input 
        type="text" 
        name="name" 
        placeholder="Tu nombre completo"
        ${data.fields.name.required ? 'required' : ''}
        style="width: 100%; padding: 12px 16px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; transition: all 0.2s; box-sizing: border-box;"
        onfocus="this.style.borderColor='#f97316'; this.style.outline='none'; this.style.boxShadow='0 0 0 3px rgba(249, 115, 22, 0.1)'"
        onblur="this.style.borderColor='#d1d5db'; this.style.boxShadow='none'"
      />
    </div>
    ` : ''}
    
    ${data.fields.description.enabled ? `
    <div>
      ${data.styling.showLabels ? '<label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 4px;">Descripción' + (data.fields.description.required ? ' *' : '') + '</label>' : ''}
      <textarea 
        name="description" 
        placeholder="Descripción opcional"
        rows="3"
        ${data.fields.description.required ? 'required' : ''}
        style="width: 100%; padding: 12px 16px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; transition: all 0.2s; box-sizing: border-box; resize: none; font-family: inherit;"
        onfocus="this.style.borderColor='#f97316'; this.style.outline='none'; this.style.boxShadow='0 0 0 3px rgba(249, 115, 22, 0.1)'"
        onblur="this.style.borderColor='#d1d5db'; this.style.boxShadow='none'"
      ></textarea>
    </div>
    ` : ''}
    
    ${data.fields.company.enabled ? `
    <div>
      ${data.styling.showLabels ? '<label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 4px;">Empresa' + (data.fields.company.required ? ' *' : '') + '</label>' : ''}
      <input 
        type="text" 
        name="company" 
        placeholder="Nombre de tu empresa"
        ${data.fields.company.required ? 'required' : ''}
        style="width: 100%; padding: 12px 16px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; transition: all 0.2s; box-sizing: border-box;"
        onfocus="this.style.borderColor='#f97316'; this.style.outline='none'; this.style.boxShadow='0 0 0 3px rgba(249, 115, 22, 0.1)'"
        onblur="this.style.borderColor='#d1d5db'; this.style.boxShadow='none'"
      />
    </div>
    ` : ''}
    
    <div>
      <button 
        type="submit" 
        style="width: 100%; background-color: #f97316; color: white; font-weight: 500; padding: 12px 24px; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; transition: all 0.2s; box-sizing: border-box;"
        onmouseover="this.style.backgroundColor='#ea580c'"
        onmouseout="this.style.backgroundColor='#f97316'"
        onfocus="this.style.outline='none'; this.style.boxShadow='0 0 0 3px rgba(249, 115, 22, 0.3)'"
        onblur="this.style.boxShadow='none'"
      >
        ${data.submitButtonText}
      </button>
    </div>
  </form>
  
  <div style="margin-top: 16px; text-align: center;">
    <p style="font-size: 12px; color: #6b7280; margin: 0;">
      Al suscribirte, aceptas recibir comunicaciones de nuestra parte.
    </p>
  </div>
</div>

<!-- CSS adicional para mejor compatibilidad -->
<style>
  .focus\\:ring-orange-500:focus {
    --tw-ring-color: ${colors.focus} !important;
  }
  .focus\\:border-orange-500:focus {
    border-color: ${colors.primary} !important;
  }
  .bg-orange-500 {
    background-color: ${colors.primary} !important;
  }
  .hover\\:bg-orange-600:hover {
    background-color: ${colors.hover} !important;
  }
</style>
</body>
</html>
    `.trim()

    setGeneratedCode(htmlCode)
    if (showModal) {
      setShowCodeModal(true)
    }
    setActiveTab('code')
  }

  const copyToClipboard = async () => {
    if (!generatedCode) {
      showError('Error', 'No hay código para copiar. Genera el código primero.')
      return
    }

    try {
      await navigator.clipboard.writeText(generatedCode)
      setCopySuccess(true)
      showSuccess('¡Éxito!', 'Código copiado al portapapeles')
      
      // Limpiar el estado de éxito después de 2 segundos
      setTimeout(() => {
        setCopySuccess(false)
      }, 2000)
    } catch (err) {
      console.error('Error al copiar:', err)
      showError('Error', 'No se pudo copiar el código. Inténtalo de nuevo.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="bg-white border-b">
        <nav className="flex space-x-8 px-6">
          <button
            onClick={() => setActiveTab('config')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'config'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Configuración</span>
            </div>
          </button>
          <button
            onClick={handlePreview}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'preview'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Eye className="h-4 w-4" />
              <span>Vista Previa</span>
            </div>
          </button>
          <button
            onClick={() => {
              setActiveTab('code')
              generateHTMLCode(false)
            }}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'code'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Code className="h-4 w-4" />
              <span>Código</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Configuración Tab */}
      {activeTab === 'config' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Configurar Formulario de Suscripción</h3>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información básica */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-800">Información Básica</h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Formulario *
                </label>
                <input
                  type="text"
                  value={data.formName}
                  onChange={(e) => setData('formName', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                    errors.formName ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Formulario de Newsletter"
                  required
                />
                {errors.formName && (
                  <p className="mt-1 text-sm text-red-600">{errors.formName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  rows={3}
                  value={data.formDescription}
                  onChange={(e) => setData('formDescription', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Describe el propósito de este formulario..."
                />
              </div>
            </div>

            {/* Campos del formulario */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-800">Campos del Formulario</h4>
              
              <div className="space-y-3">
                {/* Email - Campo Obligatorio */}
                <div className="flex items-center justify-between p-3 border border-orange-200 bg-orange-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-orange-500 rounded flex items-center justify-center">
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-700">Email</span>
                    <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded font-semibold">Obligatorio</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-xs text-gray-500">Requerido:</label>
                    <div className="w-4 h-4 bg-orange-500 rounded flex items-center justify-center">
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Nombre - Campo Obligatorio */}
                <div className="flex items-center justify-between p-3 border border-orange-200 bg-orange-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-orange-500 rounded flex items-center justify-center">
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-700">Nombre</span>
                    <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded font-semibold">Obligatorio</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-xs text-gray-500">Requerido:</label>
                    <div className="w-4 h-4 bg-orange-500 rounded flex items-center justify-center">
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Descripción */}
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <input 
                      type="checkbox" 
                      checked={data.fields.description.enabled}
                      onChange={() => handleFieldToggle('description', 'enabled')}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Descripción</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-xs text-gray-500">Requerido:</label>
                    <input 
                      type="checkbox" 
                      checked={data.fields.description.required}
                      onChange={() => handleFieldToggle('description', 'required')}
                      className="rounded"
                      disabled={!data.fields.description.enabled}
                    />
                  </div>
                </div>

                {/* Empresa */}
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <input 
                      type="checkbox" 
                      checked={data.fields.company.enabled}
                      onChange={() => handleFieldToggle('company', 'enabled')}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Empresa</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-xs text-gray-500">Requerido:</label>
                    <input 
                      type="checkbox" 
                      checked={data.fields.company.required}
                      onChange={() => handleFieldToggle('company', 'required')}
                      className="rounded"
                      disabled={!data.fields.company.enabled}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Configuración de destino */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-800">Configuración de Destino</h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lista de Destino *
                </label>
                <select 
                  value={data.targetList}
                  onChange={(e) => setData('targetList', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                >
                  <option value="">Selecciona una lista</option>
                  <option value="1">Lista Principal</option>
                  <option value="2">Newsletter</option>
                  <option value="3">Promociones</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Texto del Botón
                </label>
                <input
                  type="text"
                  value={data.submitButtonText}
                  onChange={(e) => setData('submitButtonText', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Suscribirse"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensaje de Éxito
                </label>
                <input
                  type="text"
                  value={data.successMessage}
                  onChange={(e) => setData('successMessage', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="¡Gracias por suscribirte!"
                />
              </div>
            </div>

            {/* Opciones de Visualización */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-800">Opciones de Visualización</h4>
              
              <div className="flex items-center space-x-3">
                <input 
                  type="checkbox" 
                  checked={data.styling.showLabels}
                  onChange={(e) => setData('styling', { ...data.styling, showLabels: e.target.checked })}
                  className="rounded"
                />
                <label className="text-sm text-gray-700">Mostrar etiquetas de campos</label>
              </div>
            </div>

            {/* Botón Limpiar */}
            <div className="flex justify-end pt-6 border-t">
              <button
                type="button"
                onClick={resetForm}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  clearSuccess 
                    ? 'bg-green-100 text-green-700 border border-green-200' 
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {clearSuccess ? '¡Limpiado!' : 'Limpiar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Vista Previa Tab */}
      {activeTab === 'preview' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Vista Previa del Formulario</h3>
          <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
            <div className="max-w-md mx-auto">
              <h4 className="text-lg font-medium text-gray-900 mb-2">{data.formName || 'Formulario de Suscripción'}</h4>
              {data.formDescription && (
                <p className="text-sm text-gray-600 mb-4">{data.formDescription}</p>
              )}
              
              <div className="space-y-3">
                {data.fields.email.enabled && (
                  <div className="w-full">
                    {data.styling.showLabels && (
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email{data.fields.email.required ? ' *' : ''}
                      </label>
                    )}
                    <input
                      type="email"
                      placeholder="Tu email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                )}
                
                {data.fields.name.enabled && (
                  <div className="w-full">
                    {data.styling.showLabels && (
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre{data.fields.name.required ? ' *' : ''}
                      </label>
                    )}
                    <input
                      type="text"
                      placeholder="Tu nombre completo"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                )}
                
                {data.fields.description.enabled && (
                  <div className="w-full">
                    {data.styling.showLabels && (
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Descripción{data.fields.description.required ? ' *' : ''}
                      </label>
                    )}
                    <textarea
                      rows={3}
                      placeholder="Descripción opcional"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                    />
                  </div>
                )}
                
                {data.fields.company.enabled && (
                  <div className="w-full">
                    {data.styling.showLabels && (
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Empresa{data.fields.company.required ? ' *' : ''}
                      </label>
                    )}
                    <input
                      type="text"
                      placeholder="Nombre de tu empresa"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                )}
                
                <div className="w-full">
                  <button
                    type="button"
                    className="w-full bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    {data.submitButtonText}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Código Tab */}
      {activeTab === 'code' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Código HTML Generado</h3>
            <button
              onClick={copyToClipboard}
              className={`flex items-center space-x-2 px-3 py-1 text-sm rounded transition-colors ${
                copySuccess 
                  ? 'bg-green-100 text-green-700 border border-green-200' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Copy className="h-4 w-4" />
              <span>{copySuccess ? '¡Copiado!' : 'Copiar'}</span>
            </button>
          </div>
          
          <div className="bg-gray-100 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap">
              <code>{generatedCode || 'Haz clic en "Generar Código HTML" para ver el código aquí'}</code>
            </pre>
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              Copia este código y pégalo en tu sitio web para usar el formulario
            </p>
          </div>
        </div>
      )}

      {/* Modal de código generado */}
      {showCodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Código HTML Generado</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={copyToClipboard}
                  className={`flex items-center space-x-2 px-3 py-1 text-sm rounded transition-colors ${
                    copySuccess 
                      ? 'bg-green-100 text-green-700 border border-green-200' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Copy className="h-4 w-4" />
                  <span>{copySuccess ? '¡Copiado!' : 'Copiar'}</span>
                </button>
                <button
                  onClick={() => setShowCodeModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-6">
              <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                <code>{generatedCode}</code>
              </pre>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowCodeModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={copyToClipboard}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  copySuccess 
                    ? 'bg-green-500 text-white hover:bg-green-600' 
                    : 'bg-orange-500 text-white hover:bg-orange-600'
                }`}
              >
                {copySuccess ? '¡Copiado!' : 'Copiar Código'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para limpiar */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Confirmar Limpieza</h3>
            </div>
            
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center mr-4">
                  <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-900 font-medium">¿Estás seguro de que quieres limpiar el formulario?</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Esta acción eliminará todos los datos configurados y no se puede deshacer.
                  </p>
                </div>
              </div>
              
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-6">
                <div className="flex">
                  <svg className="h-5 w-5 text-orange-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm text-orange-800 font-medium">Se eliminará:</p>
                    <ul className="text-xs text-orange-700 mt-1 space-y-1">
                      <li>• Nombre y descripción del formulario</li>
                      <li>• Configuración de campos opcionales</li>
                      <li>• Lista de destino seleccionada</li>
                      <li>• Código HTML generado</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelClear}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmClear}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Sí, Limpiar Todo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
