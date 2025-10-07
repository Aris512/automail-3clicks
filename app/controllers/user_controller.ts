import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { readFileSync } from 'fs'
import { join } from 'path'

export default class UserController {
  public async index({ response }: HttpContext) {
    try {
      const html = readFileSync(join(process.cwd(), 'resources/views/users.html'), 'utf-8')
      return response.type('text/html').send(html)
    } catch (error) {
      return response.status(404).send('Página no encontrada')
    }
  }

  public async create({ response }: HttpContext) {
    return response.json({ message: 'Formulario de crear usuario' })
  }

  public async store({ request, response }: HttpContext) {
    const { fullName, email, password } = request.only(['fullName', 'email', 'password'])
    
    try {
      const user = await User.create({
        fullName,
        email,
        password: await hash.make(password),
      })
      
      return response.json({ message: 'Usuario creado correctamente', user })
    } catch (error) {
      return response.badRequest({ message: 'Error al crear usuario' })
    }
  }

  public async show({ params, response }: HttpContext) {
    try {
      const user = await User.find(params.id)
      if (!user) {
        return response.notFound({ message: 'Usuario no encontrado' })
      }
      return response.json({ user })
    } catch (error) {
      return response.badRequest({ message: 'Error al obtener usuario' })
    }
  }

  public async edit({ params, response }: HttpContext) {
    return response.json({ message: `Formulario de editar usuario ${params.id}` })
  }

  public async update({ params, request, response }: HttpContext) {
    const { fullName, email } = request.only(['fullName', 'email'])
    
    try {
      const user = await User.find(params.id)
      if (!user) {
        return response.notFound({ message: 'Usuario no encontrado' })
      }
      
      user.fullName = fullName
      user.email = email
      await user.save()
      
      return response.json({ message: 'Usuario actualizado correctamente', user })
    } catch (error) {
      return response.badRequest({ message: 'Error al actualizar usuario' })
    }
  }

  public async destroy({ params, response }: HttpContext) {
    try {
      const user = await User.find(params.id)
      if (!user) {
        return response.notFound({ message: 'Usuario no encontrado' })
      }
      
      await user.delete()
      return response.json({ message: 'Usuario eliminado correctamente' })
    } catch (error) {
      return response.badRequest({ message: 'Error al eliminar usuario' })
    }
  }
}
