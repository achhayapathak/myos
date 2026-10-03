import * as React from "react"
import { CheckSquare, Square } from "lucide-react"

/**
 * Validates and sanitizes a URL to prevent XSS (blocks javascript:, data:, vbscript:).
 */
export function sanitizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim()
  if (!trimmed) return "#"

  // Neutralize dangerous protocols
  const lower = trimmed.toLowerCase()
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:")
  ) {
    return "#"
  }

  // Allow safe relative URLs, http, https, and mailto (block protocol-relative // and /\)
  if (
    (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.startsWith("/\\")) ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("mailto:")
  ) {
    return trimmed
  }

  // Default to relative hash if unrecognized
  return "#"
}

/**
 * Parses inline markdown tokens (bold, italic, strikethrough, code, links)
 * into safe React elements. Strictly avoids dangerouslySetInnerHTML.
 */
export function renderInlineMarkdown(text: string): React.ReactNode[] {
  const elements: React.ReactNode[] = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    // 1. Inline code: `code`
    const codeMatch = remaining.match(/^`([^`]+)`/)
    if (codeMatch) {
      elements.push(
        <code
          key={key++}
          className="px-1.5 py-0.5 rounded bg-muted font-mono text-[0.85em] border border-border/60 text-foreground"
        >
          {codeMatch[1]}
        </code>
      )
      remaining = remaining.slice(codeMatch[0].length)
      continue
    }

    // 2. Bold: **text** or __text__
    const boldMatch = remaining.match(/^(\*\*|__)(.*?)\1/)
    if (boldMatch && boldMatch[2]) {
      elements.push(
        <strong key={key++} className="font-semibold text-foreground">
          {renderInlineMarkdown(boldMatch[2])}
        </strong>
      )
      remaining = remaining.slice(boldMatch[0].length)
      continue
    }

    // 3. Strikethrough: ~~text~~
    const strikeMatch = remaining.match(/^~~(.*?)~~/)
    if (strikeMatch && strikeMatch[1]) {
      elements.push(
        <del key={key++} className="line-through text-muted-foreground">
          {renderInlineMarkdown(strikeMatch[1])}
        </del>
      )
      remaining = remaining.slice(strikeMatch[0].length)
      continue
    }

    // 4. Italic: *text* or _text_
    const italicMatch = remaining.match(/^(\*|_)(.*?)\1/)
    if (italicMatch && italicMatch[2]) {
      elements.push(
        <em key={key++} className="italic text-foreground">
          {renderInlineMarkdown(italicMatch[2])}
        </em>
      )
      remaining = remaining.slice(italicMatch[0].length)
      continue
    }

    // 5. Links: [label](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/)
    if (linkMatch) {
      const safeHref = sanitizeUrl(linkMatch[2])
      elements.push(
        <a
          key={key++}
          href={safeHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-3 hover:text-primary/80 transition-colors"
        >
          {linkMatch[1]}
        </a>
      )
      remaining = remaining.slice(linkMatch[0].length)
      continue
    }

    // Find the next special character index
    const nextSpecialIndex = remaining.search(/[`*_~\[]/)
    if (nextSpecialIndex === -1) {
      // No more markdown symbols, append remaining text as safe text node
      elements.push(<React.Fragment key={key++}>{remaining}</React.Fragment>)
      break
    } else if (nextSpecialIndex === 0) {
      // First character didn't match a complete token, consume it as plain text
      elements.push(<React.Fragment key={key++}>{remaining[0]}</React.Fragment>)
      remaining = remaining.slice(1)
    } else {
      // Append text preceding the special character
      elements.push(
        <React.Fragment key={key++}>
          {remaining.slice(0, nextSpecialIndex)}
        </React.Fragment>
      )
      remaining = remaining.slice(nextSpecialIndex)
    }
  }

  return elements
}

interface MarkdownPreviewProps {
  content: string
  className?: string
}

/**
 * Pure, secure Markdown Renderer component.
 * Parses blocks into native React elements.
 * Immune to XSS attacks (no dangerouslySetInnerHTML, script execution, or dangerous URLs).
 */
