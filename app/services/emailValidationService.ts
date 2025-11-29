import { validate } from 'deep-email-validator'

export interface EmailValidationResult {
  valid: boolean
  reason?: string
  validators?: {
    validators?: {
      regex?: { valid: boolean; reason?: string }
      typo?: { valid: boolean; reason?: string }
      disposable?: { valid: boolean; reason?: string }
      mx?: { valid: boolean; reason?: string }
      smtp?: { valid: boolean; reason?: string }
    }
  }
}

export default class EmailValidationService {
  private readonly timeout: number
  private readonly validateSMTP: boolean

  constructor(timeout: number = 5000, validateSMTP: boolean = true) {
    this.timeout = timeout
    this.validateSMTP = validateSMTP
  }

  /**
   * Valida la sintaxis básica de un email usando regex
   * @param email - Dirección de correo a validar
   * @returns true si el formato es válido
   */
  isValidSyntax(email: string): boolean {
    if (!email || typeof email !== 'string') {
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email.trim())
  }

  /**
   * Valida una dirección de correo usando deep-email-validator
   * Realiza validación completa: sintaxis, MX, SMTP, etc.
   * @param email - Dirección de correo a validar
   * @returns Resultado de la validación
   */
  async validateEmail(email: string): Promise<EmailValidationResult> {
    // Primero validar sintaxis básica (rápido)
    if (!this.isValidSyntax(email)) {
      return {
        valid: false,
        reason: 'Formato de email inválido',
      }
    }

    try {
      // Configurar opciones de validación
      const validationOptions = {
        email: email.trim(),
        validateRegex: true,
        validateMx: true,
        validateTypo: true,
        validateDisposable: true,
        validateSMTP: this.validateSMTP,
        timeout: this.timeout,
      }

      // Ejecutar validación con timeout
      const result = await Promise.race([
        validate(validationOptions),
        this.createTimeoutPromise(),
      ])

      // Si el resultado es el timeout, retornar error
      if (result === 'timeout') {
        return {
          valid: false,
          reason: 'Timeout al validar email (el servidor no respondió a tiempo)',
        }
      }

      // El resultado de validate tiene una estructura específica
      // deep-email-validator retorna: { valid: boolean, validators: { regex: {...}, mx: {...}, smtp: {...}, ... } }
      const validationResult = result as any

      // Verificar si el resultado tiene la propiedad 'valid' directamente
      if (validationResult.valid === false) {
        // Si valid es false, construir el mensaje de razón
        const validators = validationResult.validators || {}
        const reasons: string[] = []
        
        if (validators.regex?.valid === false) {
          reasons.push(`Formato inválido: ${validators.regex.reason || 'regex falló'}`)
        }
        if (validators.typo?.valid === false) {
          reasons.push(`Posible error tipográfico: ${validators.typo.reason || 'typo detectado'}`)
        }
        if (validators.disposable?.valid === false) {
          reasons.push(`Email desechable: ${validators.disposable.reason || 'dominio desechable'}`)
        }
        if (validators.mx?.valid === false) {
          reasons.push(`Dominio sin MX: ${validators.mx.reason || 'no hay registros MX'}`)
        }
        if (this.validateSMTP && validators.smtp?.valid === false) {
          reasons.push(`SMTP inválido: ${validators.smtp.reason || 'servidor SMTP rechazó el email'}`)
        }

        return {
          valid: false,
          reason: reasons.join('; ') || 'Email inválido',
          validators: {
            validators: {
              regex: validators.regex,
              typo: validators.typo,
              disposable: validators.disposable,
              mx: validators.mx,
              smtp: validators.smtp,
            },
          },
        }
      }

      // Si valid es true o undefined, verificar manualmente los validadores
      const validators = validationResult.validators || {}
      const isValid =
        validationResult.valid === true ||
        (validators.regex?.valid !== false &&
         validators.typo?.valid !== false &&
         validators.disposable?.valid !== false &&
         validators.mx?.valid !== false &&
         (this.validateSMTP ? validators.smtp?.valid !== false : true))

      return {
        valid: isValid,
        reason: isValid ? undefined : 'Email inválido',
        validators: {
          validators: {
            regex: validators.regex,
            typo: validators.typo,
            disposable: validators.disposable,
            mx: validators.mx,
            smtp: validators.smtp,
          },
        },
      }
    } catch (error: any) {
      // En caso de error, retornar resultado inválido con el mensaje de error
      return {
        valid: false,
        reason: `Error al validar email: ${error.message || 'Error desconocido'}`,
      }
    }
  }

  /**
   * Crea una promesa que se resuelve después del timeout
   * @returns Promesa que se resuelve con 'timeout'
   */
  private createTimeoutPromise(): Promise<'timeout'> {
    return new Promise((resolve) => {
      setTimeout(() => resolve('timeout'), this.timeout)
    })
  }

  /**
   * Valida múltiples emails de forma secuencial
   * Útil para validar listas de suscriptores
   * @param emails - Array de direcciones de correo
   * @returns Array de resultados de validación
   */
  async validateEmails(emails: string[]): Promise<Array<{ email: string; result: EmailValidationResult }>> {
    const results: Array<{ email: string; result: EmailValidationResult }> = []

    for (const email of emails) {
      const result = await this.validateEmail(email)
      results.push({ email, result })
    }

    return results
  }
}

