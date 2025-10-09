
import { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import hash from '@adonisjs/core/services/hash'

export default class LoginController {
  public async login({ request, auth, response }: HttpContext) {
    const { email, password } = request.only(['email', 'password'])

    try {
      const user = await User.findByOrFail('email', email)
      
      if (await hash.verify(user.password, password)) {
        await auth.use('web').login(user)
        return response.redirect('/dashboard')
      } else {
        return response.badRequest('Credenciales inválidas')
      }
    } catch {
      return response.badRequest('Credenciales inválidas')
    }
  }

  public async logout({ auth, response }: HttpContext) {
    await auth.use('web').logout()
    return response.redirect('/login')
  }
}
