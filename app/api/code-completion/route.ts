import { NextRequest, NextResponse } from "next/server";

const DEFAULT_CONTEXT_RADIUS = 10;

interface CodeSuggestionRequest {
    fileContent: string;
    cursorLine: number;
    cursorColumn: number;
    suggestionType: "explain" | "refactor" | "complete" | "fix";
    fileName?: string;
}

interface CodeContext {
    language: string;
    framework: string;
    surroundingCode: {
        before: string;
        current: string;
        after: string;
    };
    cursorPosition: {
        line: number;
        column: number;
    };
    scope: {
        isInFunction: boolean;
        isInClass: boolean;
    };
    comments: {
        isAfterComment: boolean;
    };
    syntax: {
        incompletePatterns: string[];
    };
    metadata: {
        fileName?: string;
        timestamp: number;
        contextRadius: number;
    };
}

export async function POST(request: NextRequest) {
    try {
        const body: CodeSuggestionRequest = await request.json();

        const {
            fileContent,
            cursorLine,
            cursorColumn,
            suggestionType,
            fileName
        } = body;

        if (!fileContent || cursorLine < 0 || cursorColumn < 0) {
            return NextResponse.json(
                { error: "Invalid parameters" },
                { status: 400 }
            );
        }

        const context = analyzeCodeContext(
            fileContent,
            cursorLine,
            cursorColumn,
            fileName
        );

        const prompt = buildPrompt(context, suggestionType);
        const suggestion = await generateSuggestion(prompt);

        return NextResponse.json({
            success: true,
            suggestion,
            context,
            metadata: {
                generatedAt: new Date().toISOString()
            }
        });

    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

export function analyzeCodeContext(
    content: string,
    line: number,
    column: number,
    fileName?: string,
    contextRadius = DEFAULT_CONTEXT_RADIUS
): CodeContext {

    const lines = content.split("\n");
    const safeLine = Math.max(0, Math.min(line, lines.length - 1));

    const current = lines[safeLine] ?? "";

    const before = lines
        .slice(Math.max(0, safeLine - contextRadius), safeLine)
        .join("\n");

    const after = lines
        .slice(safeLine + 1, safeLine + contextRadius + 1)
        .join("\n");

    return {
        language: detectLanguage(content, fileName),
        framework: detectFramework(content),

        surroundingCode: {
            before,
            current,
            after
        },

        cursorPosition: {
            line: safeLine,
            column
        },

        scope: {
            isInFunction: detectInFunction(lines, safeLine),
            isInClass: detectInClass(lines, safeLine)
        },

        comments: {
            isAfterComment: detectAfterComment(current, column)
        },

        syntax: {
            incompletePatterns:
                detectIncompletePatterns(current, column)
        },

        metadata: {
            fileName,
            timestamp: Date.now(),
            contextRadius
        }
    };
}

const extensionMap: Record<string, string> = {
    ts:"typescript",
    tsx:"typescriptreact",
    js:"javascript",
    jsx:"javascriptreact",
    py:"python",
    cpp:"cpp",
    c:"c",
    java:"java",
    go:"go",
    rs:"rust",
    php:"php"
};

function detectLanguage(
    content: string,
    fileName?: string
): string {

    if (fileName) {
        const ext =
            fileName
                .split(".")
                .pop()
                ?.toLowerCase();

        return extensionMap[ext ?? ""] ?? "unknown";
    }

    if (/def\s+\w+/.test(content))
        return "python";

    return "unknown";
}

function detectFramework(content: string): string {

    const frameworks = [

        { name:"react", regex:/useState|useEffect/ },

        { name:"next", regex:/next\/|app\/page/ },

        { name:"express", regex:/express\(\)/ },

        { name:"nestjs", regex:/@Controller/ }

    ];

    return (
        frameworks.find(
            f => f.regex.test(content)
        )?.name ?? "unknown"
    );
}

function detectInFunction(
    lines: string[],
    current: number
): boolean {

    return lines
        .slice(0, current)
        .join("\n")
        .match(/function|=>|async/)
        !== null;
}

function detectInClass(
    lines: string[],
    current: number
): boolean {

    return lines
        .slice(0, current)
        .join("\n")
        .match(/class\s+\w+/)
        !== null;
}

function detectAfterComment(
    line: string,
    column: number
): boolean {

    return /\/\/|#/
        .test(
            line.slice(
                0,
                column
            )
        );
}

function detectIncompletePatterns(
    line: string,
    column: number
): string[] {

    const current =
        line.slice(
            0,
            column
        );

    const patterns:
        string[] = [];

    if (/\($/.test(current))
        patterns.push("function_call");

    if (/\.\w*$/.test(current))
        patterns.push("property_access");

    return patterns;
}

function buildPrompt(
    context: CodeContext,
    type: string
): string {

    return `
Type:${type}

Language:${context.language}

Framework:${context.framework}

Current:
${context.surroundingCode.current}

Before:
${context.surroundingCode.before}

After:
${context.surroundingCode.after}
`;
}

async function generateSuggestion(prompt: string) {
    try {
        const response = await fetch("http://localhost:11434/api/generate",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "gpt-oss:20b",
                    prompt,
                    stream: false,
                    options: {                   // ✅ Fix 3: was "option"
                        temperature: 0.7,        // ✅ Fix 2: was "temparature"
                        max_tokens: 300,
                    }
                })
            }
        );

        if (!response.ok) throw new Error(`AI service error: ${response.statusText}`);

        const data = await response.json();
        let suggestion = data.response;

        if (suggestion.includes("```")) {
            const codeMatch = suggestion.match(/```[\w]*\n?([\s\S]*?)```/);
            suggestion = codeMatch ? codeMatch[1].trim() : suggestion; // ✅ Fix 1: was "suggestion -"
        }

        return suggestion;

    } catch (error) {
        console.error(error); // ✅ Fix 5: was console.log
        // return "AI suggestion unavailable";
        return null;
    }
}