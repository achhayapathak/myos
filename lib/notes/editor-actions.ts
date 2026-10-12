export interface TextSelection {
  start: number
  end: number
}

export interface FormatResult {
  text: string
  selection: TextSelection
}

export interface ActiveFormats {
  bold: boolean
  italic: boolean
  underline: boolean
  strikethrough: boolean
  code: boolean
  h1: boolean
  h2: boolean
  h3: boolean
  bulletList: boolean
  numberList: boolean
  taskList: boolean
  quote: boolean
  codeBlock: boolean
}

/**
 * Toggles an inline format wrapping (e.g. bold **, italic *, strikethrough ~~, inline code `).
 */
export function toggleInlineFormat(
  text: string,
  start: number,
  end: number,
  prefix: string,
  suffix: string
): FormatResult {
  const selectedText = text.slice(start, end)
  const prefixLen = prefix.length
  const suffixLen = suffix.length

  // Case 1: Selection itself starts with prefix and ends with suffix
  if (
    selectedText.length >= prefixLen + suffixLen &&
    selectedText.startsWith(prefix) &&
    selectedText.endsWith(suffix)
  ) {
    const unwrapped = selectedText.slice(prefixLen, -suffixLen)
    const newText = text.slice(0, start) + unwrapped + text.slice(end)
    return {
      text: newText,
      selection: {
        start,
        end: start + unwrapped.length,
      },
    }
  }

  // Case 2: Text immediately outside the selection has prefix and suffix
  if (
    start >= prefixLen &&
    end + suffixLen <= text.length &&
    text.slice(start - prefixLen, start) === prefix &&
    text.slice(end, end + suffixLen) === suffix
  ) {
    const newText = text.slice(0, start - prefixLen) + selectedText + text.slice(end + suffixLen)
    return {
      text: newText,
      selection: {
        start: start - prefixLen,
        end: end - prefixLen,
      },
    }
  }

  // Case 3: Empty selection -> insert empty markers with cursor in between
  if (start === end) {
    const newText = text.slice(0, start) + prefix + suffix + text.slice(end)
    return {
      text: newText,
      selection: {
        start: start + prefixLen,
        end: start + prefixLen,
      },
    }
  }

  // Case 4: Non-empty selection -> wrap selection
  const newText = text.slice(0, start) + prefix + selectedText + suffix + text.slice(end)
  return {
    text: newText,
    selection: {
      start: start + prefixLen,
      end: end + prefixLen,
    },
  }
}

/**
 * Toggles underline formatting using HTML <u>...</u> tags.
 */
export function toggleUnderline(text: string, start: number, end: number): FormatResult {
  return toggleInlineFormat(text, start, end, "<u>", "</u>")
}

/**
 * Helper to get line boundaries containing the selection.
 */
function getLineBoundaries(text: string, start: number, end: number) {
  const lineStart = text.lastIndexOf("\n", Math.max(0, start - 1)) + 1
  let lineEnd = text.indexOf("\n", end)
  if (lineEnd === -1) {
    lineEnd = text.length
  }
  return { lineStart, lineEnd }
}

/**
 * Toggles headings (H1, H2, H3).
 */
