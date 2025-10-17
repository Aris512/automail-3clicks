import type { HttpContext } from '@adonisjs/core/http'
import SubscriberList from '#models/subscriber_list'
import Subscriber from '#models/subscriber'
import List from '#models/list'
import TenantUser from '#models/tenant_user'
import { DateTime } from 'luxon'
import { inject } from '@adonisjs/core'

@inject()
export default class SubscribersListsController {
  /**
   * Display una lista de relaciones entre contactos y listas
   */
  async index({ auth, inertia }: HttpContext) {
    const user = auth.user!
    
    // Obtener el tenant del usuario
    const tenantUser = await TenantUser.query()
      .where('userId', user.id)
      .where('active', true)
      .first()

    if (!tenantUser) {
      return inertia.render('auth/subscribers-lists/index', {
        user: auth.user,
        subscriberLists: []
      })
    }

    const subscriberLists = await SubscriberList.query()
      .whereHas('subscriber', (query) => {
        query.where('tenantId', tenantUser.tenantId)
      })
      .preload('subscriber')
      .preload('list')
      .orderBy('createdAt', 'desc')
    
    return inertia.render('auth/subscribers-lists/index', {
      user: auth.user,
      subscriberLists
    })
  }

  /**
   * Display form para crear una nueva relación entre contacto y lista
   */
  async create({ auth, inertia, response }: HttpContext) {
    const user = auth.user!
    
    // Obtener el tenant del usuario
    const tenantUser = await TenantUser.query()
      .where('userId', user.id)
      .where('active', true)
      .first()

    if (!tenantUser) {
      return response.badRequest({
        success: false,
        message: 'Usuario no tiene acceso a ningún tenant activo'
      })
    }

    const subscribers = await Subscriber.query()
      .where('tenantId', tenantUser.tenantId)
      .orderBy('email')
    
    const lists = await List.query()
      .where('tenantId', tenantUser.tenantId)
      .orderBy('name')
    
    return inertia.render('auth/subscribers-lists/create', {
      user: auth.user,
      subscribers,
      lists
    })
  }

  /**
   * Handle form para crear una nueva relación entre contacto y lista
   */
  async store({ request, response, auth }: HttpContext) {
    const user = auth.user!
    
    // Obtener el tenant del usuario
    const tenantUser = await TenantUser.query()
      .where('userId', user.id)
      .where('active', true)
      .first()

    if (!tenantUser) {
      return response.badRequest({
        success: false,
        message: 'Usuario no tiene acceso a ningún tenant activo'
      })
    }

    const data = request.only(['subscriberId', 'listId', 'status', 'source'])
    
    // Verify that both subscriber and list belong to the tenant
    await Subscriber.query()
      .where('id', data.subscriberId)
      .where('tenantId', tenantUser.tenantId)
      .firstOrFail()
    
    await List.query()
      .where('id', data.listId)
      .where('tenantId', tenantUser.tenantId)
      .firstOrFail()
    
    await SubscriberList.create({
      ...data,
      subscribedAt: DateTime.now()
    })
    
    return response.redirect().back()
  }

  /**
   * Mostrar una relación entre contacto y lista individual
   */
  async show({ params, auth, inertia, response }: HttpContext) {
    const user = auth.user!
    
    // Obtener el tenant del usuario
    const tenantUser = await TenantUser.query()
      .where('userId', user.id)
      .where('active', true)
      .first()

    if (!tenantUser) {
      return response.badRequest({
        success: false,
        message: 'Usuario no tiene acceso a ningún tenant activo'
      })
    }

    const subscriberList = await SubscriberList.query()
      .where('id', params.id)
      .whereHas('subscriber', (query) => {
        query.where('tenantId', tenantUser.tenantId)
      })
      .preload('subscriber')
      .preload('list')
      .firstOrFail()
    
    return inertia.render('auth/subscribers-lists/show', {
      user: auth.user,
      subscriberList
    })
  }

  /**
   * Editar una relación entre contacto y lista individual
   */
  async edit({ params, auth, inertia, response }: HttpContext) {
    const user = auth.user!
    
    // Obtener el tenant del usuario
    const tenantUser = await TenantUser.query()
      .where('userId', user.id)
      .where('active', true)
      .first()

    if (!tenantUser) {
      return response.badRequest({
        success: false,
        message: 'Usuario no tiene acceso a ningún tenant activo'
      })
    }

    const subscriberList = await SubscriberList.query()
      .where('id', params.id)
      .whereHas('subscriber', (query) => {
        query.where('tenantId', tenantUser.tenantId)
      })
      .preload('subscriber')
      .preload('list')
      .firstOrFail()
    
    const subscribers = await Subscriber.query()
      .where('tenantId', tenantUser.tenantId)
      .orderBy('email')
    
    const lists = await List.query()
      .where('tenantId', tenantUser.tenantId)
      .orderBy('name')
    
    return inertia.render('auth/subscribers-lists/edit', {
      user: auth.user,
      subscriberList,
      subscribers,
      lists
    })
  }

