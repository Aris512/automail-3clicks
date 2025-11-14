import Mustache from 'mustache'
import Template from '#models/template'
import Subscriber from '#models/subscriber'
import CampaignStage from '#models/campaign_stage'
import Campaign from '#models/campaign'

export default class TemplateRenderService {
  /**
   * Verifica si el nombre del suscriptor ya está presente en el asunto
   * @param subject - El asunto a verificar
   * @param subscriberName - El nombre del suscriptor
   * @returns true si el nombre ya está presente (comparación insensible a mayúsculas)
   */
  private isNameAlreadyInSubject(subject: string, subscriberName: string): boolean {
    if (!subscriberName || !subject) return false
    
    // Normalizar ambos textos para comparación (minúsculas, sin acentos opcionales)
    const normalizedSubject = subject.toLowerCase().trim()
    const normalizedName = subscriberName.toLowerCase().trim()
    
    // Verificar si el nombre completo está presente
    if (normalizedSubject.includes(normalizedName)) {
      return true
    }
    
    // Verificar si alguna palabra del nombre está presente (para nombres compuestos)
    const nameWords = normalizedName.split(/\s+/).filter(word => word.length > 2)
    const subjectWords = normalizedSubject.split(/\s+/)
    
    // Si todas las palabras del nombre están en el asunto, considerarlo presente
    if (nameWords.length > 1) {
      const allWordsPresent = nameWords.every(word => 
        subjectWords.some(subjectWord => subjectWord.includes(word) || word.includes(subjectWord))
      )
      if (allWordsPresent) return true
    }
    
    return false
  }

  /**
   * Capitaliza apropiadamente el nombre del suscriptor
   * Capitaliza la primera letra de cada palabra, respetando mayúsculas existentes en medio de palabras
   * @param name - El nombre a capitalizar
   * @returns El nombre capitalizado apropiadamente (ej: "jorge torres" → "Jorge Torres")
   */
  private capitalizeName(name: string): string {
    if (!name) return ''
    
    const trimmed = name.trim()
    if (!trimmed) return ''
    
    // Dividir en palabras y capitalizar cada una
    return trimmed
      .split(/\s+/)
      .map(word => {
        if (!word) return word
        // Si la palabra ya tiene mayúsculas en medio (ej: "McDonald", "O'Brien"), respetarlas
        // Solo capitalizar la primera letra si está en minúscula
        if (word[0] === word[0].toUpperCase()) {
          return word
        }
        return word.charAt(0).toUpperCase() + word.slice(1)
      })
      .join(' ')
  }


  /**
   * Obtiene los valores de variables personalizadas en cascada (etapa > campaña)
   * @param template - La plantilla con las variables disponibles
   * @param stage - La etapa de la campaña (opcional)
   * @param campaign - La campaña (opcional)
   * @returns Objeto con los valores de variables personalizadas
   */
  private getVariableValues(
    template: Template,
    stage?: CampaignStage,
    campaign?: Campaign
  ): Record<string, string> {
    // Obtener variables personalizadas del template
    const availableVariables = template.availableVariables || []
    
    if (!Array.isArray(availableVariables) || availableVariables.length === 0) {
      return {}
    }

    // Inicializar valores vacíos para todas las variables personalizadas
    const variableValues: Record<string, string> = {}
    
    // Primero, obtener valores de la campaña (si existe)
    const campaignValues = campaign?.variableValues || {}
    
    // Luego, obtener valores de la etapa (si existe) - estos sobrescriben los de campaña
    const stageValues = stage?.variableValues || {}
    
    // Combinar: valores de etapa sobrescriben valores de campaña
    // Solo incluir variables que están definidas en availableVariables
    for (const varName of availableVariables) {
      if (typeof varName === 'string' && varName.trim()) {
        const varKey = varName.trim()
        // Prioridad: etapa > campaña > vacío
        variableValues[varKey] = stageValues[varKey] || campaignValues[varKey] || ''
      }
    }
    
    return variableValues
  }

