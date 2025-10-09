import Tenant from '#models/tenant'
import TenantUser from '#models/tenant_user'
import User from '#models/user'
import { HttpContext } from '@adonisjs/core/http'
import { cuid } from '@adonisjs/core/helpers'

export default class RegisterController {
  public async register({ request, response, auth }: HttpContext) {
    const data = request.only(['email', 'password', 'organization_name'])

    const user = await User.create({
      email: data.email,
      password: data.password,
    })

    const tenant = await Tenant.create({
      name: data.organization_name,
      slug: data.organization_name.toLowerCase().replace(/\s+/g, '-') + '-' + cuid().substring(0, 5),
    })

    await TenantUser.create({
      tenantId: tenant.id,
      userId: user.id,
      role: 'owner',
    })

    await auth.use('web').login(user)
    return response.redirect('/dashboard')
  }
}
