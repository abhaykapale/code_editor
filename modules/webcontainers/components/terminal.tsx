"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import type { Terminal as XTermTerminal } from "xterm";
import type { FitAddon } from "xterm-addon-fit";
import type { SearchAddon } from "xterm-addon-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Copy, Trash2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import "xterm/css/xterm.css";

interface TerminalProps {
  webcontainerUrl?: string;
  className?: string;
  theme?: "dark" | "light";
  webContainerInstance?: any;
}

export interface TerminalRef {
  writeToTerminal: (data: string) => void;
  clearTerminal: () => void;
  focusTerminal: () => void;
}

const TerminalComponent = forwardRef<TerminalRef, TerminalProps>(
  (
    { webcontainerUrl, className, theme = "dark", webContainerInstance },
    ref,
  ) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const term = useRef<XTermTerminal | null>(null);
    const fitAddon = useRef<FitAddon | null>(null);
    const searchAddon = useRef<SearchAddon | null>(null);

    const [isConnected, setIsConnected] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [showSearch, setShowSearch] = useState(false);

    const currentLine = useRef("");
    const cursorPosition = useRef(0);
    const commandHistory = useRef<string[]>([]);
    const historyIndex = useRef(-1);
    const currentProcess = useRef<any>(null);

    const terminalThemes = {
      dark: {
        background: "#09090B",
        foreground: "#FAFAFA",
        cursor: "#FAFAFA",
        cursorAccent: "#09090B",
        selection: "#27272A",
        black: "#18181B",
        red: "#EF4444",
        green: "#22C55E",
        yellow: "#EAB308",
        blue: "#3B82F6",
        magenta: "#A855F7",
        cyan: "#06B6D4",
        white: "#F4F4F5",
        brightBlack: "#3F3F46",
        brightRed: "#F87171",
        brightGreen: "#4ADE80",
        brightYellow: "#FDE047",
        brightBlue: "#60A5FA",
        brightMagenta: "#C084FC",
        brightCyan: "#22D3EE",
        brightWhite: "#FFFFFF",
      },
      light: {
        background: "#FFFFFF",
        foreground: "#18181B",
        cursor: "#18181B",
        cursorAccent: "#FFFFFF",
        selection: "#E4E4E7",
        black: "#18181B",
        red: "#DC2626",
        green: "#16A34A",
        yellow: "#CA8A04",
        blue: "#2563EB",
        magenta: "#9333EA",
        cyan: "#0891B2",
        white: "#F4F4F5",
        brightBlack: "#71717A",
        brightRed: "#EF4444",
        brightGreen: "#22C55E",
        brightYellow: "#EAB308",
        brightBlue: "#3B82F6",
        brightMagenta: "#A855F7",
        brightCyan: "#06B6D4",
        brightWhite: "#FAFAFA",
      },
    };

    const writePrompt = useCallback(() => {
      if (!term.current) return;

      term.current.write("\r\n$ ");
      currentLine.current = "";
      cursorPosition.current = 0;
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        writeToTerminal: (data: string) => {
          term.current?.write(data);
        },

        clearTerminal: () => {
          if (!term.current) return;

          term.current.clear();
          term.current.writeln("🚀 WebContainer Terminal");
          writePrompt();
        },

        focusTerminal: () => {
          term.current?.focus();
        },
      }),
      [writePrompt],
    );

    const executeCommand = useCallback(
      async (command: string) => {
        if (!webContainerInstance || !term.current) return;

        if (
          command.trim() &&
          commandHistory.current[commandHistory.current.length - 1] !== command
        ) {
          commandHistory.current.push(command);
        }

        historyIndex.current = -1;

        try {
          const trimmedCommand = command.trim();

          if (trimmedCommand === "clear") {
            term.current.clear();
            writePrompt();
            return;
          }

          if (trimmedCommand === "history") {
            commandHistory.current.forEach((cmd, index) => {
              term.current?.writeln(` ${index + 1}  ${cmd}`);
            });

            writePrompt();
            return;
          }

          if (!trimmedCommand) {
            writePrompt();
            return;
          }

          const parts = trimmedCommand.split(/\s+/);
          const cmd = parts[0];
          const args = parts.slice(1);

          term.current.writeln("");

          const process = await webContainerInstance.spawn(cmd, args, {
            terminal: {
              cols: term.current.cols,
              rows: term.current.rows,
            },
          });

          currentProcess.current = process;

          process.output.pipeTo(
            new WritableStream({
              write(data) {
                term.current?.write(data);
              },
            }),
          );

          await process.exit;

          currentProcess.current = null;
          writePrompt();
        } catch (error) {
          console.error("Terminal command error:", error);

          term.current?.writeln(`Command failed: ${command}`);

          currentProcess.current = null;
          writePrompt();
        }
      },
      [webContainerInstance, writePrompt],
    );

    const handleTerminalInput = useCallback(
      (data: string) => {
        if (!term.current) return;

        switch (data) {
          case "\r": {
            executeCommand(currentLine.current);
            break;
          }

          case "\x7f": {
            if (cursorPosition.current > 0) {
              currentLine.current =
                currentLine.current.slice(0, cursorPosition.current - 1) +
                currentLine.current.slice(cursorPosition.current);

              cursorPosition.current--;

              term.current.write("\b \b");
            }

            break;
          }

          case "\x03": {
            if (currentProcess.current) {
              currentProcess.current.kill();
              currentProcess.current = null;
            }

            term.current.writeln("^C");
            writePrompt();

            break;
          }

          case "\x1b[A": {
            if (commandHistory.current.length === 0) break;

            if (historyIndex.current === -1) {
              historyIndex.current = commandHistory.current.length - 1;
            } else if (historyIndex.current > 0) {
              historyIndex.current--;
            }

            const historyCommand = commandHistory.current[historyIndex.current];

            term.current.write(
              "\r$ " + " ".repeat(currentLine.current.length) + "\r$ ",
            );

            term.current.write(historyCommand);

            currentLine.current = historyCommand;
            cursorPosition.current = historyCommand.length;

            break;
          }

          case "\x1b[B": {
            if (historyIndex.current === -1) break;

            if (historyIndex.current < commandHistory.current.length - 1) {
              historyIndex.current++;

              const historyCommand =
                commandHistory.current[historyIndex.current];

              term.current.write(
                "\r$ " + " ".repeat(currentLine.current.length) + "\r$ ",
              );

              term.current.write(historyCommand);

              currentLine.current = historyCommand;
              cursorPosition.current = historyCommand.length;
            } else {
              historyIndex.current = -1;

              term.current.write(
                "\r$ " + " ".repeat(currentLine.current.length) + "\r$ ",
              );

              currentLine.current = "";
              cursorPosition.current = 0;
            }

            break;
          }

          default: {
            if (data >= " " || data === "\t") {
              currentLine.current =
                currentLine.current.slice(0, cursorPosition.current) +
                data +
                currentLine.current.slice(cursorPosition.current);

              cursorPosition.current += data.length;

              term.current.write(data);
            }

            break;
          }
        }
      },
      [executeCommand, writePrompt],
    );

    const initializeTerminal = useCallback(async () => {
      if (!terminalRef.current || term.current) return;

      try {
        const [{ Terminal }, { FitAddon }, { SearchAddon }, { WebLinksAddon }] =
          await Promise.all([
            import("xterm"),
            import("xterm-addon-fit"),
            import("xterm-addon-search"),
            import("xterm-addon-web-links"),
          ]);

        if (!terminalRef.current || term.current) return;

        const terminal = new Terminal({
          cursorBlink: true,
          fontFamily: '"Fira Code", "JetBrains Mono", "Consolas", monospace',
          fontSize: 14,
          lineHeight: 1.2,
          letterSpacing: 0,
          theme: terminalThemes[theme],
          allowTransparency: false,
          convertEol: true,
          scrollback: 1000,
          tabStopWidth: 4,
        });

        const fitAddonInstance = new FitAddon();
        const webLinksAddon = new WebLinksAddon();
        const searchAddonInstance = new SearchAddon();

        terminal.loadAddon(fitAddonInstance);
        terminal.loadAddon(webLinksAddon);
        terminal.loadAddon(searchAddonInstance);

        terminal.open(terminalRef.current);

        fitAddon.current = fitAddonInstance;
        searchAddon.current = searchAddonInstance;
        term.current = terminal;

        terminal.onData(handleTerminalInput);

        requestAnimationFrame(() => {
          try {
            fitAddonInstance.fit();
          } catch (error) {
            console.error("Terminal fit error:", error);
          }
        });

        terminal.writeln("🚀 WebContainer Terminal");
        terminal.writeln("Type 'help' for available commands");
        writePrompt();
      } catch (error) {
        console.error("Failed to initialize terminal:", error);
      }
    }, [theme, handleTerminalInput, writePrompt]);

    const connectToWebContainer = useCallback(async () => {
      if (!webContainerInstance || !term.current) return;

      try {
        setIsConnected(true);

        term.current.writeln("✅ Connected to WebContainer");

        term.current.writeln("Ready to execute commands");

        writePrompt();
      } catch (error) {
        console.error("WebContainer connection error:", error);

        setIsConnected(false);

        term.current?.writeln("❌ Failed to connect to WebContainer");
      }
    }, [webContainerInstance, writePrompt]);

    const clearTerminal = useCallback(() => {
      if (!term.current) return;

      term.current.clear();
      term.current.writeln("🚀 WebContainer Terminal");
      writePrompt();
    }, [writePrompt]);

    const copyTerminalContent = useCallback(async () => {
      if (!term.current) return;

      const content = term.current.getSelection();

      if (!content) return;

      try {
        await navigator.clipboard.writeText(content);
      } catch (error) {
        console.error("Failed to copy terminal content:", error);
      }
    }, []);

    const downloadTerminalLog = useCallback(() => {
      if (!term.current) return;

      const buffer = term.current.buffer.active;
      let content = "";

      for (let i = 0; i < buffer.length; i++) {
        const line = buffer.getLine(i);

        if (line) {
          content += line.translateToString(true) + "\n";
        }
      }

      const blob = new Blob([content], {
        type: "text/plain",
      });

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = `terminal-log-${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/:/g, "-")}.txt`;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(url);
    }, []);

    const searchInTerminal = useCallback((value: string) => {
      if (!searchAddon.current || !value.trim()) return;

      searchAddon.current.findNext(value);
    }, []);

    useEffect(() => {
      let cancelled = false;

      const initialize = async () => {
        if (cancelled) return;
        await initializeTerminal();
      };

      initialize();

      return () => {
        cancelled = true;

        if (currentProcess.current) {
          try {
            currentProcess.current.kill();
          } catch (error) {
            console.error("Failed to kill current process:", error);
          }

          currentProcess.current = null;
        }

        if (term.current) {
          term.current.dispose();
          term.current = null;
        }

        fitAddon.current = null;
        searchAddon.current = null;
        setIsConnected(false);
      };
    }, [initializeTerminal]);

    useEffect(() => {
      if (!webContainerInstance) return;
      if (!term.current) return;
      if (isConnected) return;

      connectToWebContainer();
    }, [webContainerInstance, connectToWebContainer, isConnected]);

    useEffect(() => {
      if (!terminalRef.current) return;

      const resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => {
          try {
            fitAddon.current?.fit();
          } catch (error) {
            console.error("Terminal resize error:", error);
          }
        });
      });

      resizeObserver.observe(terminalRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    }, []);

    return (
      <div
        className={cn(
          "flex flex-col h-full bg-background border rounded-lg overflow-hidden",
          className,
        )}>
        <div className='flex items-center justify-between px-3 py-2 border-b bg-muted/50'>
          <div className='flex items-center gap-2'>
            <span className='text-sm font-medium'>Terminal</span>

            {isConnected && (
              <div className='flex items-center gap-1'>
                <div className='w-2 h-2 rounded-full bg-green-500 animate-pulse' />
                <span className='text-xs text-muted-foreground'>Connected</span>
              </div>
            )}
          </div>

          <div className='flex items-center gap-1'>
            {showSearch && (
              <div className='flex items-center gap-2'>
                <Input
                  placeholder='Search...'
                  value={searchTerm}
                  onChange={(event) => {
                    const value = event.target.value;

                    setSearchTerm(value);
                    searchInTerminal(value);
                  }}
                  className='h-6 w-32 text-xs'
                />
              </div>
            )}

            <Button
              variant='ghost'
              size='sm'
              onClick={() => setShowSearch((previous) => !previous)}
              className='h-6 w-6 p-0'>
              <Search className='h-3 w-3' />
            </Button>

            <Button
              variant='ghost'
              size='sm'
              onClick={copyTerminalContent}
              className='h-6 w-6 p-0'>
              <Copy className='h-3 w-3' />
            </Button>

            <Button
              variant='ghost'
              size='sm'
              onClick={downloadTerminalLog}
              className='h-6 w-6 p-0'>
              <Download className='h-3 w-3' />
            </Button>

            <Button
              variant='ghost'
              size='sm'
              onClick={clearTerminal}
              className='h-6 w-6 p-0'>
              <Trash2 className='h-3 w-3' />
            </Button>
          </div>
        </div>

        <div className='flex-1 relative'>
          <div
            ref={terminalRef}
            className='absolute inset-0 p-2'
            style={{
              background: terminalThemes[theme].background,
            }}
          />
        </div>
      </div>
    );
  },
);

TerminalComponent.displayName = "TerminalComponent";

export default TerminalComponent;
