import { useState, useCallback, useRef } from "react";

interface AiSuggestionsState {
    suggestion: string | null;
    isLoading: boolean;
    position: { line: number; column: number } | null;
    decoration: string[];
    isEnabled: boolean;
}

// Renamed from UseAiSuggestionsProps → UseAiSuggestionsReturn to match usage on line 19
interface UseAiSuggestionsReturn extends AiSuggestionsState {
    toggleEnabled: () => void;
    fetchSuggestion: (type: string, editor: any) => Promise<void>;
    acceptSuggestion: (editor: any, monaco: string) => void;
    rejectSuggestion: (editor: any) => void;
    clearSuggestion: (editor: any) => void;
}

export const UseAiSuggestions = (): UseAiSuggestionsReturn => {

    const [state, setState] = useState<AiSuggestionsState>({
        suggestion: null,
        isLoading: false,
        position: null,
        decoration: [],
        isEnabled: true,
    });

    // Refs for synchronous reads inside async callbacks
    const isEnabledRef = useRef(true);
    const isLoadingRef = useRef(false);
    const toggleEnabled = useCallback(() => {
        setState(prev => {
            isEnabledRef.current = !prev.isEnabled;
            return { ...prev, isEnabled: !prev.isEnabled };
        });
    }, []);

 const fetchSuggestion = useCallback(async (type: string, editor: any) => {
    // Synchronous guards — no need to enter async if disabled or already loading
    if (!isEnabledRef.current || isLoadingRef.current) return;
    if (!editor) return;

    const model = editor.getModel();
    const cursorPosition = editor.getPosition();

    if (!model || !cursorPosition) return;

    isLoadingRef.current = true;
    setState((prev) => ({ ...prev, isLoading: true }));

    const fileContent = model.getValue();
    const cursorLine = cursorPosition.lineNumber - 1;
    const cursorColumn = cursorPosition.column - 1;
    const snappedLine = cursorPosition.lineNumber;
    const snappedColumn = cursorPosition.column;

    try {
        const response = await fetch("/api/code-completion", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileContent, cursorLine, cursorColumn, suggestionType: type }),
        });

        if (!response.ok) {
            throw new Error(`API responded with status ${response.status}`);
        }

        const data = await response.json();

        if (data.suggestion && isEnabledRef.current) {
            setState((prev) => ({
                ...prev,
                suggestion: data.suggestion.trim(),
                position: { line: snappedLine, column: snappedColumn },
                isLoading: false,
            }));
        } else {
            setState((prev) => ({ ...prev, isLoading: false }));
        }
    } catch (error) {
        setState((prev) => ({ ...prev, isLoading: false }));
        console.error("fetchSuggestion error:", error);
    } finally {
        isLoadingRef.current = false;
    }
}, []);



   const acceptSuggestion = useCallback(
    (editor: any, monaco: any) => {

        setState((currentState) => {

            if (
                !currentState.suggestion ||
                !currentState.position ||
                !editor ||
                !monaco
            ) {
                return currentState;
            }

            const { line, column } =
                currentState.position;

            const sanitizedSuggestion =
                currentState.suggestion.replace(
                    /^\d+:\s*/g,
                    ""
                );

            editor.pushUndoStop();

            editor.executeEdits("", [
                {
                    range: new monaco.Range(
                        line,
                        column,
                        line,
                        column
                    ),
                    text: sanitizedSuggestion,
                    forceMoveMarkers: true,
                },
            ]);

            editor.pushUndoStop();

            if (
                currentState.decoration.length > 0
            ) {
                editor.deltaDecorations(
                    currentState.decoration,
                    []
                );
            }

            return {
                ...currentState,
                suggestion: null,
                position: null,
                decoration: [],
            };

        });

    },
    []
);

    const rejectSuggestion = useCallback((editor: any) => {
    setState((currentState) => {

        if (editor && currentState.decoration.length > 0) {
            editor.deltaDecorations(
                currentState.decoration,
                []
            );
        }

        return {
            ...currentState,
            suggestion: null,
            position: null,
            decoration: [],
        };

    });
}, []);

    const clearSuggestion = useCallback((editor: any) => {
    setState((currentState) => {

        if (editor && currentState.decoration.length > 0) {
            editor.deltaDecorations(
                currentState.decoration,
                []
            );
        }

        return {
            ...currentState,
            suggestion: null,
            position: null,
            decoration: [],
        };

    });
}, []);


return {
    ...state,
    acceptSuggestion,
    clearSuggestion,
    fetchSuggestion,
    rejectSuggestion,
    toggleEnabled,

};
}
