import { BaseCommand } from '@adonisjs/core/ace'
import User from '#models/user'

export default class CheckUsers extends BaseCommand {
  static commandName = 'check:users'
  static description = 'Check users in database'

  async run() {
    this.logger.info('🔍 Verificando usuarios en la base de datos...')

    try {
      const users = await User.all()
      
      if (users.length === 0) {
        this.logger.info('❌ No hay usuarios en la base de datos')
        return
      }

      this.logger.info(`✅ Total de usuarios encontrados: ${users.length}`)

      users.forEach((user, index) => {
        this.logger.info(`👤 Usuario ${index + 1}:`)
        this.logger.info(`   ID: ${user.id}`)
        this.logger.info(`   Nombre: ${user.fullName}`)
        this.logger.info(`   Email: ${user.email}`)
        this.logger.info(`   Password Hash: ${user.password.substring(0, 20)}...`)
        this.logger.info('')
      })

    } catch (error) {
      this.logger.error('❌ Error al verificar usuarios:', error.message)
      this.logger.error('Stack:', error.stack)
    }
  }
}