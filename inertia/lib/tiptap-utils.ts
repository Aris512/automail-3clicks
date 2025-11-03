import type { Node as TiptapNode } from "@tiptap/pm/model"
import { NodeSelection, Selection, TextSelection } from "@tiptap/pm/state"
import type { Editor } from "@tiptap/react"

export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export const MAC_SYMBOLS: Record<string, string> = {
  mod: "⌘",
  command: "⌘",
  meta: "⌘",
  ctrl: "⌃",
  control: "⌃",
  alt: "⌥",
  option: "⌥",
  shift: "⇧",
  backspace: "Del",
  delete: "⌦",
  enter: "⏎",
  escape: "⎋",
  capslock: "⇪",
} as const

export function cn(
  ...classes: (string | boolean | undefined | null)[]
): string {
  return classes.filter(Boolean).join(" ")
}

/**
 * Determines if the current platform is macOS
 * @returns boolean indicating if the current platform is Mac
 */
export function isMac(): boolean {
  return (
    typeof navigator !== "undefined" &&
    navigator.platform.toLowerCase().includes("mac")
  )
}

/**
 * Formats a shortcut key based on the platform (Mac or non-Mac)
 * @param key - The key to format (e.g., "ctrl", "alt", "shift")
 * @param isMac - Boolean indicating if the platform is Mac
 * @param capitalize - Whether to capitalize the key (default: true)
 * @returns Formatted shortcut key symbol
 */
export const formatShortcutKey = (
  key: string,
  isMac: boolean,
  capitalize: boolean = true
) => {
  if (isMac) {
    const lowerKey = key.toLowerCase()
    return MAC_SYMBOLS[lowerKey] || (capitalize ? key.toUpperCase() : key)
  }

  return capitalize ? key.charAt(0).toUpperCase() + key.slice(1) : key
}

/**
 * Parses a shortcut key string into an array of formatted key symbols
 * @param shortcutKeys - The string of shortcut keys (e.g., "ctrl-alt-shift")
 * @param delimiter - The delimiter used to split the keys (default: "-")
 * @param capitalize - Whether to capitalize the keys (default: true)
 * @returns Array of formatted shortcut key symbols
 */
export const parseShortcutKeys = (props: {
  shortcutKeys: string | undefined
  delimiter?: string
  capitalize?: boolean
}) => {
  const { shortcutKeys, delimiter = "+", capitalize = true } = props

  if (!shortcutKeys) return []

  return shortcutKeys
    .split(delimiter)
    .map((key) => key.trim())
    .map((key) => formatShortcutKey(key, isMac(), capitalize))
}

/**
 * Checks if a mark exists in the editor schema
 * @param markName - The name of the mark to check
 * @param editor - The editor instance
 * @returns boolean indicating if the mark exists in the schema
 */
export const isMarkInSchema = (
  markName: string,
  editor: Editor | null
): boolean => {
  if (!editor?.schema) return false
  return editor.schema.spec.marks.get(markName) !== undefined
}

/**
 * Checks if a node exists in the editor schema
 * @param nodeName - The name of the node to check
 * @param editor - The editor instance
 * @returns boolean indicating if the node exists in the schema
 */
export const isNodeInSchema = (
  nodeName: string,
  editor: Editor | null
): boolean => {
  if (!editor?.schema) return false
  return editor.schema.spec.nodes.get(nodeName) !== undefined
}

/**
 * Moves the focus to the next node in the editor
 * @param editor - The editor instance
 * @returns boolean indicating if the focus was moved
 */
export function focusNextNode(editor: Editor) {
  const { state, view } = editor
  const { doc, selection } = state

  const nextSel = Selection.findFrom(selection.$to, 1, true)
  if (nextSel) {
    view.dispatch(state.tr.setSelection(nextSel).scrollIntoView())
    return true
  }

  const paragraphType = state.schema.nodes.paragraph
  if (!paragraphType) {
    console.warn("No paragraph node type found in schema.")
    return false
  }

  const end = doc.content.size
  const para = paragraphType.create()
  let tr = state.tr.insert(end, para)

  // Place the selection inside the new paragraph
  const $inside = tr.doc.resolve(end + 1)
  tr = tr.setSelection(TextSelection.near($inside)).scrollIntoView()
  view.dispatch(tr)
  return true
}

