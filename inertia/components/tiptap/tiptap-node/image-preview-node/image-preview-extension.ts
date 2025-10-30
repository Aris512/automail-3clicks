import { Extension } from "@tiptap/core"
import { Plugin } from "prosemirror-state"

async function loadPdfJs() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = await import("pdfjs-dist")
  const pdfjs = mod?.default ? mod.default : mod
  if (pdfjs?.GlobalWorkerOptions) {
    try {
      const workerUrl = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString()
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
    } catch (err) {
      console.error("[ImagePreview] No se pudo configurar el worker de pdfjs:", err)
    }
  }
  return pdfjs
}

async function pdfFirstPageToDataUrl(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdfjs = await loadPdfJs()

  const loadingTask = pdfjs.getDocument({ data: arrayBuffer })
  const pdf = await loadingTask.promise
  const page = await pdf.getPage(1)

  const viewport = page.getViewport({ scale: 1.5 })
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Canvas 2D context not available")

  canvas.width = viewport.width
  canvas.height = viewport.height

  await page.render({ canvasContext: context, viewport }).promise
  const dataUrl = canvas.toDataURL("image/png")
  return dataUrl
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    imagePreview: {
      /** Inserta imágenes de un FileList guardado temporalmente en storage */
      insertPreviewImages: () => ReturnType
      /** Inserta imágenes desde URLs (dataURL o remotas) */
      insertPreviewUrls: (urls: string[]) => ReturnType
    }
  }
}

/**
 * ImagePreview
 * - Maneja eventos de pegar y arrastrar/soltar imágenes
 * - Inserta una imagen con URL de objeto para previsualización inmediata
 * - Utiliza el nodo `image` existente de Tiptap, por lo que respeta estilos de `image-node.scss`
 */
export const ImagePreview = Extension.create({
  name: "imagePreview",

  addCommands() {
    return {
      insertPreviewImages:
        () =>
        ({ editor, chain }: { editor: any; chain: any }) => {
          // Este comando requiere que el manejador de archivos sea pasado vía plugin props.
          // Como no tenemos acceso directo a los File aquí, se expone un método en editor.storage
          // para consumir archivos programáticamente desde la UI.
          const files: File[] | undefined = (editor.storage as any)?.imagePreview?.__pendingFiles
          if (!files || files.length === 0) return false

          let inserted = false
          for (const file of files) {
            if (!file || !file.type) continue
            if (file.type.startsWith("image/")) {
              const url = URL.createObjectURL(file)
              chain().focus().setImage({ src: url, alt: file.name, title: file.name }).run()
              inserted = true
            } else if (file.type === "application/pdf") {
              inserted = true
              // Procesar de forma asíncrona y retornar true inmediatamente
              ;(async () => {
                try {
                  const dataUrl = await (async () => {
                    const arrayBuffer = await file.arrayBuffer()
                    const pdfjs = await loadPdfJs()
                    const loadingTask = pdfjs.getDocument({ data: arrayBuffer })
                    const pdf = await loadingTask.promise
                    const page = await pdf.getPage(1)
                    const viewport = page.getViewport({ scale: 1.5 })
                    const canvas = document.createElement("canvas")
                    const context = canvas.getContext("2d")
                    if (!context) throw new Error("Canvas 2D context not available")
                    canvas.width = viewport.width
                    canvas.height = viewport.height
                    await page.render({ canvasContext: context, viewport }).promise
                    return canvas.toDataURL("image/png")
                  })()
                  editor.chain().focus().setImage({ src: dataUrl, alt: file.name, title: file.name }).run()
                } catch (err) {
                  console.error("[ImagePreview] Error al previsualizar PDF:", err)
                }
              })()
            }
          }
          ; (editor.storage as any).imagePreview.__pendingFiles = undefined
          return inserted
        },
      insertPreviewUrls:
        (urls: string[]) =>
        ({ chain }: { chain: any }) => {
          if (!urls || urls.length === 0) return false
          let inserted = false
          for (const url of urls) {
            if (!url) continue
            chain().focus().setImage({ src: url, alt: "", title: "" }).run()
            inserted = true
          }
          return inserted
        },
    }
  },

  addStorage() {
    return {
      __pendingFiles: undefined as File[] | undefined,
    }
  },

  addProseMirrorPlugins() {
    const editor = this.editor

    function handleFiles(files: readonly File[]): boolean {
      if (!files || files.length === 0) return false
      let inserted = false
      for (const file of files) {
        if (!file || !file.type) continue
        if (file.type.startsWith("image/")) {
          const url = URL.createObjectURL(file)
          editor.chain().focus().setImage({ src: url, alt: file.name, title: file.name }).run()
          inserted = true
        } else if (file.type === "application/pdf") {
          // Procesar PDF de forma asíncrona y devolver true inmediatamente
          inserted = true
          void pdfFirstPageToDataUrl(file)
            .then((dataUrl) => {
              editor.chain().focus().setImage({ src: dataUrl, alt: file.name, title: file.name }).run()
            })
            .catch((err) => {
              console.error("[ImagePreview] Error al previsualizar PDF:", err)
            })
        }
      }
      return inserted
    }

    return [
      new Plugin({
        props: {
          handlePaste(_view, event) {
            const clipboard = event.clipboardData
            if (!clipboard) return false
            const files: File[] = []
            for (let i = 0; i < clipboard.items.length; i++) {
              const item = clipboard.items[i]
              if (item.kind === "file") {
                const file = item.getAsFile()
                if (file) files.push(file)
              }
            }
            return handleFiles(files)
          },
          handleDrop(_view, event) {
            const dt = event.dataTransfer
            if (!dt) return false
            const files: File[] = []
            for (let i = 0; i < dt.files.length; i++) {
              const f = dt.files[i]
              if (f) files.push(f)
            }
            return handleFiles(files)
          },
        },
      }),
    ]
  },
})

export default ImagePreview


