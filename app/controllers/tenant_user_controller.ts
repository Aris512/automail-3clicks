import type { HttpContext } from '@adonisjs/core/http'
import Database from '@adonisjs/lucid/services/db'

export default class TenantUserController {
  public async index({ params, response }: HttpContext) {
    try {
      const tenantId = params.tenantId
      
      const users = await Database
        .from('tenant_user')
        .join('users', 'tenant_user.user_id', 'users.id')
        .where('tenant_user.tenant_id', tenantId)
        .select('users.*', 'tenant_user.role', 'tenant_user.active')
      
      return response.json({ users })
    } catch (error) {
      return response.badRequest({ message: 'Error al obtener usuarios del tenant' })
    }
  }

  public async store({ params, request, response }: HttpContext) {
    const { userId, role = 'member' } = request.only(['userId', 'role'])
    const tenantId = params.tenantId
    
    try {
      await Database.table('tenant_user').insert({
        tenant_id: tenantId,
        user_id: userId,
        role: role,
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
      })
      
      return response.json({ message: 'Usuario asignado al tenant correctamente' })
    } catch (error) {
      return response.badRequest({ message: 'Error al asignar usuario al tenant' })
    }
  }

  public async update({ params, request, response }: HttpContext) {
    const { role, active } = request.only(['role', 'active'])
    const { tenantId, userId } = params
    
    try {
      await Database
        .from('tenant_user')
        .where('tenant_id', tenantId)
        .where('user_id', userId)
        .update({
          role: role,
          active: active,
          updated_at: new Date(),
        })
      
      return response.json({ message: 'Relación tenant-usuario actualizada correctamente' })
    } catch (error) {
      return response.badRequest({ message: 'Error al actualizar relación tenant-usuario' })
    }
  }

  public async destroy({ params, response }: HttpContext) {
    const { tenantId, userId } = params
    
    try {
      await Database
        .from('tenant_user')
        .where('tenant_id', tenantId)
        .where('user_id', userId)
        .delete()
      
      return response.json({ message: 'Usuario removido del tenant correctamente' })
    } catch (error) {
      return response.badRequest({ message: 'Error al remover usuario del tenant' })
    }
  }
}
