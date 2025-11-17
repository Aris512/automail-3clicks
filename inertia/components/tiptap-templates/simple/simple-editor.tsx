"use client"

import * as React from "react"
import { EditorContent, EditorContext, useEditor } from "@tiptap/react"

// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit"
import { Image } from "@tiptap/extension-image"
import { TaskItem, TaskList } from "@tiptap/extension-list"
import { TextAlign } from "@tiptap/extension-text-align"
import { Typography } from "@tiptap/extension-typography"
import { Highlight } from "@tiptap/extension-highlight"
import { Subscript } from "@tiptap/extension-subscript"
import { Superscript } from "@tiptap/extension-superscript"
import { Selection } from "@tiptap/extensions"

// --- UI Primitives ---
import { Button } from "~/components/tiptap/tiptap-ui-primitive/button"
import { Spacer } from "~/components/tiptap/tiptap-ui-primitive/spacer"
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "~/components/tiptap/tiptap-ui-primitive/toolbar"

// --- Tiptap Node ---
import { HorizontalRule } from "~/components/tiptap/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension"
import "~/components/tiptap/tiptap-node/blockquote-node/blockquote-node.scss"
import "~/components/tiptap/tiptap-node/code-block-node/code-block-node.scss"
import "~/components/tiptap/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss"
import "~/components/tiptap/tiptap-node/list-node/list-node.scss"
import "~/components/tiptap/tiptap-node/image-node/image-node.scss"
import "~/components/tiptap/tiptap-node/heading-node/heading-node.scss"
import "~/components/tiptap/tiptap-node/paragraph-node/paragraph-node.scss"
import "~/components/tiptap/tiptap-node/attachment-node/attachment-node.scss"

// --- Tiptap UI ---
import { HeadingDropdownMenu } from "~/components/tiptap/tiptap-ui/heading-dropdown-menu"
import { ListDropdownMenu } from "~/components/tiptap/tiptap-ui/list-dropdown-menu"
import { BlockquoteButton } from "~/components/tiptap/tiptap-ui/blockquote-button"
import { CodeBlockButton } from "~/components/tiptap/tiptap-ui/code-block-button"
import { ImageUploadButton } from "~/components/tiptap/tiptap-ui/image-upload-button"
import {
  ColorHighlightPopover,
  ColorHighlightPopoverContent,
  ColorHighlightPopoverButton,
} from "~/components/tiptap/tiptap-ui/color-highlight-popover"
import {
  LinkPopover,
  LinkContent,
  LinkButton,
} from "~/components/tiptap/tiptap-ui/link-popover"
import { MarkButton } from "~/components/tiptap/tiptap-ui/mark-button"
import { TextAlignButton } from "~/components/tiptap/tiptap-ui/text-align-button"
import { UndoRedoButton } from "~/components/tiptap/tiptap-ui/undo-redo-button"

// --- Icons ---
import { ArrowLeftIcon } from "~/components/tiptap/tiptap-icons/arrow-left-icon"
import { HighlighterIcon } from "~/components/tiptap/tiptap-icons/highlighter-icon"
import { LinkIcon } from "~/components/tiptap/tiptap-icons/link-icon"

// --- Hooks ---
import { useIsMobile } from "~/hooks/use-mobile"
import { useWindowSize } from "~/hooks/use-window-size"
import { useCursorVisibility } from "~/hooks/use-cursor-visibility"

// --- Lib ---
import { ImageUploadNode } from "~/components/tiptap/tiptap-node/image-upload-node/image-upload-node-extension"
import { AttachmentNode } from "~/components/tiptap/tiptap-node/attachment-node/attachment-node-extension"
import { handleImageUpload, MAX_FILE_SIZE } from "~/lib/tiptap-utils"

// --- Styles ---
import "./simple-editor.scss"

interface CustomVariable {
  id: number
  name: string
  description?: string
}

interface SimpleEditorProps {
  content?: string
  onChange?: (content: string) => void
  placeholder?: string
  className?: string
  customVariables?: CustomVariable[]
}

