import Handlebars from 'handlebars'
import mjml2html from 'mjml'
import { logger } from './logger'

// ── Handlebars helpers ────────────────────────────────────────────────────────

Handlebars.registerHelper('upper', (str: string) => str?.toUpperCase())
Handlebars.registerHelper('lower', (str: string) => str?.toLowerCase())
Handlebars.registerHelper('date',  (date: string) =>
  date ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '',
)

const hbsCache  = new Map<string, HandlebarsTemplateDelegate>()
const mjmlCache = new Map<string, string>()

// ── MJML → HTML ───────────────────────────────────────────────────────────────

/**
 * Compile MJML source to responsive HTML.
 * Results are cached by source string — safe because MJML output is deterministic.
 * Handlebars `{{variables}}` in the source pass through unchanged.
 */
export function compileMjml(mjmlSource: string): string {
  const cached = mjmlCache.get(mjmlSource)
  if (cached) return cached

  const { html, errors } = mjml2html(mjmlSource, {
    minify:            false,
    validationLevel:   'soft',  // warn but still compile on non-fatal errors
    beautify:          false,
  })

  if (errors.length > 0) {
    errors.forEach((e: { formattedMessage: string }) => logger.warn('[MJML]', { message: e.formattedMessage }))
  }

  mjmlCache.set(mjmlSource, html)
  return html
}

// ── Handlebars rendering ──────────────────────────────────────────────────────

/**
 * Render a Handlebars template string with the given variables.
 */
export function renderTemplate(templateStr: string, variables: Record<string, unknown> = {}): string {
  let compiled = hbsCache.get(templateStr)
  if (!compiled) {
    compiled = Handlebars.compile(templateStr, { noEscape: false })
    hbsCache.set(templateStr, compiled)
  }
  return compiled(variables)
}

/**
 * Compile MJML → HTML, then render Handlebars variables.
 * Use this when the template source is MJML.
 */
export function renderMjmlTemplate(mjmlSource: string, variables: Record<string, unknown> = {}): string {
  const html = compileMjml(mjmlSource)
  return renderTemplate(html, variables)
}

// ── Variable extraction ───────────────────────────────────────────────────────

export function extractVariables(templateStr: string): string[] {
  const ast  = Handlebars.parse(templateStr)
  const vars: string[] = []

  function traverse(node: hbs.AST.Node) {
    if (node.type === 'MustacheStatement') {
      const mustache = node as hbs.AST.MustacheStatement
      if (mustache.path.type === 'PathExpression') {
        vars.push((mustache.path as hbs.AST.PathExpression).original)
      }
    }
    if ('body' in node && Array.isArray((node as any).body)) {
      (node as any).body.forEach(traverse)
    }
  }

  ast.body.forEach(traverse)
  return [...new Set(vars)]
}
