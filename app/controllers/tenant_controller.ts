import type { HttpContext } from '@adonisjs/core/http'
import Tenant from '#models/tenant'
import { readFileSync } from 'fs'
import { join } from 'path'

export default class TenantController {
  public async index({ response }: HttpContext) {
    try {
      const html = readFileSync(join(process.cwd(), 'resources/views/tenants.html'), 'utf-8')
      return response.type('text/html').send(html)
    } catch (error) {
      return response.status(404).send('Página no encontrada')
    }
  }

  public async create({ response }: HttpContext) {
    return response.json({ message: 'Formulario de crear tenant' })
  }

  public async store({ request, response }: HttpContext) {
    const { name } = request.only(['name'])
    
    try {
      const tenant = await Tenant.create({
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
      })
      
      return response.json({ message: 'Tenant creado correctamente', tenant })
    } catch (error) {
      return response.badRequest({ message: 'Error al crear tenant' })
    }
  }

  public async show({ params, response }: HttpContext) {
    try {
      const tenant = await Tenant.find(params.id)
      if (!tenant) {
        return response.notFound({ message: 'Tenant no encontrado' })
      }
      return response.json({ tenant })
    } catch (error) {
      return response.badRequest({ message: 'Error al obtener tenant' })
    }
  }

  public async edit({ params, response }: HttpContext) {
    return response.json({ message: `Formulario de editar tenant ${params.id}` })
  }

  public async update({ params, request, response }: HttpContext) {
    const { name } = request.only(['name'])
    
    try {
      const tenant = await Tenant.find(params.id)
      if (!tenant) {
        return response.notFound({ message: 'Tenant no encontrado' })
      }
      
      tenant.name = name
      tenant.slug = name.toLowerCase().replace(/\s+/g, '-')
      await tenant.save()
      
      return response.json({ message: 'Tenant actualizado correctamente', tenant })
    } catch (error) {
      return response.badRequest({ message: 'Error al actualizar tenant' })
    }
  }

  public async destroy({ params, response }: HttpContext) {
    try {
      const tenant = await Tenant.find(params.id)
      if (!tenant) {
        return response.notFound({ message: 'Tenant no encontrado' })
      }
      
      await tenant.delete()
      return response.json({ message: 'Tenant eliminado correctamente' })
    } catch (error) {
      return response.badRequest({ message: 'Error al eliminar tenant' })
    }
  }
}
