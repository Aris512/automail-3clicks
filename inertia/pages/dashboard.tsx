import { Head } from '@inertiajs/react'

export default function Dashboard() {
  return (
    <>
      <Head title="Dashboard" />
      
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎉 Dashboard
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            ¡Bienvenido! El login/register funcionó correctamente.
          </p>
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            ✅ Autenticación exitosa
          </div>
        </div>
      </div>
    </>
  )
}
