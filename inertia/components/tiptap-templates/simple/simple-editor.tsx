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

// --- UI Components ---
import { Dialog } from "~/components/ui/dialog"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Button as UIButton } from "~/components/ui/button"
import { useToast } from "~/hooks/useToast"

// --- Icons ---
import { Megaphone, Layers } from "lucide-react"

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
  valor?: string
  valorStage?: string
  valorFinal?: string
}

interface SimpleEditorProps {
  content?: string
  onChange?: (content: string) => void
  placeholder?: string
  className?: string
  customVariables?: CustomVariable[]
  campaignId?: number | null
  stageId?: number | null
  onVariableCreated?: () => void
}

const MainToolbarContent = ({
  onHighlighterClick,
  onLinkClick,
  isMobile,
  onAddVariableFromCampaign,
  onAddVariableFromStage,
  campaignId,
  stageId,
}: {
  onHighlighterClick: () => void
  onLinkClick: () => void
  isMobile: boolean
  onAddVariableFromCampaign?: () => void
  onAddVariableFromStage?: () => void
  campaignId?: number | null
  stageId?: number | null
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

      {/* Botones para crear variables personalizadas */}
      {campaignId && (
        <>
          <ToolbarSeparator />
          <ToolbarGroup>
            {onAddVariableFromCampaign && (
              <Button
                onClick={onAddVariableFromCampaign}
                tooltip="Crear variable desde campaña"
                aria-label="Crear variable desde campaña"
                data-style="ghost"
              >
                <Megaphone className="tiptap-button-icon" />
              </Button>
            )}
            {stageId && onAddVariableFromStage && (
              <Button
                onClick={onAddVariableFromStage}
                tooltip="Editar variable desde etapa"
                aria-label="Editar variable desde etapa"
                data-style="ghost"
              >
                <Layers className="tiptap-button-icon" />
              </Button>
            )}
          </ToolbarGroup>
        </>
      )}

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

export function SimpleEditor({ 
  content: initialContent = "", 
  onChange, 
  placeholder, 
  className, 
  customVariables = [],
  campaignId,
  stageId,
  onVariableCreated
}: SimpleEditorProps = {}) {
  const isMobile = useIsMobile()
  const { height } = useWindowSize()
  const { showSuccess, showError } = useToast()
  const [mobileView, setMobileView] = React.useState<
    "main" | "highlighter" | "link"
  >("main")
  const toolbarRef = React.useRef<HTMLDivElement>(null)
  
  // Estados para modales de creación de variables
  const [showAddVariableFromCampaignDialog, setShowAddVariableFromCampaignDialog] = React.useState(false)
  const [showEditStageValueDialog, setShowEditStageValueDialog] = React.useState(false)
  const [newVariableFromCampaignForm, setNewVariableFromCampaignForm] = React.useState({ name: '', valor: '' })
  const [editingStageValueData, setEditingStageValueData] = React.useState({ variableId: 0, variableName: '', valor: '' })

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

  // Función helper para obtener el token CSRF
  const getCsrfToken = () => {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
  }

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

  // Crear variable personalizada desde campaña
  const handleAddVariableFromCampaign = async () => {
    if (!campaignId) {
      showError('Campaña requerida', 'No hay una campaña asociada')
      return
    }

    const trimmed = newVariableFromCampaignForm.name.trim()
    if (!trimmed) {
      showError('Campo requerido', 'El nombre de la variable es obligatorio')
      return
    }

    // Validar formato: solo letras, números y guiones bajos
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
      showError('Formato inválido', 'El nombre de la variable solo puede contener letras, números y guiones bajos, y debe empezar con letra o guión bajo')
      return
    }

    try {
      const requestBody: any = {
        name: trimmed,
        description: '',
        campaignId: campaignId,
        stageId: stageId || null, // Incluir stageId si está disponible
        valor: newVariableFromCampaignForm.valor.trim() || null
      }

      const response = await fetch('/campaigns/custom-variables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      })

      const result = await response.json()

      if (result.success) {
        showSuccess('Variable creada', 'La variable personalizada se ha creado exitosamente', 3000)
        setNewVariableFromCampaignForm({ name: '', valor: '' })
        setShowAddVariableFromCampaignDialog(false)
        // Notificar al componente padre para que recargue las variables
        if (onVariableCreated) {
          onVariableCreated()
        }
      } else {
        showError('Error al crear', result.message || 'No se pudo crear la variable personalizada')
      }
    } catch (error) {
      console.error('Error al crear variable:', error)
      showError('Error de conexión', 'No se pudo conectar con el servidor')
    }
  }

  // Abrir modal para editar valores de etapa
  const handleOpenEditStageValues = () => {
    if (!stageId) {
      showError('Etapa requerida', 'No hay una etapa asociada')
      return
    }
    setShowEditStageValueDialog(true)
  }

  // Abrir modal de edición de valor para una variable específica
  const handleOpenEditStageValue = (variable: CustomVariable) => {
    // Priorizar valor_stage de la etapa sobre valor de custom_variables
    let currentValor = ''
    if (variable.valorStage !== null && variable.valorStage !== undefined) {
      // Si hay valor_stage, usarlo
      currentValor = String(variable.valorStage)
    } else {
      // Si no hay valor_stage, usar el valor de custom_variables
      currentValor = variable.valor || ''
    }
    
    setEditingStageValueData({
      variableId: variable.id,
      variableName: variable.name,
      valor: currentValor
    })
    setShowEditStageValueDialog(true)
  }

  // Guardar valor de etapa
  const handleSaveStageValue = async () => {
    if (!editingStageValueData.variableId || !stageId || !campaignId) {
      showError('Error', 'Faltan datos necesarios para guardar el valor')
      return
    }

    try {
      // Actualizar la etapa con el nuevo valor_stage
      const response = await fetch(`/campaign-stages/${stageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify({
          customVariableValues: [{
            customVarId: editingStageValueData.variableId,
            valor: editingStageValueData.valor.trim() || ''
          }]
        })
      })

      const result = await response.json()

      if (result.success) {
        showSuccess('Valor actualizado', 'El valor de la etapa se ha actualizado correctamente', 3000)
        setShowEditStageValueDialog(false)
        setEditingStageValueData({ variableId: 0, variableName: '', valor: '' })
        // Notificar al componente padre para que recargue las variables
        if (onVariableCreated) {
          onVariableCreated()
        }
      } else {
        showError('Error al guardar', result.message || 'No se pudo guardar el valor')
      }
    } catch (error) {
      console.error('Error al guardar valor de etapa:', error)
      showError('Error de conexión', 'No se pudo conectar con el servidor')
    }
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
              onAddVariableFromCampaign={() => setShowAddVariableFromCampaignDialog(true)}
              onAddVariableFromStage={handleOpenEditStageValues}
              campaignId={campaignId}
              stageId={stageId}
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

      {/* Dialog para agregar variable desde campaña */}
      <Dialog
        open={showAddVariableFromCampaignDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddVariableFromCampaignDialog(false)
            setNewVariableFromCampaignForm({ name: '', valor: '' })
          } else {
            setShowAddVariableFromCampaignDialog(open)
          }
        }}
        title="Crear Variable Personalizada desde Campaña"
        maxWidth="md"
        footer={
          <>
            <UIButton
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddVariableFromCampaignDialog(false)
                setNewVariableFromCampaignForm({ name: '', valor: '' })
              }}
            >
              Cancelar
            </UIButton>
            <UIButton
              type="button"
              onClick={handleAddVariableFromCampaign}
            >
              Crear Variable
            </UIButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="new-var-campaign-name">nombre_variable *</Label>
            <Input
              id="new-var-campaign-name"
              type="text"
              value={newVariableFromCampaignForm.name}
              onChange={(e) => setNewVariableFromCampaignForm({ ...newVariableFromCampaignForm, name: e.target.value })}
              placeholder="Ej: nombre_producto"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddVariableFromCampaign()
                }
              }}
            />
            <p className="text-xs text-gray-500 mt-1">
              Solo letras, números y guiones bajos. Debe empezar con letra o guión bajo.
            </p>
          </div>
          <div>
            <Label htmlFor="new-var-campaign-valor">valor_variable</Label>
            <Input
              id="new-var-campaign-valor"
              type="text"
              value={newVariableFromCampaignForm.valor}
              onChange={(e) => setNewVariableFromCampaignForm({ ...newVariableFromCampaignForm, valor: e.target.value })}
              placeholder="Ej: Camiseta"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddVariableFromCampaign()
                }
              }}
            />
            <p className="text-xs text-gray-500 mt-1">
              Valor por defecto para esta variable en la campaña.
            </p>
          </div>
        </div>
      </Dialog>

      {/* Dialog para editar valores de etapa */}
      <Dialog
        open={showEditStageValueDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowEditStageValueDialog(false)
            setEditingStageValueData({ variableId: 0, variableName: '', valor: '' })
          } else {
            setShowEditStageValueDialog(open)
          }
        }}
        title={editingStageValueData.variableId ? `Editar Valor para Etapa - {{${editingStageValueData.variableName}}}` : "Valores de Variables para esta Etapa"}
        maxWidth="md"
        footer={
          editingStageValueData.variableId ? (
            <>
              <UIButton
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEditStageValueDialog(false)
                  setEditingStageValueData({ variableId: 0, variableName: '', valor: '' })
                }}
              >
                Cancelar
              </UIButton>
              <UIButton
                type="button"
                onClick={handleSaveStageValue}
              >
                Guardar Valor
              </UIButton>
            </>
          ) : (
            <UIButton
              type="button"
              variant="outline"
              onClick={() => {
                setShowEditStageValueDialog(false)
                setEditingStageValueData({ variableId: 0, variableName: '', valor: '' })
              }}
            >
              Cerrar
            </UIButton>
          )
        }
      >
        {editingStageValueData.variableId ? (
          // Vista de edición de una variable específica
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-stage-valor">Valor para esta etapa</Label>
              <Input
                id="edit-stage-valor"
                type="text"
                value={editingStageValueData.valor}
                onChange={(e) => setEditingStageValueData({ ...editingStageValueData, valor: e.target.value })}
                placeholder="Ingresa el valor para esta etapa"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSaveStageValue()
                  }
                }}
              />
              <p className="text-xs text-gray-500 mt-1">
                Este valor sobrescribirá el valor de la campaña solo para esta etapa. Deja vacío para usar el valor de la campaña.
              </p>
            </div>
          </div>
        ) : (
          // Vista de lista de variables disponibles
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Selecciona una variable para editar su valor específico en esta etapa.
            </p>
            {customVariables.length > 0 ? (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {customVariables.map((variable) => {
                  // Priorizar valor_stage sobre valor
                  const valorFinal = variable.valorStage !== null && variable.valorStage !== undefined
                    ? String(variable.valorStage)
                    : (variable.valor || '')
                  
                  return (
                    <div
                      key={variable.id}
                      className="border rounded-md p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => handleOpenEditStageValue(variable)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">
                              {`{{${variable.name}}}`}
                            </span>
                            {variable.valorStage !== null && variable.valorStage !== undefined && (
                              <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">
                                Valor de etapa
                              </span>
                            )}
                          </div>
                          {valorFinal && (
                            <p className="text-xs text-gray-500 mt-1">
                              Valor: <span className="font-mono">{valorFinal}</span>
                            </p>
                          )}
                          {variable.description && (
                            <p className="text-xs text-gray-400 mt-1">
                              {variable.description}
                            </p>
                          )}
                        </div>
                        <UIButton
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenEditStageValue(variable)
                          }}
                        >
                          Editar
                        </UIButton>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                No hay variables personalizadas disponibles para esta etapa.
              </p>
            )}
          </div>
        )}
      </Dialog>
    </div>
  )
}
