import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'subscribers'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('company')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('company').nullable()
    })
  }
}