const MainToolbarContent = ({
  onHighlighterClick,
  onLinkClick,
  isMobile,
}: {
  onHighlighterClick: () => void
  onLinkClick: () => void
  isMobile: boolean
}) => {
  return (
    <>
      <Spacer />

      <ToolbarGroup>
        <UndoRedoButton action="undo" />
        <UndoRedoButton action="redo" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <HeadingDropdownMenu levels={[1, 2, 3, 4]} portal={isMobile} />
        <ListDropdownMenu
          types={["bulletList", "orderedList", "taskList"]}
          portal={isMobile}
        />
        <BlockquoteButton />
        <CodeBlockButton />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="bold" />
        <MarkButton type="italic" />
        <MarkButton type="strike" />
        <MarkButton type="code" />
        <MarkButton type="underline" />
        {!isMobile ? (
          <ColorHighlightPopover />
        ) : (
          <ColorHighlightPopoverButton onClick={onHighlighterClick} />
        )}
        {!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="superscript" />
        <MarkButton type="subscript" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <TextAlignButton align="left" />
        <TextAlignButton align="center" />
        <TextAlignButton align="right" />
        <TextAlignButton align="justify" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <ImageUploadButton text="Add" />
      </ToolbarGroup>

      <Spacer />
    </>
  )
}

const MobileToolbarContent = ({
  type,
  onBack,
}: {
  type: "highlighter" | "link"
  onBack: () => void
}) => (
  <>
    <ToolbarGroup>
      <Button data-style="ghost" onClick={onBack}>
        <ArrowLeftIcon className="tiptap-button-icon" />
        {type === "highlighter" ? (
          <HighlighterIcon className="tiptap-button-icon" />
        ) : (
          <LinkIcon className="tiptap-button-icon" />
        )}
      </Button>
    </ToolbarGroup>

    <ToolbarSeparator />

    {type === "highlighter" ? (
      <ColorHighlightPopoverContent />
    ) : (
      <LinkContent />
    )}
  </>
)

export function SimpleEditor({ content: initialContent = "", onChange, placeholder, className, customVariables = [] }: SimpleEditorProps = {}) {
  const isMobile = useIsMobile()
  const { height } = useWindowSize()
  const [mobileView, setMobileView] = React.useState<
    "main" | "highlighter" | "link"
  >("main")
  const toolbarRef = React.useRef<HTMLDivElement>(null)

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": placeholder || "Main content area, start typing to enter text.",
        class: "simple-editor",
      },
    },
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        link: {
          openOnClick: false,
          enableClickSelection: true,
        },
      }),
      HorizontalRule,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'loaded',
        },
      }),
      Typography,
      Superscript,
      Subscript,
      Selection,
      ImageUploadNode.configure({
        accept: "image/*,application/pdf,.txt,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.rar,application/x-rar-compressed,.zip,application/zip,application/x-zip-compressed,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel",
        maxSize: MAX_FILE_SIZE,
        limit: 10,
        upload: handleImageUpload,
        onError: (error) => console.error("Upload failed:", error),
      }),
      AttachmentNode,
    ],
    content: initialContent || "",
    onUpdate: onChange ? ({ editor }) => {
      onChange(editor.getHTML())
    } : undefined,
  })

  // Update editor content when prop changes
  React.useEffect(() => {
    if (editor && initialContent !== undefined && initialContent !== editor.getHTML()) {
      editor.commands.setContent(initialContent)
    }
  }, [initialContent, editor])

  const rect = useCursorVisibility({
    editor,
    overlayHeight: toolbarRef.current?.getBoundingClientRect().height ?? 0,
  })

  React.useEffect(() => {
    if (!isMobile && mobileView !== "main") {
      setMobileView("main")
    }
  }, [isMobile, mobileView])

  // Función para insertar variable en la posición del cursor
  const insertVariable = (variable: string) => {
    if (!editor) return
    
    // Asegurar que el editor tenga el foco antes de insertar
    editor.chain().focus().insertContent(variable).run()
    
    // Mantener el foco después de insertar para continuar editando
    setTimeout(() => {
      editor.commands.focus()
    }, 0)
  }

  return (
    <div className={`simple-editor-wrapper ${className || ''}`}>
      <EditorContext.Provider value={{ editor }}>
        <Toolbar
          ref={toolbarRef}
          style={{
            ...(isMobile
              ? {
                  bottom: `calc(100% - ${height - rect.y}px)`,
                }
              : {}),
          }}
        >
          {mobileView === "main" ? (
            <MainToolbarContent
              onHighlighterClick={() => setMobileView("highlighter")}
              onLinkClick={() => setMobileView("link")}
              isMobile={isMobile}
            />
          ) : (
            <MobileToolbarContent
              type={mobileView === "highlighter" ? "highlighter" : "link"}
              onBack={() => setMobileView("main")}
            />
          )}
        </Toolbar>

        <EditorContent
          editor={editor}
          role="presentation"
          className="simple-editor-content"
        />

        {/* Título y Toolbar de variables del contacto en la parte inferior */}
        <div className="variable-toolbar-container">
          <label className="variable-toolbar-label">Variables</label>
          <Toolbar
            variant="fixed"
            className="variable-toolbar"
          >
            <ToolbarGroup>
              <Button
                onClick={() => insertVariable("{{nombre_contacto}}")}
                tooltip="Insertar nombre del contacto"
                aria-label="Insertar nombre del contacto"
              >
                {"{{nombre_contacto}}"}
              </Button>
              <Button
                onClick={() => insertVariable("{{email_contacto}}")}
                tooltip="Insertar email del contacto"
                aria-label="Insertar email del contacto"
              >
                {"{{email_contacto}}"}
              </Button>
              {customVariables.map((variable) => (
                <Button
                  key={variable.id}
                  onClick={() => insertVariable(`{{${variable.name}}}`)}
                  tooltip={variable.description || `Insertar ${variable.name}`}
                  aria-label={`Insertar ${variable.name}`}
                >
                  {`{{${variable.name}}}`}
                </Button>
              ))}
            </ToolbarGroup>
          </Toolbar>
        </div>
      </EditorContext.Provider>
    </div>
  )
}
