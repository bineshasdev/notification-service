import Handlebars from 'handlebars'

// Register helpers
Handlebars.registerHelper('upper', (str: string) => str?.toUpperCase())
Handlebars.registerHelper('lower', (str: string) => str?.toLowerCase())
Handlebars.registerHelper('date', (date: string) =>
  date ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '',
)

const templateCache = new Map<string, HandlebarsTemplateDelegate>()

export function renderTemplate(templateStr: string, variables: Record<string, unknown> = {}): string {
  let compiled = templateCache.get(templateStr)
  if (!compiled) {
    compiled = Handlebars.compile(templateStr, { noEscape: false })
    templateCache.set(templateStr, compiled)
  }
  return compiled(variables)
}

export function extractVariables(templateStr: string): string[] {
  const ast = Handlebars.parse(templateStr)
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
