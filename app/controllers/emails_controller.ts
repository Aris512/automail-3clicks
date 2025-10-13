import type { HttpContext } from '@adonisjs/core/http'
import mail from '@adonisjs/mail/services/main'

export default class EmailsController {
    async sendEmail({ request, response }: HttpContext) {
        const { to, subject, messaje } = request.only(['to', 'subject', 'messaje'])

        await mail.send((msg) => {
            msg
                .to(to)
                .from('testjavier@airie.io')
                .subject(subject)
                .htmlView('emails/testDefault', { messaje })
        })

        return response.ok({ success: true, message: 'Email enviado correctamente' })
    }
}