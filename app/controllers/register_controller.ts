import Tenant from '#models/tenant'
import TenantUser from '#models/tenant_user'
import User from '#models/user'
import { HttpContext } from '@adonisjs/core/http'
import { cuid } from '@adonisjs/core/helpers'

function validateName(name: string, fieldName: string): { isValid: boolean; message?: string } {
  if (!name || name.trim().length === 0) {
    return { isValid: false, message: `El ${fieldName} es requerido` }
  }

  if (name.trim().length < 2) {
    return { isValid: false, message: `El ${fieldName} debe tener al menos 2 caracteres` }
  }

  // Verificar que no contenga números
  if (/\d/.test(name)) {
    return { isValid: false, message: `El ${fieldName} no puede contener números` }
  }

  // Verificar que solo contenga letras, espacios y algunos caracteres especiales comunes
  if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/.test(name)) {
    return { isValid: false, message: `El ${fieldName} solo puede contener letras` }
  }

  return { isValid: true }
}

export default class RegisterController {
  public async register({ request, response, auth, inertia }: HttpContext) {
    const data = request.only(['email', 'password', 'organization_name', 'first_name', 'last_name'])

    // Validar nombre
    const firstNameValidation = validateName(data.first_name, 'nombre')
    if (!firstNameValidation.isValid) {
      return inertia.render('auth/register', {
        errors: {
          first_name: firstNameValidation.message
        }
      })
    }

    // Validar apellido
    const lastNameValidation = validateName(data.last_name, 'apellido')
    if (!lastNameValidation.isValid) {
      return inertia.render('auth/register', {
        errors: {
          last_name: lastNameValidation.message
        }
      })
    }

    // Verificar si el email ya existe
    const existingUser = await User.findBy('email', data.email)
    if (existingUser) {
      return inertia.render('auth/register', {
        errors: {
          email: 'Este correo electrónico ya está en uso'
        }
      })
    }

    // Validación mínima de contraseña (solo longitud)
    if (!data.password || data.password.length < 6) {
      return inertia.render('auth/register', {
        errors: {
          password: 'La contraseña debe tener al menos 6 caracteres'
        }
      })
    }

    try {
      const user = await User.create({
        email: data.email,
        password: data.password,
        fullName: `${data.first_name} ${data.last_name}`.trim(),
      })

      const slug = data.organization_name.toLowerCase().replace(/\s+/g, '-') + '-' + cuid().substring(0, 5)
      
      const tenant = await Tenant.create({
        name: data.organization_name,
        slug: slug,
      })

      await TenantUser.create({
        tenantId: tenant.id,
        userId: user.id,
        role: 'owner',
      })

      await auth.use('web').login(user)

      return response.redirect('/dashboard')
    } catch (error) {
      return inertia.render('auth/register', {
        errors: {
          general: 'Error al crear la cuenta'
        }
      })
    }
  }
}
