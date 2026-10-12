import { describe, it, expect } from "vitest"
import {
  toggleInlineFormat,
  toggleUnderline,
  toggleHeading,
  toggleList,
  toggleBlockquote,
  toggleCodeBlock,
  insertLink,
  insertHorizontalRule,
  insertTable,
  clearFormatting,
  indentLines,
  detectActiveFormats,
} from "@/lib/notes/editor-actions"
import { renderInlineMarkdown, MarkdownPreview } from "@/lib/notes/markdown"
import { deriveNoteTitle, getNoteSnippet } from "@/lib/notes/utils"
import * as React from "react"
import { renderToString } from "react-dom/server"

describe("Note Editor Formatting Actions & Strip Features", () => {
  describe("1. Inline Formatting (Bold, Italic, Underline, Strikethrough, Code)", () => {
    it("wraps non-empty selection in bold markers", () => {
      const text = "Hello world!"
      const res = toggleInlineFormat(text, 6, 11, "**", "**")
      expect(res.text).toBe("Hello **world**!")
      expect(res.selection.start).toBe(8)
      expect(res.selection.end).toBe(13)
    })

    it("inserts empty markers and places cursor inside when selection is empty", () => {
      const text = "Hello "
      const res = toggleInlineFormat(text, 6, 6, "**", "**")
      expect(res.text).toBe("Hello ****")
      expect(res.selection.start).toBe(8)
      expect(res.selection.end).toBe(8)
    })

    it("unwraps bold formatting when selection already includes markers", () => {
      const text = "Hello **world**!"
      const res = toggleInlineFormat(text, 6, 15, "**", "**")
      expect(res.text).toBe("Hello world!")
      expect(res.selection.start).toBe(6)
      expect(res.selection.end).toBe(11)
    })

    it("unwraps bold formatting when selection is immediately surrounded by markers", () => {
      const text = "Hello **world**!"
      const res = toggleInlineFormat(text, 8, 13, "**", "**")
      expect(res.text).toBe("Hello world!")
      expect(res.selection.start).toBe(6)
      expect(res.selection.end).toBe(11)
    })

    it("wraps and unwraps underline using <u> tags", () => {
      const text = "Underline this word"
      const wrapped = toggleUnderline(text, 10, 14)
      expect(wrapped.text).toBe("Underline <u>this</u> word")
      expect(wrapped.selection.start).toBe(13)
      expect(wrapped.selection.end).toBe(17)

      // Unwrapping
      const unwrapped = toggleUnderline(wrapped.text, 10, 21)
      expect(unwrapped.text).toBe("Underline this word")
      expect(unwrapped.selection.start).toBe(10)
      expect(unwrapped.selection.end).toBe(14)
    })

    it("toggles italic and strikethrough correctly", () => {
      const text = "Format test"
      const italicRes = toggleInlineFormat(text, 7, 11, "*", "*")
      expect(italicRes.text).toBe("Format *test*")

      const strikeRes = toggleInlineFormat(text, 0, 6, "~~", "~~")
      expect(strikeRes.text).toBe("~~Format~~ test")
    })
  })

  describe("2. Headings (H1, H2, H3)", () => {
    it("adds # heading prefix to current line", () => {
      const text = "First Section\nSecond Section"
      const res = toggleHeading(text, 3, 3, 1)
      expect(res.text).toBe("# First Section\nSecond Section")
    })

    it("switches heading level from H1 to H2", () => {
      const text = "# First Section"
      const res = toggleHeading(text, 5, 5, 2)
      expect(res.text).toBe("## First Section")
    })

    it("toggles heading off when selecting the same heading level", () => {
      const text = "## Subheading"
      const res = toggleHeading(text, 4, 4, 2)
      expect(res.text).toBe("Subheading")
    })
  })

  describe("3. Lists (Bullet, Numbered, Checklist)", () => {
    it("formats selected lines as bullet list", () => {
      const text = "Apples\nBananas\nOranges"
      const res = toggleList(text, 0, text.length, "bullet")
      expect(res.text).toBe("- Apples\n- Bananas\n- Oranges")
    })

    it("formats selected lines as sequential numbered list", () => {
      const text = "Step one\nStep two\nStep three"
      const res = toggleList(text, 0, text.length, "number")
      expect(res.text).toBe("1. Step one\n2. Step two\n3. Step three")
    })

    it("formats selected lines as task checklist", () => {
      const text = "Buy groceries\nPay rent"
      const res = toggleList(text, 0, text.length, "task")
      expect(res.text).toBe("- [ ] Buy groceries\n- [ ] Pay rent")
    })

    it("toggles off bullet list when already bulleted", () => {
      const text = "- Apples\n- Bananas"
      const res = toggleList(text, 0, text.length, "bullet")
      expect(res.text).toBe("Apples\nBananas")
    })
  })

  describe("4. Blockquotes and Code Blocks", () => {
    it("toggles blockquote prefix on lines", () => {
      const text = "Wise words here"
      const res = toggleBlockquote(text, 0, text.length)
      expect(res.text).toBe("> Wise words here")

      const toggledOff = toggleBlockquote(res.text, 0, res.text.length)
      expect(toggledOff.text).toBe("Wise words here")
    })

    it("wraps selection in code block with language specifier", () => {
      const text = "const a = 10;"
      const res = toggleCodeBlock(text, 0, text.length, "ts")
      expect(res.text).toBe("```ts\nconst a = 10;\n```\n")
    })

    it("inserts empty code block when nothing is selected", () => {
      const text = ""
      const res = toggleCodeBlock(text, 0, 0, "json")
      expect(res.text).toBe("```json\n\n```\n")
    })
  })

  describe("5. Inserts (Links, Tables, Dividers)", () => {
    it("inserts a markdown link with text and url", () => {
      const text = "Check out Google today"
      const res = insertLink(text, 10, 16, "https://google.com", "Google")
      expect(res.text).toBe("Check out [Google](https://google.com) today")
    })

    it("inserts horizontal divider rule", () => {
      const text = "Section 1\nSection 2"
      const res = insertHorizontalRule(text, 9, 9)
      expect(res.text).toContain("---")
    })

    it("inserts a structured markdown table", () => {
      const text = ""
      const res = insertTable(text, 0, 0, 2, 3)
      expect(res.text).toContain("| Column 1 | Column 2 | Column 3 |")
      expect(res.text).toContain("| --- | --- | --- |")
      expect(res.text).toContain("| Row 1 Col 1 | Row 1 Col 2 | Row 1 Col 3 |")
    })
  })

  describe("6. Utilities (Clear formatting, Indent / Outdent, Active format detection)", () => {
    it("clears all markdown and HTML tags from selection", () => {
      const text = "## **Bold** and <u>underlined</u> `code` and [link](https://test.com)"
      const res = clearFormatting(text, 0, text.length)
      expect(res.text).toBe("Bold and underlined code and link")
    })

    it("indents lines with 2 spaces and outdents properly", () => {
      const text = "Line 1\nLine 2"
      const indented = indentLines(text, 0, text.length, false)
      expect(indented.text).toBe("  Line 1\n  Line 2")

      const outdented = indentLines(indented.text, 0, indented.text.length, true)
      expect(outdented.text).toBe("Line 1\nLine 2")
    })

    it("detects active formatting at cursor position accurately", () => {
      const text = "## Title\n**Bold text**\n- [ ] Task item"
      const activeHeading = detectActiveFormats(text, 2, 2)
      expect(activeHeading.h2).toBe(true)
      expect(activeHeading.h1).toBe(false)

      const activeBold = detectActiveFormats(text, 11, 15)
      expect(activeBold.bold).toBe(true)

      const activeTask = detectActiveFormats(text, 25, 25)
      expect(activeTask.taskList).toBe(true)
    })
  })

  describe("7. Safe Markdown Preview Rendering", () => {
    it("renders <u>underlined</u> text safely with <u> React tag", () => {
      const elements = renderInlineMarkdown("This is <u>underlined</u> text")
      const html = renderToString(React.createElement("div", null, elements))
      expect(html).toContain("<u class=\"underline underline-offset-3 text-foreground\">underlined</u>")
    })

    it("renders markdown table in MarkdownPreview with proper structure", () => {
      const tableMarkdown = "| Name | Role |\n| --- | --- |\n| Alice | Lead |\n| Bob | Engineer |"
      const html = renderToString(React.createElement(MarkdownPreview, { content: tableMarkdown }))
      expect(html).toContain("<table")
      expect(html).toContain("Alice")
      expect(html).toContain("Engineer")
      expect(html).toContain("<thead")
      expect(html).toContain("<tbody")
    })

    it("cleanly extracts snippet and title without raw HTML tags", () => {
      const content = "<u>My Title</u>\nHere is <u>important</u> information"
      const title = deriveNoteTitle(content)
      expect(title).toBe("My Title")

      const snippet = getNoteSnippet(content)
      expect(snippet).not.toContain("<u>")
      expect(snippet).not.toContain("</u>")
      expect(snippet).toContain("important")
    })
  })
})
