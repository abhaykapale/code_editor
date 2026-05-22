"use client";

import React from "react";
import { File } from "lucide-react";

interface FileIconProps {
  extension: string;
  size?: number;
  className?: string;
}

// VS Code–style file icons based on file extension
const FileIcon = ({ extension, size = 16, className = "" }: FileIconProps) => {
  const ext = extension?.toLowerCase().replace(/^\./, "") || "";

  const iconConfig = getIconConfig(ext);

  if (iconConfig.svg) {
    return (
      <span
        className={`inline-flex items-center justify-center shrink-0 ${className}`}
        style={{ width: size, height: size }}
      >
        {iconConfig.svg(size)}
      </span>
    );
  }

  // Fallback: colored text badge
  if (iconConfig.label) {
    return (
      <span
        className={`inline-flex items-center justify-center shrink-0 rounded-sm font-bold leading-none ${className}`}
        style={{
          width: size,
          height: size,
          fontSize: size * 0.45,
          backgroundColor: iconConfig.bgColor || "#6b7280",
          color: iconConfig.textColor || "#fff",
        }}
      >
        {iconConfig.label}
      </span>
    );
  }

  // Ultimate fallback
  return <File size={size} className={`shrink-0 ${className}`} />;
};

interface IconConfig {
  svg?: (size: number) => React.ReactNode;
  label?: string;
  bgColor?: string;
  textColor?: string;
}

