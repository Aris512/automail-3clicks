import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useState } from 'react'

interface SimpleEditorProps {
  content?: string
  onChange?: (content: string) => void
  placeholder?: string
  className?: string
}

export function SimpleEditor({ 
  content = '', 
  onChange, 
  placeholder = 'Escribe algo...',
  className = ''
}: SimpleEditorProps) {
  const [isFocused, setIsFocused] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px] ${className}`,
        placeholder: placeholder,
      },
    },
  })

  if (!editor) {
    return null
  }

  return (
    <div className={`border rounded-lg ${isFocused ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-300'}`}>
      {/* Toolbar */}
      <div className="border-b border-gray-200 p-2 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-2 py-1 text-sm rounded hover:bg-gray-100 ${
            editor.isActive('bold') ? 'bg-gray-200' : ''
          }`}
          title="Negrita"
        >
          <strong>B</strong>
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-2 py-1 text-sm rounded hover:bg-gray-100 ${
            editor.isActive('italic') ? 'bg-gray-200' : ''
          }`}
          title="Cursiva"
        >
          <em>I</em>
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`px-2 py-1 text-sm rounded hover:bg-gray-100 ${
            editor.isActive('strike') ? 'bg-gray-200' : ''
          }`}
          title="Tachado"
        >
          <s>S</s>
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-2 py-1 text-sm rounded hover:bg-gray-100 ${
            editor.isActive('heading', { level: 1 }) ? 'bg-gray-200' : ''
          }`}
          title="Título 1"
        >
          H1
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-2 py-1 text-sm rounded hover:bg-gray-100 ${
            editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''
          }`}
          title="Título 2"
        >
          H2
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-2 py-1 text-sm rounded hover:bg-gray-100 ${
            editor.isActive('heading', { level: 3 }) ? 'bg-gray-200' : ''
          }`}
          title="Título 3"
        >
          H3
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-2 py-1 text-sm rounded hover:bg-gray-100 ${
            editor.isActive('bulletList') ? 'bg-gray-200' : ''
          }`}
          title="Lista con viñetas"
        >
          •
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-2 py-1 text-sm rounded hover:bg-gray-100 ${
            editor.isActive('orderedList') ? 'bg-gray-200' : ''
          }`}
          title="Lista numerada"
        >
          1.
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`px-2 py-1 text-sm rounded hover:bg-gray-100 ${
            editor.isActive('blockquote') ? 'bg-gray-200' : ''
          }`}
          title="Cita"
        >
          "
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="px-2 py-1 text-sm rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Deshacer"
        >
          ↶
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="px-2 py-1 text-sm rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Rehacer"
        >
          ↷
        </button>
      </div>

      {/* Editor Content */}
      <div 
        className="p-4"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
