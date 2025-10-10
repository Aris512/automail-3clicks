import { Head, useForm } from '@inertiajs/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import PasswordStrength from '../../components/ui/password-strength'
import ToastField from '../../components/ui/toast-field'
import { useFieldMessages } from '../../hooks/useFieldMessages'
import { validateEmail, validateName, validateOrganizationName } from '../../lib/validations'
import { FormEventHandler, useEffect } from 'react'

export default function Register() {
  const { getMessage, showError, hideMessage } = useFieldMessages()
  
  const { data, setData, post, processing, errors } = useForm({
    email: '',
    password: '',
    organization_name: '',
    first_name: '',
    last_name: '',
  })

  // Manejar errores del backend
  useEffect(() => {
    if (errors.email) {
      showError('email', 'Email inválido', errors.email)
    }
    if (errors.password) {
      showError('password', 'Contraseña inválida', errors.password)
    }
    if (errors.first_name) {
      showError('first_name', 'Nombre inválido', errors.first_name)
    }
    if (errors.last_name) {
      showError('last_name', 'Apellido inválido', errors.last_name)
    }
    if (errors.organization_name) {
      showError('organization_name', 'Organización inválida', errors.organization_name)
    }
    if ((errors as any).general) {
      showError('email', 'Error', (errors as any).general)
    }
  }, [errors, showError])

  // Validación en tiempo real del email
  useEffect(() => {
    if (data.email && data.email.length > 0) {
      const emailValidation = validateEmail(data.email)
      if (!emailValidation.isValid && emailValidation.message) {
        showError('email', 'Email inválido', emailValidation.message)
      } else {
        hideMessage('email')
      }
    } else {
      hideMessage('email')
    }
  }, [data.email, showError, hideMessage])

  // Validación en tiempo real del nombre
  useEffect(() => {
    if (data.first_name && data.first_name.length > 0) {
      const nameValidation = validateName(data.first_name, 'nombre')
      if (!nameValidation.isValid && nameValidation.message) {
        showError('first_name', 'Nombre inválido', nameValidation.message)
      } else {
        hideMessage('first_name')
      }
    } else {
      hideMessage('first_name')
    }
  }, [data.first_name, showError, hideMessage])

  // Validación en tiempo real del apellido
  useEffect(() => {
    if (data.last_name && data.last_name.length > 0) {
      const nameValidation = validateName(data.last_name, 'apellido')
      if (!nameValidation.isValid && nameValidation.message) {
        showError('last_name', 'Apellido inválido', nameValidation.message)
      } else {
        hideMessage('last_name')
      }
    } else {
      hideMessage('last_name')
    }
  }, [data.last_name, showError, hideMessage])

  // Validación en tiempo real del nombre de organización
  useEffect(() => {
    if (data.organization_name && data.organization_name.length > 0) {
      const orgValidation = validateOrganizationName(data.organization_name)
      if (!orgValidation.isValid && orgValidation.message) {
        showError('organization_name', 'Organización inválida', orgValidation.message)
      } else {
        hideMessage('organization_name')
      }
    } else {
      hideMessage('organization_name')
    }
  }, [data.organization_name, showError, hideMessage])

  const handleSubmit: FormEventHandler = (e) => {
    e.preventDefault()
    
    // Validación mínima de contraseña (solo longitud)
    if (!data.password || data.password.length < 6) {
      showError('password', 'Contraseña muy corta', 'La contraseña debe tener al menos 6 caracteres')
      return
    }
    
    // Limpiar mensajes de error antes de enviar
    hideMessage('email')
    hideMessage('password')
    hideMessage('first_name')
    hideMessage('last_name')
    hideMessage('organization_name')
    
    post('/register')
  }

  return (
    <>
      <Head title="Registrarse" />
      
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Crear Cuenta
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Regístrate para comenzar a usar AutoMail
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Registro</CardTitle>
              <CardDescription>
                Completa los datos para crear tu cuenta y organización
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 relative">
                    <Label htmlFor="first_name">Nombre</Label>
                    <Input
                      id="first_name"
                      type="text"
                      placeholder="Tu nombre"
                      value={data.first_name}
                      onChange={(e) => setData('first_name', e.target.value)}
                      required
                    />
                    {errors.first_name && <p className="text-sm text-red-600">{errors.first_name}</p>}
                    {getMessage('first_name') && (
                      <ToastField
                        show={getMessage('first_name')?.show || false}
                        type={getMessage('first_name')?.type || 'error'}
                        title={getMessage('first_name')?.title || ''}
                        message={getMessage('first_name')?.message}
                        onClose={() => hideMessage('first_name')}
                      />
                    )}
                  </div>

                  <div className="space-y-2 relative">
                    <Label htmlFor="last_name">Apellido</Label>
                    <Input
                      id="last_name"
                      type="text"
                      placeholder="Tu apellido"
                      value={data.last_name}
                      onChange={(e) => setData('last_name', e.target.value)}
                      required
                    />
                    {errors.last_name && <p className="text-sm text-red-600">{errors.last_name}</p>}
                    {getMessage('last_name') && (
                      <ToastField
                        show={getMessage('last_name')?.show || false}
                        type={getMessage('last_name')?.type || 'error'}
                        title={getMessage('last_name')?.title || ''}
                        message={getMessage('last_name')?.message}
                        onClose={() => hideMessage('last_name')}
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-2 relative">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={data.email}
                    onChange={(e) => setData('email', e.target.value)}
                    required
                  />
                  {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
                  {getMessage('email') && (
                    <ToastField
                      show={getMessage('email')?.show || false}
                      type={getMessage('email')?.type || 'error'}
                      title={getMessage('email')?.title || ''}
                      message={getMessage('email')?.message}
                      onClose={() => hideMessage('email')}
                    />
                  )}
                </div>

                <div className="space-y-2 relative">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={data.password}
                    onChange={(e) => setData('password', e.target.value)}
                    required
                  />
                  <PasswordStrength 
                    password={data.password} 
                  />
                  {errors.password && <p className="text-sm text-red-600">{errors.password}</p>}
                  {getMessage('password') && (
                    <ToastField
                      show={getMessage('password')?.show || false}
                      type={getMessage('password')?.type || 'error'}
                      title={getMessage('password')?.title || ''}
                      message={getMessage('password')?.message}
                      onClose={() => hideMessage('password')}
                    />
                  )}
                </div>

                <div className="space-y-2 relative">
                  <Label htmlFor="organization_name">Nombre de la Organización</Label>
                  <Input
                    id="organization_name"
                    type="text"
                    placeholder="Mi Empresa"
                    value={data.organization_name}
                    onChange={(e) => setData('organization_name', e.target.value)}
                    required
                  />
                  {errors.organization_name && <p className="text-sm text-red-600">{errors.organization_name}</p>}
                  {getMessage('organization_name') && (
                    <ToastField
                      show={getMessage('organization_name')?.show || false}
                      type={getMessage('organization_name')?.type || 'error'}
                      title={getMessage('organization_name')?.title || ''}
                      message={getMessage('organization_name')?.message}
                      onClose={() => hideMessage('organization_name')}
                    />
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={processing}
                >
                  {processing ? 'Creando cuenta...' : 'Crear Cuenta'}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  ¿Ya tienes una cuenta?{' '}
                  <a href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                    Inicia sesión aquí
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