export function toggleHeading(
  text: string,
  start: number,
  end: number,
  level: 1 | 2 | 3
): FormatResult {
  const { lineStart, lineEnd } = getLineBoundaries(text, start, end)
  const targetPrefix = `${"#".repeat(level)} `
  const lines = text.slice(lineStart, lineEnd).split("\n")

  // Check if first line already has this exact heading
  const firstLine = lines[0] || ""
  const isTargetHeading = firstLine.startsWith(targetPrefix)

  const updatedLines = lines.map((line) => {
    // Strip any existing heading # prefix
    const stripped = line.replace(/^#{1,6}\s+/, "")
    if (isTargetHeading) {
      // Toggle off
      return stripped
    }
    // Set new heading
    return `${targetPrefix}${stripped}`
  })

  const newBlock = updatedLines.join("\n")
  const newText = text.slice(0, lineStart) + newBlock + text.slice(lineEnd)
  const diff = newBlock.length - (lineEnd - lineStart)

  return {
    text: newText,
    selection: {
      start: Math.max(lineStart, start + (isTargetHeading ? -targetPrefix.length : targetPrefix.length)),
      end: Math.max(lineStart, end + diff),
    },
  }
}

/**
 * Toggles bullet, numbered, or task checklist list formatting.
 */
export function toggleList(
  text: string,
  start: number,
  end: number,
  type: "bullet" | "number" | "task"
): FormatResult {
  const { lineStart, lineEnd } = getLineBoundaries(text, start, end)
  const lines = text.slice(lineStart, lineEnd).split("\n")

  // Check if all non-empty lines already have the requested prefix
  const isMatching = lines.every((line) => {
    if (!line.trim()) return true
    if (type === "bullet") return /^\s*[-*]\s+/.test(line)
    if (type === "number") return /^\s*\d+\.\s+/.test(line)
    if (type === "task") return /^\s*[-*]\s*\[[ xX]\]\s+/.test(line)
    return false
  })

  let numIndex = 1
  const updatedLines = lines.map((line) => {
    if (!line.trim()) return line

    // Strip existing list markers
    const cleaned = line
      .replace(/^\s*[-*]\s*\[[ xX]\]\s+/, "")
      .replace(/^\s*[-*]\s+/, "")
      .replace(/^\s*\d+\.\s+/, "")

    if (isMatching) {
      return cleaned
    }

    if (type === "bullet") {
      return `- ${cleaned}`
    } else if (type === "number") {
      return `${numIndex++}. ${cleaned}`
    } else {
      return `- [ ] ${cleaned}`
    }
  })

  const newBlock = updatedLines.join("\n")
  const newText = text.slice(0, lineStart) + newBlock + text.slice(lineEnd)
  const diff = newBlock.length - (lineEnd - lineStart)

  return {
    text: newText,
    selection: {
      start: lineStart,
      end: Math.max(lineStart, end + diff),
    },
  }
}

/**
 * Toggles blockquote (>).
 */
export function toggleBlockquote(text: string, start: number, end: number): FormatResult {
  const { lineStart, lineEnd } = getLineBoundaries(text, start, end)
  const lines = text.slice(lineStart, lineEnd).split("\n")

  const allQuoted = lines.every((l) => !l.trim() || /^\s*>\s?/.test(l))

  const updatedLines = lines.map((line) => {
    if (allQuoted) {
      return line.replace(/^\s*>\s?/, "")
    }
    return `> ${line.replace(/^\s*>\s?/, "")}`
  })

  const newBlock = updatedLines.join("\n")
  const newText = text.slice(0, lineStart) + newBlock + text.slice(lineEnd)
  const diff = newBlock.length - (lineEnd - lineStart)

  return {
    text: newText,
    selection: {
      start: lineStart,
      end: Math.max(lineStart, end + diff),
    },
  }
}

/**
 * Toggles fenced code block (```).
 */
export function toggleCodeBlock(
  text: string,
  start: number,
  end: number,
  language = ""
): FormatResult {
  const selected = text.slice(start, end)

  if (!selected.trim()) {
    // Empty insertion
    const insertion = `\`\`\`${language}\n\n\`\`\`\n`
    const newText = text.slice(0, start) + insertion + text.slice(end)
    const cursorInside = start + 3 + language.length + 1
    return {
      text: newText,
      selection: {
        start: cursorInside,
        end: cursorInside,
      },
    }
  }

  // If already wrapped in ```...```
  if (selected.startsWith("```") && selected.endsWith("```")) {
    const inner = selected.replace(/^```[^\n]*\n?/, "").replace(/\n?```$/, "")
    const newText = text.slice(0, start) + inner + text.slice(end)
    return {
      text: newText,
      selection: {
        start,
        end: start + inner.length,
      },
    }
  }

  const insertion = `\`\`\`${language}\n${selected}\n\`\`\`\n`
  const newText = text.slice(0, start) + insertion + text.slice(end)
  return {
    text: newText,
    selection: {
      start,
      end: start + insertion.length,
    },
  }
}

/**
 * Inserts a markdown link: [text](url).
 */
export function insertLink(
  text: string,
  start: number,
  end: number,
  url = "https://",
  linkTitle = ""
): FormatResult {
  const selected = text.slice(start, end).trim()
  let label = linkTitle.trim()
  let finalUrl = url.trim()

  if (!label) {
    if (selected && !/^https?:\/\//i.test(selected)) {
      label = selected
    } else {
      label = "link"
    }
  }

  if (!finalUrl && /^https?:\/\//i.test(selected)) {
    finalUrl = selected
  } else if (!finalUrl) {
    finalUrl = "https://"
  }

  const snippet = `[${label}](${finalUrl})`
  const newText = text.slice(0, start) + snippet + text.slice(end)

  return {
    text: newText,
    selection: {
      start: start + snippet.length,
      end: start + snippet.length,
    },
  }
}

/**
 * Inserts a horizontal rule (divider).
 */
export function insertHorizontalRule(text: string, start: number, end: number): FormatResult {
  const prefix = start > 0 && text[start - 1] !== "\n" ? "\n\n" : "\n"
  const suffix = end < text.length && text[end] !== "\n" ? "\n\n" : "\n"
  const rule = `${prefix}---${suffix}`

  const newText = text.slice(0, start) + rule + text.slice(end)
  const pos = start + rule.length

  return {
    text: newText,
    selection: {
      start: pos,
      end: pos,
    },
  }
}

/**
 * Inserts a standard markdown table template.
 */
export function insertTable(
  text: string,
  start: number,
  end: number,
  rows = 2,
  cols = 3
): FormatResult {
  const prefix = start > 0 && text[start - 1] !== "\n" ? "\n\n" : ""
  const headerCols = Array.from({ length: cols }, (_, i) => `Column ${i + 1}`).join(" | ")
  const dividerCols = Array.from({ length: cols }, () => "---").join(" | ")

  const dataRows = Array.from({ length: rows }, (_, r) => {
    return `| ${Array.from({ length: cols }, (_, c) => `Row ${r + 1} Col ${c + 1}`).join(" | ")} |`
  }).join("\n")

  const tableSnippet = `${prefix}| ${headerCols} |\n| ${dividerCols} |\n${dataRows}\n\n`
  const newText = text.slice(0, start) + tableSnippet + text.slice(end)

  return {
    text: newText,
    selection: {
      start: start + prefix.length + 2,
      end: start + prefix.length + 10, // highlights "Column 1"
    },
  }
}

/**
 * Strips markdown and HTML formatting from selected text.
 */
export function clearFormatting(text: string, start: number, end: number): FormatResult {
  if (start === end) {
    return { text, selection: { start, end } }
  }

  const selected = text.slice(start, end)
  const stripped = selected
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s*\[[ xX]\]\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/<\/?[a-z0-9]+[^>]*>/gi, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")

  const newText = text.slice(0, start) + stripped + text.slice(end)

  return {
    text: newText,
    selection: {
      start,
      end: start + stripped.length,
    },
  }
}

/**
 * Indents selected lines (adds 2 spaces) or unindents (removes up to 2 spaces).
 */
export function indentLines(
  text: string,
  start: number,
  end: number,
  outdent = false
): FormatResult {
  const { lineStart, lineEnd } = getLineBoundaries(text, start, end)
  const lines = text.slice(lineStart, lineEnd).split("\n")

  const updatedLines = lines.map((line) => {
    if (outdent) {
      if (line.startsWith("  ")) return line.slice(2)
      if (line.startsWith(" ")) return line.slice(1)
      if (line.startsWith("\t")) return line.slice(1)
      return line
    }
    return `  ${line}`
  })

  const newBlock = updatedLines.join("\n")
  const newText = text.slice(0, lineStart) + newBlock + text.slice(lineEnd)
  const diff = newBlock.length - (lineEnd - lineStart)

  return {
    text: newText,
    selection: {
      start: Math.max(lineStart, start + (outdent ? -2 : 2)),
      end: Math.max(lineStart, end + diff),
    },
  }
}

/**
 * Detects which formatting options are active at current selection/cursor position.
 */
export function detectActiveFormats(text: string, start: number, end: number): ActiveFormats {
  const { lineStart, lineEnd } = getLineBoundaries(text, start, end)
  const currentLine = text.slice(lineStart, lineEnd)
  const selected = text.slice(start, end)

  // Line-level checks
  const h1 = /^#\s/.test(currentLine)
  const h2 = /^##\s/.test(currentLine)
  const h3 = /^###\s/.test(currentLine)
  const bulletList = /^\s*[-*]\s+/.test(currentLine) && !/^\s*[-*]\s*\[[ xX]\]\s+/.test(currentLine)
  const numberList = /^\s*\d+\.\s+/.test(currentLine)
  const taskList = /^\s*[-*]\s*\[[ xX]\]\s+/.test(currentLine)
  const quote = /^\s*>\s?/.test(currentLine)

  // Enclosed check helper
  const isEnclosedBy = (prefix: string, suffix: string) => {
    if (selected && selected.startsWith(prefix) && selected.endsWith(suffix)) {
      return true
    }
    const preLen = prefix.length
    const sufLen = suffix.length
    if (start >= preLen && end + sufLen <= text.length) {
      if (text.slice(start - preLen, start) === prefix && text.slice(end, end + sufLen) === suffix) {
        return true
      }
    }

    // Check within current line
    const relStart = start - lineStart
    const relEnd = end - lineStart
    const beforeText = currentLine.slice(0, relStart)
    const afterText = currentLine.slice(relEnd)

    const lastPrefixIndex = beforeText.lastIndexOf(prefix)
    if (lastPrefixIndex !== -1) {
      // For single asterisk, make sure it's not part of double asterisk
      if (prefix === "*" && (beforeText[lastPrefixIndex - 1] === "*" || beforeText[lastPrefixIndex + 1] === "*")) {
        return false
      }
      const nextSuffixIndex = afterText.indexOf(suffix)
      if (nextSuffixIndex !== -1) {
        if (suffix === "*" && (afterText[nextSuffixIndex - 1] === "*" || afterText[nextSuffixIndex + 1] === "*")) {
          return false
        }
        const textBetweenPrefixAndStart = beforeText.slice(lastPrefixIndex + preLen)
        const textBetweenEndAndSuffix = afterText.slice(0, nextSuffixIndex)
        if (!textBetweenPrefixAndStart.includes(suffix) && !textBetweenEndAndSuffix.includes(prefix)) {
          return true
        }
      }
    }
    return false
  }

  const bold = isEnclosedBy("**", "**") || isEnclosedBy("__", "__")
  const italic = isEnclosedBy("*", "*") || isEnclosedBy("_", "_")
  const underline = isEnclosedBy("<u>", "</u>") || isEnclosedBy("<ins>", "</ins>")
  const strikethrough = isEnclosedBy("~~", "~~")
  const code = isEnclosedBy("`", "`")

  // Check code block
  const codeBlock =
    (selected.startsWith("```") && selected.endsWith("```")) ||
    (text.slice(0, start).split("```").length % 2 === 0)

  return {
    bold,
    italic,
    underline,
    strikethrough,
    code,
    h1,
    h2,
    h3,
    bulletList,
    numberList,
    taskList,
    quote,
    codeBlock,
  }
}
