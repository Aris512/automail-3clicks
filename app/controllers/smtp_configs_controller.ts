import type { HttpContext } from '@adonisjs/core/http'
import SmtpConfig from '#models/smtp_config'
import EmailSetup from '#models/email_setup'
import TenantUser from '#models/tenant_user'

export default class SmtpConfigsController {
  /**
   * Guardar configuración SMTP
   */
  async store({ request, response, auth }: HttpContext) {
    const { host, port, username, password, fromEmail, name } = request.only([
      'host', 'port', 'username', 'password', 'fromEmail', 'name'
    ])

    try {
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

      // Siempre crear un nuevo EmailSetup para cada configuración SMTP
      const emailSetup = await EmailSetup.create({
        tenantId: tenantUser.tenantId,
        userId: user.id,
        email: username,
        name: 'Configuración SMTP',
        from: fromEmail,
        active: true
      })

      
      // Verificar si ya existe una configuración idéntica para este usuario
      // Buscar en todos los emailSetups del usuario
      const userEmailSetups = await EmailSetup.query()
        .where('userId', user.id)
        .where('active', true)
        .select('id')

      const existingConfig = await SmtpConfig.query()
        .whereIn('emailSetupId', userEmailSetups.map(setup => setup.id))
        .where('user', username)
        .where('host', host)
        .where('port', port)
        .where('protocole', this.getProtocolByPort(parseInt(port)))
        .first()

      if (existingConfig) {
        return response.ok({
          success: true,
          message: 'Ya existe esa configuración',
          isDuplicate: true,
          data: {
            id: existingConfig.id,
            host: existingConfig.host,
            port: existingConfig.port,
            user: existingConfig.user,
            protocole: existingConfig.protocole
          }
        })
      }

      // Siempre crear una nueva configuración SMTP
      const smtpConfig = await SmtpConfig.create({
        emailSetupId: emailSetup.id,
        user: username,
        password: password,
        host: host,
        port: port,
        protocole: this.getProtocolByPort(parseInt(port)),
        name: name || null
      })

      return response.ok({
        success: true,
        message: 'Configuración SMTP guardada correctamente',
        data: {
          id: smtpConfig.id,
          host: smtpConfig.host,
          port: smtpConfig.port,
          user: smtpConfig.user,
          protocole: smtpConfig.protocole
        }
      })
    } catch (error) {
      console.error('Error al guardar configuración SMTP:', error)
      return response.internalServerError({
        success: false,
        message: 'Error al guardar la configuración SMTP'
      })
    }
  }

  /**
   * Obtener todas las configuraciones SMTP del usuario actual
   */
  async show({ response, auth }: HttpContext) {
    try {
      const user = auth.user!
      
      const emailSetups = await EmailSetup.query()
        .where('userId', user.id)
        .where('active', true)
        .preload('smtpConfig')
        .orderBy('createdAt', 'desc')

      if (!emailSetups.length) {
        return response.ok({
          success: true,
          data: [],
          message: 'No hay configuraciones SMTP guardadas'
        })
      }

      // Filtrar solo los que tienen configuración SMTP
      const configsWithSmtp = emailSetups.filter(setup => setup.smtpConfig)

      if (!configsWithSmtp.length) {
        return response.ok({
          success: true,
          data: [],
          message: 'No hay configuraciones SMTP guardadas'
        })
      }

      // Devolver todas las configuraciones
      const configs = configsWithSmtp.map(setup => ({
        id: setup.smtpConfig.id,
        host: setup.smtpConfig.host,
        port: setup.smtpConfig.port,
        user: setup.smtpConfig.user,
        protocole: setup.smtpConfig.protocole,
        fromEmail: setup.from,
        isActive: setup.smtpConfig.isActive,
        name: setup.smtpConfig.name,
        createdAt: setup.createdAt
      }))

      return response.ok({
        success: true,
        data: configs,
        message: `${configs.length} configuración(es) SMTP encontrada(s)`
      })
    } catch (error) {
      console.error('Error al obtener configuración SMTP:', error)
      return response.internalServerError({
        success: false,
        message: 'Error al obtener la configuración SMTP'
      })
    }
  }

  /**
   * Eliminar configuración SMTP
   */
  async destroy({ params, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      const configId = params.id

      // Buscar la configuración SMTP
      const smtpConfig = await SmtpConfig.query()
        .where('id', configId)
        .preload('emailSetup')
        .first()

      if (!smtpConfig) {
        return response.notFound({
          success: false,
          message: 'Configuración SMTP no encontrada'
        })
      }

      // Verificar que el usuario sea el propietario
      if (smtpConfig.emailSetup.userId !== user.id) {
        return response.forbidden({
          success: false,
          message: 'No tienes permisos para eliminar esta configuración'
        })
      }

      // Eliminar la configuración SMTP y el email setup asociado
      await smtpConfig.delete()
      await smtpConfig.emailSetup.delete()

      return response.ok({
        success: true,
        message: 'Configuración SMTP eliminada correctamente'
      })
    } catch (error) {
      console.error('Error al eliminar configuración SMTP:', error)
      return response.internalServerError({
        success: false,
        message: 'Error al eliminar la configuración SMTP'
      })
    }
  }