/**
 * Checks if a value is a valid number (not null, undefined, or NaN)
 * @param value - The value to check
 * @returns boolean indicating if the value is a valid number
 */
export function isValidPosition(pos: number | null | undefined): pos is number {
  return typeof pos === "number" && pos >= 0
}

/**
 * Checks if one or more extensions are registered in the Tiptap editor.
 * @param editor - The Tiptap editor instance
 * @param extensionNames - A single extension name or an array of names to check
 * @returns True if at least one of the extensions is available, false otherwise
 */
export function isExtensionAvailable(
  editor: Editor | null,
  extensionNames: string | string[]
): boolean {
  if (!editor) return false

  const names = Array.isArray(extensionNames)
    ? extensionNames
    : [extensionNames]

  const found = names.some((name) =>
    editor.extensionManager.extensions.some((ext) => ext.name === name)
  )

  if (!found) {
    console.warn(
      `None of the extensions [${names.join(", ")}] were found in the editor schema. Ensure they are included in the editor configuration.`
    )
  }

  return found
}

/**
 * Finds a node at the specified position with error handling
 * @param editor The Tiptap editor instance
 * @param position The position in the document to find the node
 * @returns The node at the specified position, or null if not found
 */
export function findNodeAtPosition(editor: Editor, position: number) {
  try {
    const node = editor.state.doc.nodeAt(position)
    if (!node) {
      console.warn(`No node found at position ${position}`)
      return null
    }
    return node
  } catch (error) {
    console.error(`Error getting node at position ${position}:`, error)
    return null
  }
}

/**
 * Finds the position and instance of a node in the document
 * @param props Object containing editor, node (optional), and nodePos (optional)
 * @param props.editor The Tiptap editor instance
 * @param props.node The node to find (optional if nodePos is provided)
 * @param props.nodePos The position of the node to find (optional if node is provided)
 * @returns An object with the position and node, or null if not found
 */
export function findNodePosition(props: {
  editor: Editor | null
  node?: TiptapNode | null
  nodePos?: number | null
}): { pos: number; node: TiptapNode } | null {
  const { editor, node, nodePos } = props

  if (!editor || !editor.state?.doc) return null

  // Zero is valid position
  const hasValidNode = node !== undefined && node !== null
  const hasValidPos = isValidPosition(nodePos)

  if (!hasValidNode && !hasValidPos) {
    return null
  }

  // First search for the node in the document if we have a node
  if (hasValidNode) {
    let foundPos = -1
    let foundNode: TiptapNode | null = null

    editor.state.doc.descendants((currentNode, pos) => {
      // TODO: Needed?
      // if (currentNode.type && currentNode.type.name === node!.type.name) {
      if (currentNode === node) {
        foundPos = pos
        foundNode = currentNode
        return false
      }
      return true
    })

    if (foundPos !== -1 && foundNode !== null) {
      return { pos: foundPos, node: foundNode }
    }
  }

  // If we have a valid position, use findNodeAtPosition
  if (hasValidPos) {
    const nodeAtPos = findNodeAtPosition(editor, nodePos!)
    if (nodeAtPos) {
      return { pos: nodePos!, node: nodeAtPos }
    }
  }

  return null
}

/**
 * Checks if the current selection in the editor is a node selection of specified types
 * @param editor The Tiptap editor instance
 * @param types An array of node type names to check against
 * @returns boolean indicating if the selected node matches any of the specified types
 */
export function isNodeTypeSelected(
  editor: Editor | null,
  types: string[] = []
): boolean {
  if (!editor || !editor.state.selection) return false

  const { state } = editor
  const { selection } = state

  if (selection.empty) return false

  if (selection instanceof NodeSelection) {
    const node = selection.node
    return node ? types.includes(node.type.name) : false
  }

  return false
}

/**
 * Converts the first page of a PDF to an image (PNG)
 * @param pdfFile The PDF file to convert
 * @returns Promise resolving to a File object containing the PNG image
 */
