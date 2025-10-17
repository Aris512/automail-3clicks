import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'smtp_configs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      
      table
      .integer('email_setup_id')
      .unsigned()
      .notNullable()
      .unique()
      .references('id')
      .inTable('email_setups')
      .onDelete('CASCADE')

      table.string('user', 255).notNullable()
      table.string('password', 255).notNullable()
      table.string('host', 255).notNullable()
      table.string('port', 255).notNullable()
      table.enum('protocole', ['insecure', 'ssl', 'tls']).notNullable()
      
      table.timestamps(true, true)
      table.boolean('is_active').defaultTo(false)

    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}