export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  if (!content || !content.trim()) {
    return (
      <div className="text-xs text-muted-foreground/60 italic font-mono p-4">
        Nothing to preview yet. Write some markdown content.
      </div>
    )
  }

  const lines = content.split("\n")
  const blocks: React.ReactNode[] = []
  let blockKey = 0
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // 1. Fenced Code Block: ```lang
    if (line.trim().startsWith("```")) {
      const language = line.trim().slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i])
        i++
      }
      i++ // Skip closing ```

      blocks.push(
        <div
          key={blockKey++}
          className="my-3 rounded-lg border border-border/70 bg-muted/40 overflow-hidden font-mono text-xs"
        >
          {language && (
            <div className="px-3 py-1 border-b border-border/40 text-[10px] uppercase text-muted-foreground bg-muted/60">
              {language}
            </div>
          )}
          <pre className="p-3 overflow-x-auto text-foreground font-mono">
            <code>{codeLines.join("\n")}</code>
          </pre>
        </div>
      )
      continue
    }

    // 2. Horizontal Rule: --- or *** or ___
    if (/^(---|___|\*\*\*)\s*$/.test(line.trim())) {
      blocks.push(
        <hr key={blockKey++} className="my-4 border-t border-border/60" />
      )
      i++
      continue
    }

    // 3. Headings: #, ##, ###, ####, #####, ######
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const text = headingMatch[2]
      const renderedText = renderInlineMarkdown(text)

      switch (level) {
        case 1:
          blocks.push(
            <h1
              key={blockKey++}
              className="text-xl md:text-2xl font-bold tracking-tight text-foreground mt-4 mb-2 pb-1 border-b border-border/40"
            >
              {renderedText}
            </h1>
          )
          break
        case 2:
          blocks.push(
            <h2
              key={blockKey++}
              className="text-lg md:text-xl font-semibold tracking-tight text-foreground mt-3 mb-1.5"
            >
              {renderedText}
            </h2>
          )
          break
        case 3:
          blocks.push(
            <h3
              key={blockKey++}
              className="text-base md:text-lg font-semibold text-foreground mt-2.5 mb-1"
            >
              {renderedText}
            </h3>
          )
          break
        default:
          blocks.push(
            <h4
              key={blockKey++}
              className="text-sm font-semibold text-foreground mt-2 mb-1"
            >
              {renderedText}
            </h4>
          )
          break
      }
      i++
      continue
    }

    // 4. Blockquotes: > quote
    if (line.trim().startsWith(">")) {
      const quoteLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""))
        i++
      }

      blocks.push(
        <blockquote
          key={blockKey++}
          className="my-3 pl-3.5 border-l-2 border-primary/60 italic text-muted-foreground text-xs font-serif"
        >
          {quoteLines.map((ql, qIdx) => (
            <p key={qIdx} className="my-0.5">
              {renderInlineMarkdown(ql)}
            </p>
          ))}
        </blockquote>
      )
      continue
    }

    // 5. Task List or Unordered List: - [ ] or - [x] or - item
    if (/^\s*([*+-])\s+/.test(line)) {
      const listItems: React.ReactNode[] = []

      while (i < lines.length && /^\s*([*+-])\s+/.test(lines[i])) {
        const itemLine = lines[i].replace(/^\s*([*+-])\s+/, "")

        // Check for task checkbox: [ ] or [x]
        const taskMatch = itemLine.match(/^\[([ xX])\]\s+(.*)$/)
        if (taskMatch) {
          const isChecked = taskMatch[1].toLowerCase() === "x"
          listItems.push(
            <li key={listItems.length} className="flex items-start gap-2 my-1">
              <span className="mt-0.5 shrink-0">
                {isChecked ? (
                  <CheckSquare className="size-3.5 text-primary" />
                ) : (
                  <Square className="size-3.5 text-muted-foreground" />
                )}
              </span>
              <span className={isChecked ? "line-through text-muted-foreground" : "text-foreground"}>
                {renderInlineMarkdown(taskMatch[2])}
              </span>
            </li>
          )
        } else {
          listItems.push(
            <li key={listItems.length} className="my-0.5 list-disc ml-4 text-foreground">
              {renderInlineMarkdown(itemLine)}
            </li>
          )
        }
        i++
      }

      blocks.push(
        <ul key={blockKey++} className="my-2 space-y-0.5 text-xs">
          {listItems}
        </ul>
      )
      continue
    }

    // 6. Ordered List: 1. item
    if (/^\s*\d+\.\s+/.test(line)) {
      const listItems: React.ReactNode[] = []

      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        const itemLine = lines[i].replace(/^\s*\d+\.\s+/, "")
        listItems.push(
          <li key={listItems.length} className="my-0.5 list-decimal ml-4 text-foreground">
            {renderInlineMarkdown(itemLine)}
          </li>
        )
        i++
      }

      blocks.push(
        <ol key={blockKey++} className="my-2 space-y-0.5 text-xs">
          {listItems}
        </ol>
      )
      continue
    }

    // 7. Blank Lines
    if (!line.trim()) {
      i++
      continue
    }

    // 8. Standard Paragraph
    const paragraphLines: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith("```") &&
      !lines[i].trim().startsWith("#") &&
      !lines[i].trim().startsWith(">") &&
      !/^\s*([*+-])\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^(---|___|\*\*\*)\s*$/.test(lines[i].trim())
    ) {
      paragraphLines.push(lines[i])
      i++
    }

    blocks.push(
      <p key={blockKey++} className="my-2 text-xs text-foreground/90 leading-relaxed">
        {paragraphLines.map((pLine, pIdx) => (
          <React.Fragment key={pIdx}>
            {pIdx > 0 && <br />}
            {renderInlineMarkdown(pLine)}
          </React.Fragment>
        ))}
      </p>
    )
  }

  return (
    <div className={className || "font-sans space-y-1 text-xs"}>
      {blocks}
    </div>
  )
}