async function convertPdfToImage(pdfFile: File): Promise<File> {
  try {
    // Dynamic import of pdfjs-dist
    const pdfjsLib = await import('pdfjs-dist')
    
    // Set worker
    if (pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString()
    }

    // Read PDF file as array buffer
    const arrayBuffer = await pdfFile.arrayBuffer()
    
    // Load PDF
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
    const pdf = await loadingTask.promise
    
    // Get first page
    const page = await pdf.getPage(1)
    
    // Create viewport (higher scale for better quality)
    const viewport = page.getViewport({ scale: 2.0 })
    
    // Create canvas
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    
    if (!context) {
      throw new Error('No se pudo obtener el contexto del canvas')
    }
    
    canvas.height = viewport.height
    canvas.width = viewport.width
    
    // Render PDF page to canvas
    await page.render({
      canvasContext: context,
      viewport: viewport
    } as any).promise
    
    // Convert canvas to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('No se pudo convertir el canvas a blob'))
        }
      }, 'image/png')
    })
    
    // Create File from blob
    const imageFile = new File(
      [blob],
      pdfFile.name.replace(/\.pdf$/i, '.png'),
      { type: 'image/png' }
    )
    
    return imageFile
  } catch (error) {
    console.error('Error converting PDF to image:', error)
    throw new Error('No se pudo convertir el PDF a imagen')
  }
}

/**
 * Handles image upload with progress tracking and abort capability
 * @param file The file to upload
 * @param onProgress Optional callback for tracking upload progress
 * @param abortSignal Optional AbortSignal for cancelling the upload
 * @returns Promise resolving to the URL of the uploaded image
 */