  /**
   * Renderiza una plantilla con los datos de un suscriptor
   * @param template - La plantilla a renderizar
   * @param subscriber - El suscriptor con los datos para el renderizado
   * @param stage - La etapa de la campaña (opcional, para obtener valores de variables)
   * @param campaign - La campaña (opcional, para obtener valores de variables)
   * @returns Objeto con el subject y body renderizados
   * @throws Error si el tenantId no coincide
   */
  async render(
    template: Template,
    subscriber: Subscriber,
    stage?: CampaignStage,
    campaign?: Campaign
  ): Promise<{
    subject: string
    body: string
  }> {
    // Validar que ambos pertenezcan al mismo tenant
    if (template.tenantId !== subscriber.tenantId) {
      throw new Error(
        `El template (tenantId: ${template.tenantId}) y el subscriber (tenantId: ${subscriber.tenantId}) no pertenecen al mismo tenant`
      )
    }

    // Obtener valores de variables personalizadas en cascada
    const customVariableValues = this.getVariableValues(template, stage, campaign)

    // Preparar los datos del suscriptor para el renderizado
    // Mustache escapa automáticamente HTML en variables normales, pero para HTML/Markdown
    // usamos triple mustaches {{{ }}} para renderizar sin escape
    // Soporta tanto {{nombre}} como {{subscriber.nombre}} para compatibilidad
    const subscriberData = {
      // Variables del contacto (siempre disponibles)
      nombre_contacto: subscriber.name || '', // Para {{nombre_contacto}}
      email_contacto: subscriber.email || '', // Para {{email_contacto}}
      nombre: subscriber.name || '', // Para {{nombre}} (compatibilidad)
      name: subscriber.name || '', // Para {{name}} (compatibilidad)
      subscriber: {
        nombre: subscriber.name || '', // Para {{subscriber.nombre}}
        name: subscriber.name || '', // Para {{subscriber.name}}
        email: subscriber.email || '',
        description: subscriber.description || '',
      },
      email: subscriber.email || '',
      description: subscriber.description || '',
      // Variables personalizadas con sus valores
      ...customVariableValues,
    }

    // Renderizar el subject (texto plano, se escapa automáticamente)
    let renderedSubject = Mustache.render(template.subject, subscriberData)

    // Agregar automáticamente el nombre del suscriptor al inicio del asunto (formato: "nombre" + "asunto")
    const subscriberName = subscriber.name || ''
    if (subscriberName) {
      // Verificar si el nombre ya está presente en el asunto para evitar redundancia
      if (this.isNameAlreadyInSubject(renderedSubject, subscriberName)) {
        // El nombre ya está presente, no agregarlo nuevamente
        // Solo capitalizar apropiadamente el asunto si es necesario
        renderedSubject = renderedSubject.trim()
      } else {
        // Capitalizar apropiadamente el nombre
        const capitalizedName = this.capitalizeName(subscriberName)
        
        // Limpiar espacios al final del asunto renderizado
        const trimmedSubject = renderedSubject.trim()
        
        if (trimmedSubject) {
          // Detectar signos de puntuación al final (¡!¿?.,;:)
          const punctuationRegex = /([¡!¿?.,;:]+)$/
          const match = trimmedSubject.match(punctuationRegex)
          
          if (match) {
            // Si hay signos de puntuación al final, mantenerlos al final
            const punctuation = match[1]
            const subjectWithoutPunctuation = trimmedSubject.slice(0, -punctuation.length).trim()
            
            // Formato: "nombre" + "asunto" + "signos de puntuación"
            // Usar coma como separador cuando hay signos de puntuación
            renderedSubject = `${capitalizedName}, ${subjectWithoutPunctuation}${punctuation}`
          } else {
            // Si no hay signos de puntuación, usar formato simple: "nombre" + "asunto"
            renderedSubject = `${capitalizedName}, ${trimmedSubject}`
          }
        } else {
          // Si el asunto está vacío, solo mostrar el nombre capitalizado
          renderedSubject = capitalizedName
        }
      }
    }

    // Renderizar el body_markdown
    // Si el template usa {{variable}} escapa HTML, si usa {{{variable}}} no escapa
    // Para emails HTML, normalmente queremos que el contenido se mantenga como HTML
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

