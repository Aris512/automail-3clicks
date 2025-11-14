import Mustache from 'mustache'
import Template from '#models/template'
import Subscriber from '#models/subscriber'
import CampaignStageTemplate from '#models/campaign_stage_template'

export default class TemplateRenderService {
  /**
   * Procesa el placeholder "@lista de contactos" según el contexto de la plantilla
   * - Si la plantilla está asociada a una etapa/campaña con listas: reemplaza con {{nombre}}
   * - Si no hay contexto: elimina el placeholder silenciosamente
   * @param content - El contenido a procesar
   * @param template - La plantilla
   * @returns El contenido procesado
   */
  private async processPlaceholderAt(content: string, template: Template): Promise<string> {
    // Verificar si el contenido contiene "@lista de contactos"
    if (!content.includes('@lista de contactos')) {
      return content
    }

    // Buscar todas las asociaciones de la plantilla con etapas
    const stageTemplates = await CampaignStageTemplate.query()
      .where('templatesId', template.id)
      .preload('campaignStage', (query) => {
        query.preload('campaign', (campaignQuery) => {
          campaignQuery.preload('lists')
        })
      })

    // Si no está asociada a ninguna etapa, eliminar el placeholder
    if (stageTemplates.length === 0) {
      return content.replace(/@lista de contactos/g, '')
    }

    // Verificar si al menos una etapa tiene una campaña con listas asociadas
    const hasCampaignWithLists = stageTemplates.some((stageTemplate) => {
      const stage = stageTemplate.campaignStage
      if (!stage || !stage.campaign) {
        return false
      }
      const campaign = stage.campaign
      return campaign.lists && campaign.lists.length > 0
    })

    // Si tiene al menos una campaña con listas, reemplazar con {{nombre}}
    if (hasCampaignWithLists) {
      return content.replace(/@lista de contactos/g, '{{nombre}}')
    }

    // Si no tiene campañas con listas, eliminar el placeholder
    return content.replace(/@lista de contactos/g, '')
  }

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
   * Determina el conector apropiado para agregar el nombre del suscriptor al asunto
   * @param subject - El asunto a analizar
   * @returns El conector apropiado (con espacio si es necesario)
   */
  private determineConnector(subject: string): string {
    const trimmed = subject.trim().toLowerCase()
    
    // Si está vacío, no necesita conector
    if (!trimmed) return ''
    
    // Detectar saludos directos
    const greetings = ['hola', 'bienvenido', 'bienvenida', 'saludos', 'buenos días', 'buenas tardes', 'buenas noches']
    const firstWord = trimmed.split(/\s+/)[0]
    if (greetings.includes(firstWord)) {
      return ', '
    }
    
    // Detectar exclamaciones de saludo
    if (trimmed.match(/^[¡!]?\s*(hola|bienvenido|bienvenida)/i)) {
      return ' '
    }
    
    // Detectar frases que terminan con "de" (ej: "test de imagenes")
    if (trimmed.match(/\bde\s+\w+$/)) {
      return ' para '
    }
    
    // Detectar frases que terminan con "para" (ya tiene conector)
    if (trimmed.match(/\bpara\s*$/)) {
      return ' '
    }
    
    // Detectar frases que terminan con "con" (ya tiene conector)
    if (trimmed.match(/\bcon\s*$/)) {
      return ' '
    }
    
    // Detectar frases que terminan con "sobre", "acerca de"
    if (trimmed.match(/\b(sobre|acerca de)\s+\w+$/)) {
      return ' para '
    }
    
    // Detectar frases que terminan con verbos en infinitivo (ej: "enviar correo")
    if (trimmed.match(/\b(ar|er|ir)\s*$/)) {
      return ' para '
    }
    
    // Detectar frases que terminan con sustantivos (patrón común: sustantivo + "para")
    // Si la última palabra es un sustantivo común, usar "para"
    const commonNouns = ['información', 'noticia', 'actualización', 'recordatorio', 'invitación', 'promoción', 'oferta']
    const lastWord = trimmed.split(/\s+/).pop() || ''
    if (commonNouns.some(noun => lastWord.includes(noun))) {
      return ' para '
    }
    
    // Por defecto, usar "para" para la mayoría de casos
    return ' para '
  }

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

    // Procesar el placeholder "@lista de contactos" antes de renderizar
    const processedBody = await this.processPlaceholderAt(template.bodyMarkdown, template)
    const processedSubject = await this.processPlaceholderAt(template.subject, template)

    // Preparar los datos del suscriptor para el renderizado
    // Mustache escapa automáticamente HTML en variables normales, pero para HTML/Markdown
    // usamos triple mustaches {{{ }}} para renderizar sin escape
    // Soporta tanto {{nombre}} como {{subscriber.nombre}} para compatibilidad
    const subscriberData = {
      nombre: subscriber.name || '', // Para {{nombre}}
      name: subscriber.name || '', // Para {{name}} (compatibilidad)
      subscriber: {
        nombre: subscriber.name || '', // Para {{subscriber.nombre}}
        name: subscriber.name || '', // Para {{subscriber.name}}
        email: subscriber.email || '',
        description: subscriber.description || '',
      },
      email: subscriber.email || '',
      description: subscriber.description || '',
    }

    // Renderizar el subject (texto plano, se escapa automáticamente)
    let renderedSubject = Mustache.render(processedSubject, subscriberData)

    // Agregar automáticamente el nombre del suscriptor al final del asunto
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
            // Si hay signos de puntuación al final, insertar el nombre antes de ellos
            const punctuation = match[1]
            const subjectWithoutPunctuation = trimmedSubject.slice(0, -punctuation.length).trim()
            
            // Determinar el conector apropiado
            const connector = this.determineConnector(subjectWithoutPunctuation)
            renderedSubject = `${subjectWithoutPunctuation}${connector}${capitalizedName}${punctuation}`
          } else {
            // Si no hay signos de puntuación, determinar el conector apropiado
            const connector = this.determineConnector(trimmedSubject)
            renderedSubject = `${trimmedSubject}${connector}${capitalizedName}`
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
    const renderedBody = Mustache.render(processedBody, subscriberData)

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