  /**
   * Actualizar una configuración SMTP
   */
  async update({ params, request, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      const configId = params.id
      const { host, port, username, password, fromEmail, name } = request.only([
        'host', 'port', 'username', 'password', 'fromEmail', 'name'
      ])

      // Buscar la configuración SMTP
      const smtpConfig = await SmtpConfig.query()
        .where('id', configId)
        .preload('emailSetup')
        .first()

      if (!smtpConfig) {
        return response.notFound({
          success: false,
          message: 'Configuración SMTP no encontrada'
        })
      }

      // Verificar que el usuario sea el propietario
      if (smtpConfig.emailSetup.userId !== user.id) {
        return response.forbidden({
          success: false,
          message: 'No tienes permisos para editar esta configuración'
        })
      }

      // Validar que se proporcione la contraseña
      if (!password || password.trim() === '') {
        return response.badRequest({
          success: false,
          message: 'La contraseña es requerida para actualizar la configuración'
        })
      }

      // Verificar que la contraseña proporcionada coincida con la guardada
      if (password !== smtpConfig.password) {
        return response.badRequest({
          success: false,
          message: 'La contraseña proporcionada no coincide con la contraseña guardada'
        })
      }

      // Verificar si los nuevos valores ya existen en otra configuración (excluyendo la actual)
      // Solo si se han cambiado los campos que definen la unicidad
      const hasChanged = (
        smtpConfig.host !== host ||
        smtpConfig.port !== port ||
        smtpConfig.user !== username ||
        smtpConfig.protocole !== this.getProtocolByPort(parseInt(port))
      )

      if (hasChanged) {
        // Buscar si existe otra configuración con los mismos valores
        const userEmailSetups = await EmailSetup.query()
          .where('userId', user.id)
          .where('active', true)
          .select('id')

        const existingConfig = await SmtpConfig.query()
          .whereIn('emailSetupId', userEmailSetups.map(setup => setup.id))
          .where('id', '!=', configId) // Excluir la configuración actual
          .where('user', username)
          .where('host', host)
          .where('port', port)
          .where('protocole', this.getProtocolByPort(parseInt(port)))
          .first()

        // Si existe otra configuración idéntica, permitir la actualización de todos modos
        // ya que es una actualización, no una creación nueva
        if (existingConfig) {
          // Opcional: Podrías decidir si quieres mostrar un warning o simplemente actualizar
          // Por ahora, permitimos la actualización
        }
      }

      // Actualizar la configuración SMTP
      smtpConfig.host = host
      smtpConfig.port = port
      smtpConfig.user = username
      smtpConfig.name = name || null
      smtpConfig.protocole = this.getProtocolByPort(parseInt(port))
      // Mantener la misma contraseña (ya validada)
      smtpConfig.password = password

      await smtpConfig.save()

      // Actualizar el email setup asociado
      smtpConfig.emailSetup.email = username
      smtpConfig.emailSetup.from = fromEmail
      await smtpConfig.emailSetup.save()

      return response.ok({
        success: true,
        message: 'Configuración SMTP actualizada correctamente',
        data: {
          id: smtpConfig.id,
          host: smtpConfig.host,
          port: smtpConfig.port,
          user: smtpConfig.user,
          protocole: smtpConfig.protocole,
          name: smtpConfig.name,
          fromEmail: smtpConfig.emailSetup.from
        }
      })
    } catch (error) {
      console.error('Error al actualizar configuración SMTP:', error)
      return response.internalServerError({
        success: false,
        message: 'Error al actualizar la configuración SMTP'
      })
    }
  }

  /**
   * Activar una configuración SMTP específica
   */
  async activate({ params, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      const configId = params.id

      // Buscar la configuración SMTP
      const smtpConfig = await SmtpConfig.query()
        .where('id', configId)
        .preload('emailSetup')
        .first()

      if (!smtpConfig) {
        return response.notFound({
          success: false,
          message: 'Configuración SMTP no encontrada'
        })
      }

      // Verificar que el usuario sea el propietario
      if (smtpConfig.emailSetup.userId !== user.id) {
        return response.forbidden({
          success: false,
          message: 'No tienes permisos para activar esta configuración'
        })
      }

      // Desactivar todas las configuraciones del usuario
      await SmtpConfig.query()
        .whereHas('emailSetup', (query) => {
          query.where('userId', user.id)
        })
        .update({ isActive: false })

      // Activar la configuración seleccionada
      smtpConfig.isActive = true
      await smtpConfig.save()

      return response.ok({
        success: true,
        message: 'Configuración SMTP activada correctamente',
        data: {
          id: smtpConfig.id,
          host: smtpConfig.host,
          port: smtpConfig.port,
          user: smtpConfig.user,
          protocole: smtpConfig.protocole,
          isActive: smtpConfig.isActive
        }
      })
    } catch (error) {
      console.error('Error al activar configuración SMTP:', error)
      return response.internalServerError({
        success: false,
        message: 'Error al activar la configuración SMTP'
      })
    }
  }

  /**
   * Determinar protocolo según el puerto
   */
  private getProtocolByPort(port: number): 'insecure' | 'ssl' | 'tls' {
    switch (port) {
      case 465:
        return 'ssl'
      case 587:
        return 'tls'
      case 25:
        return 'insecure'
      default:
        return 'tls'
    }
  }
}