import { Head, useForm } from '@inertiajs/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { FormEventHandler } from 'react'

export default function Register() {
  const { data, setData, post, processing, errors } = useForm({
    email: '',
    password: '',
    organization_name: '',
  })

  const handleSubmit: FormEventHandler = (e) => {
    e.preventDefault()
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
                <div className="space-y-2">
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={data.password}
                    onChange={(e) => setData('password', e.target.value)}
                    required
                  />
                  {errors.password && <p className="text-sm text-red-600">{errors.password}</p>}
                </div>

                <div className="space-y-2">
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
                </div>

                <Button type="submit" className="w-full" disabled={processing}>
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
