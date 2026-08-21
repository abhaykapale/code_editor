"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Editor, { type Monaco, type OnMount } from "@monaco-editor/react"
import type { IDisposable, editor as MonacoEditor } from "monaco-editor"

import {
  configureMonaco,
  defaultEditorOptions,
  getEditorLanguage,
} from "@/modules/playground/lib/editor-config"
import type { TemplateFile } from "@/modules/playground/lib/path-to-json"

interface PlaygroundEditorProps {
  activeFile: TemplateFile | undefined
  content: string
  onContentChange: (value: string) => void
  suggestion: string | null
  suggestionLoading: boolean
  suggestionPosition: { line: number; column: number } | null
  onAcceptSuggestion: (
    editor: MonacoEditor.IStandaloneCodeEditor,
    monaco: Monaco,
  ) => void
  onRejectSuggestion: (editor: MonacoEditor.IStandaloneCodeEditor) => void
  onTriggerSuggestion: (
    type: string,
    editor: MonacoEditor.IStandaloneCodeEditor,
  ) => void
}

interface CurrentSuggestion {
  text: string
  position: { line: number; column: number }
}

interface InlineCompletionPosition {
  lineNumber: number
  column: number
}

const AI_SUGGESTION_CONTEXT_KEY = "aiSuggestionVisible"
const COMPLETION_TRIGGER_CHARACTERS = new Set([
  "\n",
  "{",
  ".",
  "=",
  "(",
  ",",
  ":",
  ";",
])