  /**
   * Handle form para editar una relación entre contacto y lista
   */
  async update({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    
    // Obtener el tenant del usuario
    const tenantUser = await TenantUser.query()
      .where('userId', user.id)
      .where('active', true)
      .first()

    if (!tenantUser) {
      return response.badRequest({
        success: false,
        message: 'Usuario no tiene acceso a ningún tenant activo'
      })
    }

    const subscriberList = await SubscriberList.query()
      .where('id', params.id)
      .whereHas('subscriber', (query) => {
        query.where('tenantId', tenantUser.tenantId)
      })
      .firstOrFail()
    
    const data = request.only(['subscriberId', 'listId', 'status', 'source'])
    
    // Verify that both subscriber and list belong to the tenant
    if (data.subscriberId) {
      await Subscriber.query()
        .where('id', data.subscriberId)
        .where('tenantId', tenantUser.tenantId)
        .firstOrFail()
    }
    
    if (data.listId) {
      await List.query()
        .where('id', data.listId)
        .where('tenantId', tenantUser.tenantId)
        .firstOrFail()
    }
    
    subscriberList.merge(data)
    await subscriberList.save()
    
    return response.redirect().back()
  }

  /**
   * Eliminar una relación entre contacto y lista
   */
  async destroy({ params, response, auth }: HttpContext) {
    const user = auth.user!
    
    // Obtener el tenant del usuario
    const tenantUser = await TenantUser.query()
      .where('userId', user.id)
      .where('active', true)
      .first()

    if (!tenantUser) {
      return response.badRequest({
        success: false,
        message: 'Usuario no tiene acceso a ningún tenant activo'
      })
    }

    const subscriberList = await SubscriberList.query()
      .where('id', params.id)
      .whereHas('subscriber', (query) => {
        query.where('tenantId', tenantUser.tenantId)
      })
      .firstOrFail()
    
    await subscriberList.delete()
    
    return response.redirect().back()
  }

  /**
   * Agregar un contacto a múltiples listas
   */
  async addToLists({ request, response, auth }: HttpContext) {
    const user = auth.user!
    
    // Obtener el tenant del usuario
    const tenantUser = await TenantUser.query()
      .where('userId', user.id)
      .where('active', true)
      .first()

    if (!tenantUser) {
      return response.badRequest({
        success: false,
        message: 'Usuario no tiene acceso a ningún tenant activo'
      })
    }

    const { subscriberId, listIds } = request.only(['subscriberId', 'listIds'])
    
    // Verify subscriber belongs to tenant
    await Subscriber.query()
      .where('id', subscriberId)
      .where('tenantId', tenantUser.tenantId)
      .firstOrFail()
    
    // Verify all lists belong to tenant
    await List.query()
      .whereIn('id', listIds)
      .where('tenantId', tenantUser.tenantId)
      .firstOrFail()
    
    // Create relationships
    const relationships = listIds.map((listId: number) => ({
      subscriberId,
      listId,
      status: 'active',
      source: 'manual',
      subscribedAt: DateTime.now()
    }))
    
    await SubscriberList.createMany(relationships)
    
    return response.redirect().back()
  }

  /**
   * Eliminar un contacto de una lista específica
   */
  async removeFromLists({ request, response, auth }: HttpContext) {
    const user = auth.user!
    
    // Obtener el tenant del usuario
    const tenantUser = await TenantUser.query()
      .where('userId', user.id)
      .where('active', true)
      .first()

    if (!tenantUser) {
      return response.badRequest({
        success: false,
        message: 'Usuario no tiene acceso a ningún tenant activo'
      })
    }

    const { subscriberId, listIds } = request.only(['subscriberId', 'listIds'])
    
    await SubscriberList.query()
      .where('subscriberId', subscriberId)
      .whereIn('listId', listIds)
      .whereHas('subscriber', (query) => {
        query.where('tenantId', tenantUser.tenantId)
      })
      .delete()
    
    return response.redirect().back()
  }
}