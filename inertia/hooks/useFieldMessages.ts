import { useState, useCallback } from 'react'

interface FieldMessage {
  show: boolean
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
}

export function useFieldMessages() {
  const [messages, setMessages] = useState<Record<string, FieldMessage>>({})

  const showMessage = useCallback((fieldName: string, type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => {
    setMessages(prev => ({
      ...prev,
      [fieldName]: {
        show: true,
        type,
        title,
        message
      }
    }))
  }, [])

  const hideMessage = useCallback((fieldName: string) => {
    setMessages(prev => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        show: false
      }
    }))
  }, [])

  const getMessage = useCallback((fieldName: string): FieldMessage | null => {
    return messages[fieldName] || null
  }, [messages])

  const showError = useCallback((fieldName: string, title: string, message?: string) => {
    showMessage(fieldName, 'error', title, message)
  }, [showMessage])

  const showSuccess = useCallback((fieldName: string, title: string, message?: string) => {
    showMessage(fieldName, 'success', title, message)
  }, [showMessage])

  const showWarning = useCallback((fieldName: string, title: string, message?: string) => {
    showMessage(fieldName, 'warning', title, message)
  }, [showMessage])

  const showInfo = useCallback((fieldName: string, title: string, message?: string) => {
    showMessage(fieldName, 'info', title, message)
  }, [showMessage])

  return {
    getMessage,
    showError,
    showSuccess,
    showWarning,
    showInfo,
    hideMessage
  }
}
