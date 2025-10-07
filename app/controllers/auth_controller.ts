import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import Tenant from '#models/tenant'
import Database from '@adonisjs/lucid/services/db'
import hash from '@adonisjs/core/services/hash'

export default class AuthController {
  public async register({ request, response, auth }: HttpContext) {
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

    const user = await User.create({
      fullName: fullName,
      email: email,
      password: await hash.make(password),
    })

    const tenant = await Tenant.create({
      name: organization,
      slug: organization.toLowerCase().replace(/\s+/g, '-'),
    })

    await Database.table('tenant_user').insert({
      tenant_id: tenant.id,
      user_id: user.id,
      role: 'owner',
      active: true,
    })

    await auth.use('web').login(user)
    return response.redirect('/dashboard')
  }

  public async login({ request, response, auth }: HttpContext) {
    const { email, password } = request.only(['email', 'password'])
    
    try {
      const user = await User.verifyCredentials(email, password)
      await auth.use('web').login(user)
      return response.redirect('/dashboard')
    } catch (error) {
      return response.badRequest({ message: 'Credenciales inválidas' })
    }
  }

  public async logout({ auth, response }: HttpContext) {
    await auth.use('web').logout()
    return response.redirect('/login')
  }
}
