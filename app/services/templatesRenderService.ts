import Mustache from 'mustache'
import Template from '#models/template'
import Subscriber from '#models/subscriber'

export default class TemplateRenderService {
  /**
   * Renderiza una plantilla con los datos de un suscriptor
   * @param template - La plantilla a renderizar
   * @param subscriber - El suscriptor con los datos para el renderizado
   * @returns Objeto con el subject y body renderizados
   * @throws Error si el tenantId no coincide
   */
  async render(template: Template, subscriber: Subscriber): Promise<{
    subject: string
    body: string
  }> {
    // Validar que ambos pertenezcan al mismo tenant
    if (template.tenantId !== subscriber.tenantId) {
      throw new Error(
        `El template (tenantId: ${template.tenantId}) y el subscriber (tenantId: ${subscriber.tenantId}) no pertenecen al mismo tenant`
      )
    }

    // Preparar los datos del suscriptor para el renderizado
    const subscriberData = {
      name: subscriber.name || '',
      email: subscriber.email || '',
      description: subscriber.description || '',
    }

    // Renderizar el subject y body_markdown usando mustache
    const renderedSubject = Mustache.render(template.subject, subscriberData)
    const renderedBody = Mustache.render(template.bodyMarkdown, subscriberData)

    return {
      subject: renderedSubject,
      body: renderedBody,
    }
  }

  /**
   * Renderiza una plantilla por ID con los datos de un suscriptor
   * @param templateId - ID de la plantilla
   * @param subscriberId - ID del suscriptor
   * @returns Objeto con el subject y body renderizados
   */
  async renderById(templateId: number, subscriberId: number): Promise<{
    subject: string
    body: string
  }> {
    // Cargar template y subscriber
    const template = await Template.findOrFail(templateId)
    const subscriber = await Subscriber.findOrFail(subscriberId)

    return this.render(template, subscriber)
  }

  /**
   * Renderiza múltiples plantillas para múltiples suscriptores
   * @param template - La plantilla a renderizar
   * @param subscribers - Array de suscriptores
   * @returns Array de objetos con subject y body renderizados para cada suscriptor
   */
  async renderMultiple(
    template: Template,
    subscribers: Subscriber[]
  ): Promise<Array<{
    subscriber: Subscriber
    subject: string
    body: string
  }>> {
    const results = []

    for (const subscriber of subscribers) {
      try {
        const rendered = await this.render(template, subscriber)
        results.push({
          subscriber,
          ...rendered,
        })
      } catch (error) {
        // Log del error pero continuar con los demás suscriptores
        console.error(
          `Error al renderizar plantilla para subscriber ${subscriber.id}:`,
          error
        )
      }
    }

    return results
  }
}

