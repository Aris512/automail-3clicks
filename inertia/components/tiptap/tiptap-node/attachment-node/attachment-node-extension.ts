import { Node, mergeAttributes } from "@tiptap/core"

export interface AttachmentNodeOptions {
  HTMLAttributes: Record<string, any>
}

/**
 * Helper function to format file size
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i]
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    attachment: {
      /**
       * Insert an attachment node
       */
      setAttachment: (options: {
        src: string
        name: string
        fileName?: string
        size?: number
      }) => ReturnType
    }
  }
}

export const AttachmentNode = Node.create<AttachmentNodeOptions>({
  name: "attachment",

  group: "block",

  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-src") || element.getAttribute("href"),
        renderHTML: (attributes) => {
          if (!attributes.src) {
            return {}
          }
          return {
            "data-src": attributes.src,
          }
        },
      },
      name: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-name") || element.textContent,
        renderHTML: (attributes) => {
          if (!attributes.name) {
            return {}
          }
          return {
            "data-name": attributes.name,
          }
        },
      },
      fileName: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-filename"),
        renderHTML: (attributes) => {
          if (!attributes.fileName) {
            return {}
          }
          return {
            "data-filename": attributes.fileName,
          }
        },
      },
      size: {
        default: null,
        parseHTML: (element) => {
          const size = element.getAttribute("data-size")
          return size ? parseInt(size, 10) : null
        },
        renderHTML: (attributes) => {
          if (!attributes.size) {
            return {}
          }
          return {
            "data-size": attributes.size.toString(),
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="attachment"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes, node }) {
    const attrs = node.attrs
    const src = attrs.src || ""
    const name = attrs.name || "Archivo adjunto"
    const size = attrs.size ? formatFileSize(attrs.size) : ""

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "attachment",
        class: "tiptap-attachment",
      }),
      [
        "a",
        {
          href: src,
          download: attrs.fileName || name,
          class: "tiptap-attachment-link",
          target: "_blank",
          rel: "noopener noreferrer",
        },
        [
          "span",
          { class: "tiptap-attachment-icon" },
          "📎",
        ],
        [
          "span",
          { class: "tiptap-attachment-info" },
          [
            "span",
            { class: "tiptap-attachment-name" },
            name,
          ],
          size ? [
            "span",
            { class: "tiptap-attachment-size" },
            ` (${size})`,
          ] : null,
        ],
      ],
    ]
  },

  addCommands() {
    return {
      setAttachment:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          })
        },
    }
  },

  // Helper method to format file size
  formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i]
  },
})

export default AttachmentNode

