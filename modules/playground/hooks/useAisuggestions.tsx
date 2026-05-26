import { useState, useCallback } from "react";

interface AiSuggestionsState {
    suggestion: string | null;
    isLoading: boolean;
    postion: { line: number; column: number } | null;
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
        postion: null,
        decoration: [],
        isEnabled: true,
    });

    const toggleEnabled = useCallback(() => {
        setState(prev => ({ ...prev, isEnabled: !prev.isEnabled }));
    }, []);

 const fetchSuggestion = useCallback(async (type: string, editor: any) => {
    setState((currentState) => {

        if (!currentState.isEnabled) {
            return currentState;
        }

        if (!editor) {
            return currentState;
        }

        const model = editor.getModel();
        const cursorPosition = editor.getPosition();

        if (!model || !cursorPosition) {
            return currentState;
        }

        const newState = {
            ...currentState,isLoading :true 
        };

        (async() => { 
            try {
                const payload  = {
                    fileContent: model.getvalue(),
                    cursorLine:cursorPosition.lineNumber-1,
                    cursorColumn: cursorPosition.column-1,
                    suggestionType:type
                }

                const response = await fetch('/api/code-suggestions', {
                    method: "POST",
                    headers : {"Content-Type" :"application/json"},
                    body : JSON.stringify(payload
                    )
                })

                if(!response.ok) {
                    throw new Error (`API responded with status ${response.status}`)
                }
                const data = await response.json()

                if(data.suggestion)
                {
                    const suggestionText  =data.suggestion.trim();
                    setState((prev)=> ({
                        ...prev,
                        suggestion:suggestionText,
                        postion : {
                            line : cursorPosition.linNumber,
                            column : cursorPosition.column
                        },
                        isLoading : false
                    }))

                }
                else
                {
                    setState((prev)=> ({
                        ...prev,
                        isLoading : false
                    }))
                }
            } catch (error) {
                setState((prev)=> ({
                        ...prev,
                        isLoading : false
                    }))
                    console.log(error);       
            }
        })();    
        return newState;
    });
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

}
}
