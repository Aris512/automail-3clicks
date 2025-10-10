import { useState, useEffect } from 'react'

interface PasswordStrengthProps {
  password: string
  onValidationChange?: (isValid: boolean, score: number) => void
}

interface PasswordRequirements {
  minLength: boolean
  hasUppercase: boolean
  hasLowercase: boolean
  hasNumbers: boolean
  hasSpecialChars: boolean
}

export default function PasswordStrength({ password, onValidationChange }: PasswordStrengthProps) {
  const [requirements, setRequirements] = useState<PasswordRequirements>({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumbers: false,
    hasSpecialChars: false
  })

  const [score, setScore] = useState(0)
  const [isValid, setIsValid] = useState(false)

  useEffect(() => {
    const newRequirements = {
      minLength: password.length >= 6,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChars: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    }

    const newScore = Object.values(newRequirements).filter(Boolean).length
    const newIsValid = newScore >= 4 && newRequirements.minLength

    setRequirements(newRequirements)
    setScore(newScore)
    setIsValid(newIsValid)

    if (onValidationChange) {
      onValidationChange(newIsValid, newScore)
    }
  }, [password, onValidationChange])

  const getScoreColor = () => {
    if (score <= 2) return 'bg-red-500'
    if (score === 3) return 'bg-yellow-500'
    if (score === 4) return 'bg-blue-500'
    return 'bg-green-500'
  }

  const getScoreText = () => {
    if (score <= 2) return 'Débil'
    if (score === 3) return 'Media'
    if (score === 4) return 'Buena'
    return 'Muy Fuerte'
  }

  if (!password) return null

  return (
    <div className="mt-2 space-y-2">
      {/* Barra de progreso */}
      <div className="flex items-center space-x-2">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${getScoreColor()}`}
            style={{ width: `${(score / 5) * 100}%` }}
          />
        </div>
        <span className={`text-sm font-medium ${
          score <= 2 ? 'text-red-600' : 
          score === 3 ? 'text-yellow-600' : 
          score === 4 ? 'text-blue-600' : 'text-green-600'
        }`}>
          {getScoreText()}
        </span>
      </div>

      {/* Lista de requisitos */}
      <div className="space-y-1">
        <div className={`text-xs flex items-center ${requirements.minLength ? 'text-green-600' : 'text-gray-500'}`}>
          <span className="mr-1">{requirements.minLength ? '✓' : '○'}</span>
          Mínimo 6 caracteres
        </div>
        <div className={`text-xs flex items-center ${requirements.hasUppercase ? 'text-green-600' : 'text-gray-500'}`}>
          <span className="mr-1">{requirements.hasUppercase ? '✓' : '○'}</span>
          Una letra mayúscula
        </div>
        <div className={`text-xs flex items-center ${requirements.hasLowercase ? 'text-green-600' : 'text-gray-500'}`}>
          <span className="mr-1">{requirements.hasLowercase ? '✓' : '○'}</span>
          Una letra minúscula
        </div>
        <div className={`text-xs flex items-center ${requirements.hasNumbers ? 'text-green-600' : 'text-gray-500'}`}>
          <span className="mr-1">{requirements.hasNumbers ? '✓' : '○'}</span>
          Un número
        </div>
        <div className={`text-xs flex items-center ${requirements.hasSpecialChars ? 'text-green-600' : 'text-gray-500'}`}>
          <span className="mr-1">{requirements.hasSpecialChars ? '✓' : '○'}</span>
          Un carácter especial
        </div>
      </div>
    </div>
  )
}