export const PlaygroundEditor = ({
  activeFile,
  content,
  onContentChange,
  suggestion,
  suggestionLoading,
  suggestionPosition,
  onAcceptSuggestion,
  onRejectSuggestion,
  onTriggerSuggestion,
}: PlaygroundEditorProps) => {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<Monaco | null>(null)
  const inlineCompletionProviderRef = useRef<IDisposable | null>(null)
  const editorDisposablesRef = useRef<IDisposable[]>([])
  const aiSuggestionVisibleRef =
    useRef<MonacoEditor.IContextKey<boolean> | null>(null)
  const currentSuggestionRef = useRef<CurrentSuggestion | null>(null)
  const isAcceptingSuggestionRef = useRef(false)
  const suggestionAcceptedRef = useRef(false)
  const suggestionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const acceptedResetTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null)
  const triggerInlineSuggestionTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null)

  const [editorReady, setEditorReady] = useState(false)
  const [hasVisibleSuggestion, setHasVisibleSuggestion] = useState(false)

  // Monaco mounts once, so its event callbacks must read the latest props from a
  // ref instead of permanently capturing values from the first render.
  const latestPropsRef = useRef({
    suggestionLoading,
    onAcceptSuggestion,
    onRejectSuggestion,
    onTriggerSuggestion,
  })

  useEffect(() => {
    latestPropsRef.current = {
      suggestionLoading,
      onAcceptSuggestion,
      onRejectSuggestion,
      onTriggerSuggestion,
    }
  }, [
    onAcceptSuggestion,
    onRejectSuggestion,
    onTriggerSuggestion,
    suggestionLoading,
  ])

  const setSuggestionVisibility = useCallback((visible: boolean) => {
    aiSuggestionVisibleRef.current?.set(visible)
    setHasVisibleSuggestion(visible)
  }, [])

  const clearSuggestionTimer = useCallback(() => {
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current)
      suggestionTimeoutRef.current = null
    }
  }, [])

  const clearCurrentSuggestion = useCallback(() => {
    currentSuggestionRef.current = null
    suggestionAcceptedRef.current = false
    setSuggestionVisibility(false)
    editorRef.current?.trigger("ai", "editor.action.inlineSuggest.hide", null)
  }, [setSuggestionVisibility])

  const scheduleSuggestion = useCallback(
    (delay: number, editorInstance: MonacoEditor.IStandaloneCodeEditor) => {
      clearSuggestionTimer()

      suggestionTimeoutRef.current = setTimeout(() => {
        suggestionTimeoutRef.current = null

        if (
          editorRef.current === editorInstance &&
          !currentSuggestionRef.current &&
          !latestPropsRef.current.suggestionLoading
        ) {
          latestPropsRef.current.onTriggerSuggestion(
            "completion",
            editorInstance,
          )
        }
      }, delay)
    },
    [clearSuggestionTimer],
  )

  const acceptCurrentSuggestion = useCallback(() => {
    const editorInstance = editorRef.current
    const monacoInstance = monacoRef.current
    const activeSuggestion = currentSuggestionRef.current

    if (!editorInstance || !monacoInstance || !activeSuggestion) return false
    if (isAcceptingSuggestionRef.current || suggestionAcceptedRef.current) {
      return false
    }

    const currentPosition = editorInstance.getPosition()
    if (
      !currentPosition ||
      currentPosition.lineNumber !== activeSuggestion.position.line ||
      currentPosition.column !== activeSuggestion.position.column
    ) {
      clearCurrentSuggestion()
      return false
    }

    isAcceptingSuggestionRef.current = true
    suggestionAcceptedRef.current = true

    try {
      const cleanSuggestionText = activeSuggestion.text.replace(/\r/g, "")
      const insertionRange = new monacoInstance.Range(
        activeSuggestion.position.line,
        activeSuggestion.position.column,
        activeSuggestion.position.line,
        activeSuggestion.position.column,
      )

      editorInstance.pushUndoStop()
      const didInsert = editorInstance.executeEdits("ai-suggestion-accept", [
        {
          range: insertionRange,
          text: cleanSuggestionText,
          forceMoveMarkers: true,
        },
      ])
      editorInstance.pushUndoStop()

      if (!didInsert) {
        suggestionAcceptedRef.current = false
        return false
      }

      const insertedLines = cleanSuggestionText.split("\n")
      const lastInsertedLine = insertedLines[insertedLines.length - 1] ?? ""
      const endLineNumber =
        activeSuggestion.position.line + insertedLines.length - 1
      const endColumn =
        insertedLines.length === 1
          ? activeSuggestion.position.column + cleanSuggestionText.length
          : lastInsertedLine.length + 1

      editorInstance.setPosition({ lineNumber: endLineNumber, column: endColumn })
      editorInstance.revealPositionInCenterIfOutsideViewport({
        lineNumber: endLineNumber,
        column: endColumn,
      })

      currentSuggestionRef.current = null
      setSuggestionVisibility(false)
      editorInstance.trigger("ai", "editor.action.inlineSuggest.hide", null)
      latestPropsRef.current.onAcceptSuggestion(editorInstance, monacoInstance)

      if (acceptedResetTimeoutRef.current) {
        clearTimeout(acceptedResetTimeoutRef.current)
      }

      acceptedResetTimeoutRef.current = setTimeout(() => {
        suggestionAcceptedRef.current = false
        acceptedResetTimeoutRef.current = null
      }, 300)

      return true
    } catch (error) {
      suggestionAcceptedRef.current = false
      console.error("Failed to accept AI suggestion:", error)
      return false
    } finally {
      isAcceptingSuggestionRef.current = false
    }
  }, [clearCurrentSuggestion, setSuggestionVisibility])

  const createInlineCompletionProvider = useCallback(
    (monacoInstance: Monaco) => ({
      provideInlineCompletions: (
        _model: MonacoEditor.ITextModel,
        position: InlineCompletionPosition,
        _context: unknown,
        _token: unknown,
      ) => {
        if (isAcceptingSuggestionRef.current || suggestionAcceptedRef.current) {
          return { items: [] }
        }

        if (!suggestion || !suggestionPosition) {
          return { items: [] }
        }

        if (
          position.lineNumber !== suggestionPosition.line ||
          position.column !== suggestionPosition.column
        ) {
          return { items: [] }
        }

        currentSuggestionRef.current = {
          text: suggestion,
          position: suggestionPosition,
        }
        setSuggestionVisibility(true)

        return {
          items: [
            {
              insertText: suggestion.replace(/\r/g, ""),
              range: new monacoInstance.Range(
                suggestionPosition.line,
                suggestionPosition.column,
                suggestionPosition.line,
                suggestionPosition.column,
              ),
              filterText: "",
            },
          ],
        }
      },
      freeInlineCompletions: () => undefined,
    }),
    [suggestion, suggestionPosition, setSuggestionVisibility],
  )

  const updateEditorLanguage = useCallback(() => {
    const editorInstance = editorRef.current
    const monacoInstance = monacoRef.current

    if (!activeFile || !editorInstance || !monacoInstance) return

    const model = editorInstance.getModel()
    if (!model) return

    try {
      monacoInstance.editor.setModelLanguage(
        model,
        getEditorLanguage(activeFile.fileExtension || ""),
      )
    } catch (error) {
      console.warn("Failed to set editor language:", error)
    }
  }, [activeFile])

  const disposeEditorSubscriptions = useCallback(() => {
    for (const disposable of editorDisposablesRef.current) {
      disposable.dispose()
    }
    editorDisposablesRef.current = []
    aiSuggestionVisibleRef.current = null
  }, [])

  const handleEditorDidMount: OnMount = (editorInstance, monacoInstance) => {
    disposeEditorSubscriptions()

    editorRef.current = editorInstance
    monacoRef.current = monacoInstance
    configureMonaco(monacoInstance)

    editorInstance.updateOptions({
      inlineSuggest: {
        enabled: true,
        mode: "prefix",
        suppressSuggestions: false,
      },
      suggest: {
        preview: false,
        showInlineDetails: false,
        insertMode: "replace",
      },
      quickSuggestions: {
        other: true,
        comments: false,
        strings: false,
      },
      cursorSmoothCaretAnimation: "on",
    })

    aiSuggestionVisibleRef.current = editorInstance.createContextKey(
      AI_SUGGESTION_CONTEXT_KEY,
      false,
    )

    // addAction returns IDisposable. Unlike addCommand, it can be safely removed.
    const completionAction = editorInstance.addAction({
      id: "playground-trigger-ai-completion",
      label: "Trigger AI completion",
      keybindings: [monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Space],
      precondition: "editorTextFocus && !editorReadonly",
      run: () => {
        latestPropsRef.current.onTriggerSuggestion("completion", editorInstance)
      },
    })

    // This action owns Tab only while an AI suggestion is visible. When there is
    // no AI suggestion, Monaco's normal Tab/indent command remains untouched.
    const acceptAction = editorInstance.addAction({
      id: "playground-accept-ai-suggestion",
      label: "Accept AI suggestion",
      keybindings: [monacoInstance.KeyCode.Tab],
      precondition: `editorTextFocus && !editorReadonly && ${AI_SUGGESTION_CONTEXT_KEY}`,
      keybindingContext: `!suggestWidgetVisible && ${AI_SUGGESTION_CONTEXT_KEY}`,
      run: () => {
        acceptCurrentSuggestion()
      },
    })

    const rejectAction = editorInstance.addAction({
      id: "playground-reject-ai-suggestion",
      label: "Reject AI suggestion",
      keybindings: [monacoInstance.KeyCode.Escape],
      precondition: `editorTextFocus && ${AI_SUGGESTION_CONTEXT_KEY}`,
      run: () => {
        if (!currentSuggestionRef.current) return
        latestPropsRef.current.onRejectSuggestion(editorInstance)
        clearCurrentSuggestion()
      },
    })

    const cursorSubscription = editorInstance.onDidChangeCursorPosition(
      ({ position }) => {
        if (isAcceptingSuggestionRef.current) return

        const activeSuggestion = currentSuggestionRef.current
        if (activeSuggestion && !suggestionAcceptedRef.current) {
          const movedAway =
            position.lineNumber !== activeSuggestion.position.line ||
            position.column !== activeSuggestion.position.column

          if (movedAway) {
            latestPropsRef.current.onRejectSuggestion(editorInstance)
            clearCurrentSuggestion()
          }
        }

        if (!currentSuggestionRef.current) {
          scheduleSuggestion(300, editorInstance)
        }
      },
    )

    const contentSubscription = editorInstance.onDidChangeModelContent(
      ({ changes }) => {
        if (isAcceptingSuggestionRef.current || changes.length === 0) return

        const change = changes[0]
        const activeSuggestion = currentSuggestionRef.current

        if (activeSuggestion && !suggestionAcceptedRef.current) {
          const normalizedSuggestion = activeSuggestion.text.replace(/\r/g, "")
          if (change.text !== normalizedSuggestion) {
            clearCurrentSuggestion()
          }
        }

        if (
          COMPLETION_TRIGGER_CHARACTERS.has(change.text) &&
          !suggestionAcceptedRef.current
        ) {
          scheduleSuggestion(100, editorInstance)
        }
      },
    )

    editorDisposablesRef.current = [
      completionAction,
      acceptAction,
      rejectAction,
      cursorSubscription,
      contentSubscription,
    ]

    setEditorReady(true)

    const model = editorInstance.getModel()
    if (model && activeFile) {
      monacoInstance.editor.setModelLanguage(
        model,
        getEditorLanguage(activeFile.fileExtension || ""),
      )
    }
  }

  useEffect(() => {
    updateEditorLanguage()
  }, [updateEditorLanguage])

  useEffect(() => {
    const editorInstance = editorRef.current
    const monacoInstance = monacoRef.current

    if (!editorReady || !editorInstance || !monacoInstance) return

    inlineCompletionProviderRef.current?.dispose()
    inlineCompletionProviderRef.current = null
    currentSuggestionRef.current = null
    setSuggestionVisibility(false)

    if (!suggestion || !suggestionPosition) return

    const language = getEditorLanguage(activeFile?.fileExtension || "")
    const provider = monacoInstance.languages.registerInlineCompletionsProvider(
      language,
      createInlineCompletionProvider(monacoInstance),
    )
    inlineCompletionProviderRef.current = provider

    triggerInlineSuggestionTimeoutRef.current = setTimeout(() => {
      triggerInlineSuggestionTimeoutRef.current = null

      if (
        editorRef.current === editorInstance &&
        !isAcceptingSuggestionRef.current &&
        !suggestionAcceptedRef.current
      ) {
        editorInstance.trigger("ai", "editor.action.inlineSuggest.trigger", null)
      }
    }, 50)

    return () => {
      if (triggerInlineSuggestionTimeoutRef.current) {
        clearTimeout(triggerInlineSuggestionTimeoutRef.current)
        triggerInlineSuggestionTimeoutRef.current = null
      }

      provider.dispose()
      if (inlineCompletionProviderRef.current === provider) {
        inlineCompletionProviderRef.current = null
      }
    }
  }, [
    activeFile,
    createInlineCompletionProvider,
    editorReady,
    setSuggestionVisibility,
    suggestion,
    suggestionPosition,
  ])

  useEffect(() => {
    return () => {
      clearSuggestionTimer()

      if (acceptedResetTimeoutRef.current) {
        clearTimeout(acceptedResetTimeoutRef.current)
        acceptedResetTimeoutRef.current = null
      }

      if (triggerInlineSuggestionTimeoutRef.current) {
        clearTimeout(triggerInlineSuggestionTimeoutRef.current)
        triggerInlineSuggestionTimeoutRef.current = null
      }

      inlineCompletionProviderRef.current?.dispose()
      inlineCompletionProviderRef.current = null
      disposeEditorSubscriptions()
      editorRef.current = null
      monacoRef.current = null
    }
  }, [clearSuggestionTimer, disposeEditorSubscriptions])

  return (
    <div className="relative h-full">
      {/* {suggestionLoading && (
        <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded bg-red-100 px-2 py-1 text-xs text-red-700 dark:bg-red-900 dark:text-red-300">
          <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          AI thinking...
        </div>
      )} */}

      {hasVisibleSuggestion && !suggestionLoading && (
        <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded bg-green-100 px-2 py-1 text-xs text-green-700 dark:bg-green-900 dark:text-green-300">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          Press Tab to accept
        </div>
      )}

      <Editor
        height="100%"
        value={content}
        onChange={(value) => onContentChange(value ?? "")}
        onMount={handleEditorDidMount}
        language={
          activeFile
            ? getEditorLanguage(activeFile.fileExtension || "")
            : "plaintext"
        }
        options={
          defaultEditorOptions as unknown as MonacoEditor.IStandaloneEditorConstructionOptions
        }
      />
    </div>
  )
}
