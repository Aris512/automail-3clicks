export function validateEmail(email: string): { isValid: boolean; message?: string } {
  if (!email) {
    return { isValid: false, message: 'El email es requerido' }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { isValid: false, message: 'El formato del email no es válido' }
  }

  return { isValid: true }
}

export function validatePassword(password: string): { isValid: boolean; message?: string } {
  if (!password) {
    return { isValid: false, message: 'La contraseña es requerida' }
  }

  if (password.length < 6) {
    return { isValid: false, message: 'La contraseña debe tener al menos 6 caracteres' }
  }

  return { isValid: true }
}

export function validatePasswordForLogin(password: string): { isValid: boolean; message?: string } {
  if (!password) {
    return { isValid: false, message: 'La contraseña es requerida' }
  }

  // Para login, solo verificamos que no esté vacía
  // La verificación real se hace en el backend comparando con la BD
  return { isValid: true }
}

export function validateEmailForLogin(email: string): { isValid: boolean; message?: string } {
  if (!email) {
    return { isValid: false, message: 'El email es requerido' }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { isValid: false, message: 'El formato del email no es válido' }
  }

  return { isValid: true }
}

export function validateName(name: string, fieldName: string): { isValid: boolean; message?: string } {
  if (!name || name.trim().length === 0) {
    return { isValid: false, message: `El ${fieldName} es requerido` }
  }

  if (name.trim().length < 2) {
    return { isValid: false, message: `El ${fieldName} debe tener al menos 2 caracteres` }
  }

  // Verificar que no contenga números
  if (/\d/.test(name)) {
    return { isValid: false, message: `El ${fieldName} no puede contener números` }
  }

  // Verificar que solo contenga letras, espacios y algunos caracteres especiales comunes
  if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/.test(name)) {
    return { isValid: false, message: `El ${fieldName} solo puede contener letras` }
  }

  return { isValid: true }
}

export function validateOrganizationName(name: string): { isValid: boolean; message?: string } {
  if (!name || name.trim().length === 0) {
    return { isValid: false, message: 'El nombre de la organización es requerido' }
  }

  if (name.trim().length < 2) {
    return { isValid: false, message: 'El nombre de la organización debe tener al menos 2 caracteres' }
  }

  return { isValid: true }
}