export const handleImageUpload = async (
  file: File,
  onProgress?: (event: { progress: number }) => void,
  abortSignal?: AbortSignal
): Promise<string> => {
  // Validate file
  if (!file) {
    throw new Error("No file provided")
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File size exceeds maximum allowed (${MAX_FILE_SIZE / (1024 * 1024)}MB)`
    )
  }

  try {
    // Detectar si es PDF y convertirlo a imagen
    let fileToUpload = file
    if (file.type === 'application/pdf') {
      console.log('📄 Detectado PDF, convirtiendo primera página a imagen...')
      onProgress?.({ progress: 10 })
      fileToUpload = await convertPdfToImage(file)
      onProgress?.({ progress: 40 })
      console.log('✅ PDF convertido a imagen:', fileToUpload.name)
    }
    
    // Subir archivo al servidor
    const formData = new FormData()
    formData.append('file', fileToUpload)
    
    // Obtener token CSRF
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
    
    // Iniciar simulación de progreso en paralelo con la petición
    const progressPromise = (async () => {
      const startProgress = file.type === 'application/pdf' ? 40 : 0
      const endProgress = 90
      for (let i = startProgress; i <= endProgress; i += 3) {
        if (abortSignal?.aborted) {
          throw new Error("Upload cancelled")
        }
        await new Promise((resolve) => setTimeout(resolve, 100)) // 100ms por paso
        onProgress?.({ progress: i })
      }
    })()
    
    // Realizar la petición real al servidor
    const response = await fetch('/attachments/temp', {
      method: 'POST',
      headers: {
        'X-CSRF-TOKEN': csrfToken,
        'Accept': 'application/json'
      },
      body: formData,
      signal: abortSignal
    })
    
    // Esperar a que termine la simulación de progreso (si aún no terminó)
    await progressPromise
    
    // Validar respuesta
    const data = await response.json()
    
    if (!response.ok || !data.success || !data.data) {
      throw new Error(data.message || 'Error al subir la imagen')
    }
    
    // Solo marcar 100% si todo fue exitoso
    onProgress?.({ progress: 100 })
    
    // Retornar la URL completa del archivo subido
    return data.data.path
  } catch (error) {
    console.error('Error uploading image:', error)
    throw error
  }
}

/**
 * Construye una URL absoluta para un path relativo
 * Si el path ya es absoluto (empieza con http:// o https://), lo retorna tal cual
 * Si el path es relativo (empieza con /), lo convierte a URL absoluta usando window.location.origin
 */
function buildAbsoluteUrl(path: string): string {
  if (!path) return path
  
  // Si ya es una URL absoluta, retornarla tal cual
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path
  }
  
  // Si es una ruta relativa que empieza con /, construir URL absoluta
  if (path.startsWith('/')) {
    // Usar window.location.origin para obtener el dominio actual
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return `${origin}${path}`
  }
  
  // Si no empieza con /, asumir que es relativa y agregar /
  return typeof window !== 'undefined' ? `${window.location.origin}/${path}` : path
}

/**
 * Sube archivos al servidor y los inserta en el editor usando las URLs del servidor
 * Similar a handleImageUpload pero diseñado para trabajar con ImagePreview extension
 * @param files Array de archivos a subir e insertar
 * @param editor El editor de Tiptap donde se insertarán las imágenes
 * @returns Promise que se resuelve cuando todas las imágenes se han subido e insertado
 */
export const handleImageUploadAndInsert = async (
  files: File[],
  editor: Editor
): Promise<void> => {
  if (!files || files.length === 0) {
    console.warn('[handleImageUploadAndInsert] No files provided')
    return
  }

  if (!editor) {
    console.error('[handleImageUploadAndInsert] No editor provided')
    return
  }

  // Obtener token CSRF una sola vez
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''

  // Procesar cada archivo
  for (const file of files) {
    if (!file || !file.type) {
      console.warn('[handleImageUploadAndInsert] Skipping invalid file:', file)
      continue
    }

    try {
      // Validar tamaño
      if (file.size > MAX_FILE_SIZE) {
        console.error(`[handleImageUploadAndInsert] File ${file.name} exceeds size limit`)
        continue
      }

      // Si es imagen, subir directamente
      if (file.type.startsWith('image/')) {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/attachments/temp', {
          method: 'POST',
          headers: {
            'X-CSRF-TOKEN': csrfToken,
            'Accept': 'application/json'
          },
          body: formData
        })

        const data = await response.json()

        if (response.ok && data.success && data.data) {
          // Construir URL absoluta para asegurar que la imagen se cargue correctamente
          const imageUrl = buildAbsoluteUrl(data.data.path)
          
          console.log('[handleImageUploadAndInsert] Path del servidor:', data.data.path)
          console.log('[handleImageUploadAndInsert] URL absoluta construida:', imageUrl)
          
          // Insertar imagen usando la URL absoluta del servidor
          editor.chain().focus().setImage({
            src: imageUrl,
            alt: file.name,
            title: file.name
          }).run()
          console.log('[handleImageUploadAndInsert] Imagen insertada correctamente')
        } else {
          console.error('[handleImageUploadAndInsert] Error al subir imagen:', data.message)
        }
      }
      // Si es PDF, convertir a imagen y luego subir
      else if (file.type === 'application/pdf') {
        try {
          // Convertir PDF a imagen
          const imageFile = await convertPdfToImage(file)
          
          const formData = new FormData()
          formData.append('file', imageFile)

          const response = await fetch('/attachments/temp', {
            method: 'POST',
            headers: {
              'X-CSRF-TOKEN': csrfToken,
              'Accept': 'application/json'
            },
            body: formData
          })

          const data = await response.json()

          if (response.ok && data.success && data.data) {
            // Construir URL absoluta para asegurar que la imagen se cargue correctamente
            const imageUrl = buildAbsoluteUrl(data.data.path)
            
            console.log('[handleImageUploadAndInsert] PDF - Path del servidor:', data.data.path)
            console.log('[handleImageUploadAndInsert] PDF - URL absoluta construida:', imageUrl)
            
            // Insertar imagen usando la URL absoluta del servidor
            editor.chain().focus().setImage({
              src: imageUrl,
              alt: file.name,
              title: file.name
            }).run()
            console.log('[handleImageUploadAndInsert] PDF convertido e insertado correctamente')
          } else {
            console.error('[handleImageUploadAndInsert] Error al subir PDF convertido:', data.message)
          }
        } catch (err) {
          console.error('[handleImageUploadAndInsert] Error al convertir PDF:', err)
        }
      }
      // Si es RAR, Excel u otro tipo de archivo adjunto, subir como attachment
      else if (
        file.type === 'application/x-rar-compressed' ||
        file.type === 'application/x-rar' ||
        file.name.toLowerCase().endsWith('.rar') ||
        file.name.toLowerCase().endsWith('.txt') ||
        file.name.toLowerCase().endsWith('.docx') ||
        file.name.toLowerCase().endsWith('.xlsx') ||
        file.name.toLowerCase().endsWith('.xls') ||
        file.type === 'text/plain' ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.type === 'application/vnd.ms-excel' ||
        file.type === 'application/excel'
      ) {
        // Obtener extensión del archivo al inicio para usarla en todo el bloque
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || ''
        
        try {
          const formData = new FormData()
          formData.append('file', file)

          const response = await fetch('/attachments/temp', {
            method: 'POST',
            headers: {
              'X-CSRF-TOKEN': csrfToken,
              'Accept': 'application/json'
            },
            body: formData
          })

          const data = await response.json()

          if (response.ok && data.success && data.data) {
            // Construir URL absoluta para el archivo adjunto
            const attachmentUrl = buildAbsoluteUrl(data.data.path)
            
            console.log(`[handleImageUploadAndInsert] ${fileExtension.toUpperCase()} - Path del servidor:`, data.data.path)
            console.log(`[handleImageUploadAndInsert] ${fileExtension.toUpperCase()} - URL absoluta construida:`, attachmentUrl)
            
            // Insertar como nodo de adjunto
            editor.chain().focus().setAttachment({
              src: attachmentUrl,
              name: data.data.name || file.name,
              fileName: data.data.fileName || file.name,
              size: data.data.size || file.size
            }).run()
            console.log(`[handleImageUploadAndInsert] Archivo ${fileExtension.toUpperCase()} insertado correctamente`)
          } else {
            console.error(`[handleImageUploadAndInsert] Error al subir archivo ${fileExtension.toUpperCase()}:`, data.message)
          }
        } catch (err) {
          console.error(`[handleImageUploadAndInsert] Error al subir archivo ${fileExtension.toUpperCase()}:`, err)
        }
      } else {
        console.warn(`[handleImageUploadAndInsert] Tipo de archivo no soportado: ${file.type}`)
      }
    } catch (error) {
      console.error('[handleImageUploadAndInsert] Error procesando archivo:', error)
    }
  }
}

type ProtocolOptions = {
  /**
   * The protocol scheme to be registered.
   * @default '''
   * @example 'ftp'
   * @example 'git'
   */
  scheme: string

  /**
   * If enabled, it allows optional slashes after the protocol.
   * @default false
   * @example true
   */
  optionalSlashes?: boolean
}

type ProtocolConfig = Array<ProtocolOptions | string>

const ATTR_WHITESPACE =
  // eslint-disable-next-line no-control-regex
  /[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g

export function isAllowedUri(
  uri: string | undefined,
  protocols?: ProtocolConfig
) {
  const allowedProtocols: string[] = [
    "http",
    "https",
    "ftp",
    "ftps",
    "mailto",
    "tel",
    "callto",
    "sms",
    "cid",
    "xmpp",
  ]

  if (protocols) {
    protocols.forEach((protocol) => {
      const nextProtocol =
        typeof protocol === "string" ? protocol : protocol.scheme

      if (nextProtocol) {
        allowedProtocols.push(nextProtocol)
      }
    })
  }

  return (
    !uri ||
    uri.replace(ATTR_WHITESPACE, "").match(
      new RegExp(
        // eslint-disable-next-line no-useless-escape
        `^(?:(?:${allowedProtocols.join("|")}):|[^a-z]|[a-z0-9+.\-]+(?:[^a-z+.\-:]|$))`,
        "i"
      )
    )
  )
}

export function sanitizeUrl(
  inputUrl: string,
  baseUrl: string,
  protocols?: ProtocolConfig
): string {
  try {
    const url = new URL(inputUrl, baseUrl)

    if (isAllowedUri(url.href, protocols)) {
      return url.href
    }
  } catch {
    // If URL creation fails, it's considered invalid
  }
  return "#"
}
