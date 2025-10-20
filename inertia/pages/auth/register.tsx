import { Head, useForm } from '@inertiajs/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import PasswordStrength from '../../components/ui/password-strength'
import { FormEventHandler } from 'react'

export default function Register() {
  const { data, setData, post, processing, errors } = useForm({
    email: '',
    password: '',
    organization_name: '',
    first_name: '',
    last_name: '',
  })


  const handleSubmit: FormEventHandler = (e) => {
    e.preventDefault()
    post('/register')
  }

  return (
    <>
      <Head title="Registrarse" />
      
      <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center animate-fade-in">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-800 animate-slide-up">
              Crear Cuenta
            </h2>
            <p className="mt-2 text-sm text-gray-600 animate-slide-up-delayed">
              Regístrate para comenzar a usar AutoMail
            </p>
          </div>

          <Card className="animate-slide-up-card hover:shadow-lg transition-all duration-300 ease-out bg-white/90 backdrop-blur-sm border-red-100">
            <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-t-lg">
              <CardTitle className="text-white">Registro</CardTitle>
              <CardDescription className="text-red-100">
                Completa los datos para crear tu cuenta y organización
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 relative animate-fade-in-delayed">
                    <Label htmlFor="first_name" className="transition-colors duration-200 text-gray-700 font-medium">Nombre</Label>
                    <Input
                      id="first_name"
                      type="text"
                      placeholder="Tu nombre"
                      value={data.first_name}
                      onChange={(e) => setData('first_name', e.target.value)}
                      required
                      className="transition-all duration-200 focus:scale-[1.02] focus:shadow-md focus:border-red-300 focus:ring-red-200"
                    />
                    {errors.first_name && <p className="text-sm text-red-600">{errors.first_name}</p>}
                  </div>

                  <div className="space-y-2 relative animate-fade-in-delayed-2">
                    <Label htmlFor="last_name" className="transition-colors duration-200 text-gray-700 font-medium">Apellido</Label>
                    <Input
                      id="last_name"
                      type="text"
                      placeholder="Tu apellido"
                      value={data.last_name}
                      onChange={(e) => setData('last_name', e.target.value)}
                      required
                      className="transition-all duration-200 focus:scale-[1.02] focus:shadow-md focus:border-red-300 focus:ring-red-200"
                    />
                    {errors.last_name && <p className="text-sm text-red-600">{errors.last_name}</p>}
                  </div>
                </div>

                <div className="space-y-2 relative animate-fade-in-delayed-3">
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
                  <p className="text-xs text-gray-500">Formato: usuario@dominio.com</p>
                  {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
                </div>

                <div className="space-y-2 relative animate-fade-in-delayed-4">
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
                  <PasswordStrength 
                    password={data.password} 
                  />
                  {errors.password && <p className="text-sm text-red-600">{errors.password}</p>}
                </div>

                <div className="space-y-2 relative animate-fade-in-delayed-5">
                  <Label htmlFor="organization_name" className="transition-colors duration-200 text-gray-700 font-medium">Nombre de la Organización</Label>
                  <Input
                    id="organization_name"
                    type="text"
                    placeholder="Mi Empresa"
                    value={data.organization_name}
                    onChange={(e) => setData('organization_name', e.target.value)}
                    required
                    className="transition-all duration-200 focus:scale-[1.02] focus:shadow-md focus:border-red-300 focus:ring-red-200"
                  />
                  {errors.organization_name && <p className="text-sm text-red-600">{errors.organization_name}</p>}
                </div>

                <Button 
                  type="submit" 
                  className="w-full btn-gradient-hover active:scale-[0.98] animate-fade-in-delayed-6 text-white font-medium py-2.5 relative z-10" 
                  disabled={processing}
                >
                  {processing ? 'Creando cuenta...' : 'Crear Cuenta'}
                </Button>
              </form>

              <div className="mt-6 text-center animate-fade-in-delayed-7">
                <p className="text-sm text-gray-600">
                  ¿Ya tienes una cuenta?{' '}
                  <a 
                    href="/login" 
                    className="font-medium text-red-600 hover:text-red-500 transition-colors duration-200 hover:underline"
                  >
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
