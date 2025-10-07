import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import Tenant from '#models/tenant'
import Database from '@adonisjs/lucid/services/db'
import hash from '@adonisjs/core/services/hash'
import { readFileSync } from 'fs'
import { join } from 'path'

export default class AuthController {
  public async showLogin({ response }: HttpContext) {
    try {
      const html = readFileSync(join(process.cwd(), 'resources/views/login.html'), 'utf-8')
      return response.type('text/html').send(html)
    } catch (error) {
      return response.status(404).send('Página no encontrada')
    }
  }

  public async showRegister({ response }: HttpContext) {
    try {
      const html = readFileSync(join(process.cwd(), 'resources/views/register.html'), 'utf-8')
      return response.type('text/html').send(html)
    } catch (error) {
      return response.status(404).send('Página no encontrada')
    }
  }

  public async register({ request, response}: HttpContext) {
    try {
      const { fullName, email, password, organization } = request.only([
        'fullName', 'email', 'password', 'organization'
      ])

      // Validación básica
      if (!fullName || !email || !password || !organization) {
        return response.badRequest({ message: 'Todos los campos son requeridos' })
      }

      if (password.length < 6) {
        return response.badRequest({ message: 'La contraseña debe tener al menos 6 caracteres' })
      }

      // Verificar si el email ya existe
      const existingUser = await User.findBy('email', email)
      if (existingUser) {
        return response.badRequest({ message: 'Este email ya está registrado. Usa otro email o inicia sesión.' })
      }

      const user = await User.create({
        fullName: fullName,
        email: email,
        password: await hash.make(password),
      })

      // Generar slug único
      let baseSlug = organization.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')
      let slug = baseSlug
      let counter = 1
      
      while (await Tenant.findBy('slug', slug)) {
        slug = `${baseSlug}-${counter}`
        counter++
      }

      const tenant = await Tenant.create({
        name: organization,
        slug: slug,
        active: true,
      })

      await Database.table('tenant_user').insert({
        tenant_id: tenant.id,
        user_id: user.id,
        role: 'owner',
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
      })

      return response.redirect('/login?success=Cuenta creada exitosamente. Inicia sesión para continuar.')
    } catch (error) {
      console.error('Error en registro:', error)
      console.error('Error details:', error.message)
      console.error('Error stack:', error.stack)
      return response.badRequest({ 
        message: 'Error al crear la cuenta. Inténtalo de nuevo.',
        error: error.message 
      })
    }
  }

  public async login({ request, response }: HttpContext) {
    try {
      const { email, password } = request.only(['email', 'password'])
      
      if (!email || !password) {
        return response.badRequest({ message: 'Email y contraseña son requeridos' })
      }
      
      // Usar el AuthFinder del modelo User para verificación
      const user = await User.verifyCredentials(email, password)
      return response.redirect('/dashboard?user=' + encodeURIComponent(user.email))
    } catch (error) {
      console.error('Error en login:', error)
      console.error('Error details:', error.message)
      console.error('Error stack:', error.stack)
      return response.badRequest({ 
        message: 'Credenciales inválidas',
        error: error.message 
      })
    }
  }

  public async logout({ response }: HttpContext) {
    return response.redirect('/login')
  }
}
