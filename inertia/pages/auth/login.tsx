import { Head, useForm } from '@inertiajs/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import ToastField from '../../components/ui/toast-field'
import { useFieldMessages } from '../../hooks/useFieldMessages'
import { validateEmailForLogin, validatePasswordForLogin } from '../../lib/validations'
import { FormEventHandler, useEffect } from 'react'

export default function Login() {
  const { getMessage, showError, hideMessage } = useFieldMessages()
  
  const { data, setData, post, processing, errors } = useForm({
    email: '',
    password: '',
  })

  // Manejar errores del backend
  useEffect(() => {
    if (errors.email) {
      showError('email', 'Email inválido', errors.email)
    }
    if (errors.password) {
      showError('password', 'Contraseña incorrecta', errors.password)
    }
    if ((errors as any).general) {
      showError('email', 'Error', (errors as any).general)
    }
  }, [errors, showError])

  // Validación en tiempo real del email
  useEffect(() => {
    if (data.email && data.email.length > 0) {
      const emailValidation = validateEmailForLogin(data.email)
      if (!emailValidation.isValid && emailValidation.message) {
        showError('email', 'Email inválido', emailValidation.message)
      } else {
        hideMessage('email')
      }
    } else {
      hideMessage('email')
    }
  }, [data.email, showError, hideMessage])

  // Validación en tiempo real de la contraseña
  useEffect(() => {
    if (data.password && data.password.length > 0) {
      const passwordValidation = validatePasswordForLogin(data.password)
      if (!passwordValidation.isValid && passwordValidation.message) {
        showError('password', 'Contraseña inválida', passwordValidation.message)
      } else {
        hideMessage('password')
      }
    } else {
      hideMessage('password')
    }
  }, [data.password, showError, hideMessage])

  const handleSubmit: FormEventHandler = (e) => {
    e.preventDefault()
    
    // Validar antes de enviar
    const emailValidation = validateEmailForLogin(data.email)
    const passwordValidation = validatePasswordForLogin(data.password)
    
    if (!emailValidation.isValid) {
      showError('email', 'Email requerido', emailValidation.message)
      return
    }
    
    if (!passwordValidation.isValid) {
      showError('password', 'Contraseña requerida', passwordValidation.message)
      return
    }
    
    // Limpiar mensajes de error antes de enviar
    hideMessage('email')
    hideMessage('password')
    
    post('/login')
  }

  return (
    <>
      <Head title="Iniciar Sesión" />
      
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center animate-fade-in">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-800 animate-slide-up">
              Iniciar Sesión
            </h2>
            <p className="mt-2 text-sm text-gray-600 animate-slide-up-delayed">
              Ingresa tus credenciales para acceder a tu cuenta
            </p>
          </div>

          <Card className="animate-slide-up-card hover:shadow-lg transition-all duration-300 ease-out bg-white/90 backdrop-blur-sm border-red-100">
            <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-t-lg py-6 px-6">
              <CardTitle className="text-white">Acceso</CardTitle>
              <CardDescription className="text-red-100">
                Ingresa tu email y contraseña para continuar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2 relative animate-fade-in-delayed">
                  <Label htmlFor="email" className="transition-colors duration-200 text-gray-700 font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={data.email}
                    onChange={(e) => setData('email', e.target.value)}
                    required
                    className="transition-all duration-200 focus:scale-[1.02] focus:shadow-md focus:border-red-300 focus:ring-red-200"
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

                <div className="space-y-2 relative animate-fade-in-delayed-2">
                  <Label htmlFor="password" className="transition-colors duration-200 text-gray-700 font-medium">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={data.password}
                    onChange={(e) => setData('password', e.target.value)}
                    required
                    className="transition-all duration-200 focus:scale-[1.02] focus:shadow-md focus:border-red-300 focus:ring-red-200"
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

                <Button 
                  type="submit" 
                  className="w-full btn-gradient-hover active:scale-[0.98] animate-fade-in-delayed-3 text-white font-medium py-2.5 relative z-10" 
                  disabled={processing}
                >
                  {processing ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                </Button>
              </form>

              <div className="mt-6 text-center animate-fade-in-delayed-4">
                <p className="text-sm text-gray-600">
                  ¿No tienes una cuenta?{' '}
                  <a 
                    href="/register" 
                    className="font-medium text-red-600 hover:text-red-500 transition-colors duration-200 hover:underline"
                  >
                    Regístrate aquí
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