function getIconConfig(ext: string): IconConfig {
  switch (ext) {
    // ── React ─────────────────────────────────────────────
    case "tsx":
    case "jsx":
      return {
        svg: (s) => (
          <svg viewBox="0 0 24 24" width={s} height={s}>
            <circle cx="12" cy="12" r="2.2" fill="#61DAFB" />
            <g fill="none" stroke="#61DAFB" strokeWidth="1">
              <ellipse cx="12" cy="12" rx="10" ry="4" />
              <ellipse
                cx="12"
                cy="12"
                rx="10"
                ry="4"
                transform="rotate(60 12 12)"
              />
              <ellipse
                cx="12"
                cy="12"
                rx="10"
                ry="4"
                transform="rotate(120 12 12)"
              />
            </g>
          </svg>
        ),
      };

    // ── TypeScript ────────────────────────────────────────
    case "ts":
      return {
        svg: (s) => (
          <svg viewBox="0 0 24 24" width={s} height={s}>
            <rect width="24" height="24" rx="3" fill="#3178C6" />
            <text
              x="12"
              y="17"
              textAnchor="middle"
              fill="#fff"
              fontSize="13"
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
            >
              TS
            </text>
          </svg>
        ),
      };

    // ── JavaScript ────────────────────────────────────────
    case "js":
    case "mjs":
    case "cjs":
      return {
        svg: (s) => (
          <svg viewBox="0 0 24 24" width={s} height={s}>
            <rect width="24" height="24" rx="3" fill="#F7DF1E" />
            <text
              x="12"
              y="17"
              textAnchor="middle"
              fill="#323330"
              fontSize="13"
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
            >
              JS
            </text>
          </svg>
        ),
      };

    // ── HTML ──────────────────────────────────────────────
    case "html":
    case "htm":
      return {
        svg: (s) => (
          <svg viewBox="0 0 24 24" width={s} height={s}>
            <path d="M3 1l1.75 19.5L12 23l7.25-2.5L21 1H3z" fill="#E44D26" />
            <path d="M12 3v18l5.5-1.9L19 3H12z" fill="#F16529" />
            <text
              x="12"
              y="16"
              textAnchor="middle"
              fill="#fff"
              fontSize="8"
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
            >
              {"</>"}
            </text>
          </svg>
        ),
      };

    // ── CSS ───────────────────────────────────────────────
    case "css":
      return {
        svg: (s) => (
          <svg viewBox="0 0 24 24" width={s} height={s}>
            <path
              d="M3 1l1.75 19.5L12 23l7.25-2.5L21 1H3z"
              fill="#1572B6"
            />
            <path d="M12 3v18l5.5-1.9L19 3H12z" fill="#33A9DC" />
            <text
              x="12"
              y="16"
              textAnchor="middle"
              fill="#fff"
              fontSize="8"
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
            >
              {"{ }"}
            </text>
          </svg>
        ),
      };

    // ── SCSS / SASS ──────────────────────────────────────
    case "scss":
    case "sass":
      return {
        svg: (s) => (
          <svg viewBox="0 0 24 24" width={s} height={s}>
            <rect width="24" height="24" rx="3" fill="#CD6799" />
            <text
              x="12"
              y="17"
              textAnchor="middle"
              fill="#fff"
              fontSize="10"
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
            >
              S
            </text>
          </svg>
        ),
      };

    // ── JSON ─────────────────────────────────────────────
    case "json":
      return {
        svg: (s) => (
          <svg viewBox="0 0 24 24" width={s} height={s}>
            <rect width="24" height="24" rx="3" fill="#292929" />
            <text
              x="12"
              y="17"
              textAnchor="middle"
              fill="#FBC02D"
              fontSize="10"
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
            >
              {"{ }"}
            </text>
          </svg>
        ),
      };

    // ── Markdown ─────────────────────────────────────────
    case "md":
    case "mdx":
      return {
        svg: (s) => (
          <svg viewBox="0 0 24 24" width={s} height={s}>
            <rect
              x="1"
              y="4"
              width="22"
              height="16"
              rx="2"
              fill="none"
              stroke="#42A5F5"
              strokeWidth="1.5"
            />
            <path
              d="M4 16V8l3 4 3-4v8M16 8v8l3-3.5M19 12.5L16 16"
              fill="none"
              stroke="#42A5F5"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ),
      };

    // ── Python ────────────────────────────────────────────
    case "py":
    case "pyw":
      return {
        svg: (s) => (
          <svg viewBox="0 0 24 24" width={s} height={s}>
            <rect width="24" height="24" rx="3" fill="#3776AB" />
            <text
              x="12"
              y="17"
              textAnchor="middle"
              fill="#FFD43B"
              fontSize="13"
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
            >
              Py
            </text>
          </svg>
        ),
      };

    // ── Go ────────────────────────────────────────────────
    case "go":
      return {
        svg: (s) => (
          <svg viewBox="0 0 24 24" width={s} height={s}>
            <rect width="24" height="24" rx="3" fill="#00ADD8" />
            <text
              x="12"
              y="17"
              textAnchor="middle"
              fill="#fff"
              fontSize="13"
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
            >
              Go
            </text>
          </svg>
        ),
      };

    // ── Rust ──────────────────────────────────────────────
    case "rs":
      return {
        svg: (s) => (
          <svg viewBox="0 0 24 24" width={s} height={s}>
            <rect width="24" height="24" rx="3" fill="#DEA584" />
            <text
              x="12"
              y="17"
              textAnchor="middle"
              fill="#000"
              fontSize="12"
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
            >
              Rs
            </text>
          </svg>
        ),
      };

    // ── Java ──────────────────────────────────────────────
    case "java":
      return {
        svg: (s) => (
          <svg viewBox="0 0 24 24" width={s} height={s}>
            <rect width="24" height="24" rx="3" fill="#ED8B00" />
            <text
              x="12"
              y="17"
              textAnchor="middle"
              fill="#fff"
              fontSize="10"
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
            >
              J
            </text>
          </svg>
        ),
      };

    // ── C / C++ ──────────────────────────────────────────
    case "c":
      return { label: "C", bgColor: "#A8B9CC", textColor: "#fff" };
    case "cpp":
    case "cc":
    case "cxx":
      return { label: "C+", bgColor: "#00599C", textColor: "#fff" };
    case "h":
    case "hpp":
      return { label: "H", bgColor: "#6295CB", textColor: "#fff" };

    // ── C# ───────────────────────────────────────────────
    case "cs":
      return { label: "C#", bgColor: "#68217A", textColor: "#fff" };

    // ── PHP ──────────────────────────────────────────────
    case "php":
      return { label: "PHP", bgColor: "#777BB4", textColor: "#fff" };

    // ── Ruby ─────────────────────────────────────────────
    case "rb":
      return { label: "Rb", bgColor: "#CC342D", textColor: "#fff" };

    // ── Swift ────────────────────────────────────────────
    case "swift":
      return { label: "Sw", bgColor: "#FA7343", textColor: "#fff" };

    // ── Kotlin ───────────────────────────────────────────
    case "kt":
    case "kts":
      return { label: "Kt", bgColor: "#7F52FF", textColor: "#fff" };

    // ── Shell / Bash ─────────────────────────────────────
    case "sh":
    case "bash":
    case "zsh":
      return {
        svg: (s) => (
          <svg viewBox="0 0 24 24" width={s} height={s}>
            <rect width="24" height="24" rx="3" fill="#293138" />
            <text
              x="12"
              y="17"
              textAnchor="middle"
              fill="#4EAA25"
              fontSize="13"
              fontWeight="bold"
              fontFamily="monospace"
            >
              $&gt;
            </text>
          </svg>
        ),
      };

    // ── YAML / TOML ──────────────────────────────────────
    case "yml":
    case "yaml":
      return { label: "Y", bgColor: "#CB171E", textColor: "#fff" };
    case "toml":
      return { label: "T", bgColor: "#9C4121", textColor: "#fff" };

    // ── XML ──────────────────────────────────────────────
    case "xml":
    case "xsl":
      return { label: "<>", bgColor: "#E37933", textColor: "#fff" };

    // ── SQL ──────────────────────────────────────────────
    case "sql":
      return { label: "SQ", bgColor: "#336791", textColor: "#fff" };

    // ── Config / dotfiles ────────────────────────────────
    case "env":
    case "env.local":
    case "env.development":
    case "env.production":
      return {
        svg: (s) => (
          <svg viewBox="0 0 24 24" width={s} height={s}>
            <rect width="24" height="24" rx="3" fill="#ECD53F" />
            <text
              x="12"
              y="17"
              textAnchor="middle"
              fill="#323330"
              fontSize="9"
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
            >
              ENV
            </text>
          </svg>
        ),
      };

    case "lock":
      return {
        svg: (s) => (
          <svg viewBox="0 0 24 24" width={s} height={s}>
            <rect width="24" height="24" rx="3" fill="#555" />
            <path
              d="M8 11V8a4 4 0 018 0v3m-9 0h10a1 1 0 011 1v6a1 1 0 01-1 1H7a1 1 0 01-1-1v-6a1 1 0 011-1z"
              fill="none"
              stroke="#ddd"
              strokeWidth="1.5"
            />
          </svg>
        ),
      };

    // ── SVG ──────────────────────────────────────────────
    case "svg":
      return { label: "SV", bgColor: "#FFB13B", textColor: "#1a1a1a" };

    // ── Images ───────────────────────────────────────────
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
    case "ico":
    case "bmp":
      return {
        svg: (s) => (
          <svg viewBox="0 0 24 24" width={s} height={s}>
            <rect width="24" height="24" rx="3" fill="#26A69A" />
            <path
              d="M5 18l4-5 3 3 4-6 4 8H5z"
              fill="#fff"
              opacity="0.9"
            />
            <circle cx="9" cy="9" r="2" fill="#fff" opacity="0.9" />
          </svg>
        ),
      };

    // ── Video / Audio ────────────────────────────────────
    case "mp4":
    case "webm":
    case "mov":
    case "avi":
      return { label: "▶", bgColor: "#7B1FA2", textColor: "#fff" };
    case "mp3":
    case "wav":
    case "ogg":
      return { label: "♪", bgColor: "#F57C00", textColor: "#fff" };

    // ── Font ─────────────────────────────────────────────
    case "ttf":
    case "otf":
    case "woff":
    case "woff2":
      return { label: "Aa", bgColor: "#EC407A", textColor: "#fff" };

    // ── Dockerfile ───────────────────────────────────────
    case "dockerfile":
      return { label: "🐳", bgColor: "#2496ED", textColor: "#fff" };

    // ── Prisma ───────────────────────────────────────────
    case "prisma":
      return { label: "P", bgColor: "#2D3748", textColor: "#5A67D8" };

    // ── GraphQL ──────────────────────────────────────────
    case "graphql":
    case "gql":
      return { label: "GQ", bgColor: "#E535AB", textColor: "#fff" };

    // ── Tailwind Config ──────────────────────────────────
    case "tailwind":
      return { label: "Tw", bgColor: "#06B6D4", textColor: "#fff" };

    // ── txt ──────────────────────────────────────────────
    case "txt":
    case "text":
      return { label: "Tx", bgColor: "#78909C", textColor: "#fff" };

    // ── Log ──────────────────────────────────────────────
    case "log":
      return { label: "Lo", bgColor: "#607D8B", textColor: "#fff" };

    // ── Default ──────────────────────────────────────────
    default:
      return {};
  }
}

export default FileIcon;
