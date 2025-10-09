import { HttpContext } from '@adonisjs/core/http'

export default class AuthController {
  public async showLogin({ inertia }: HttpContext) {
    return inertia.render('auth/login')
  }

  public async showRegister({ inertia }: HttpContext) {
    return inertia.render('auth/register')
  }
}
