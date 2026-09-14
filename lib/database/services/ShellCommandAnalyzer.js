import Parser from 'tree-sitter'
import Bash from 'tree-sitter-bash'
import PowerShell from 'tree-sitter-powershell'

// This is deliberately not a general-purpose shell safety analyser. The AST
// only gives us command boundaries and structure; automatic approval is a
// small, auditable inspection-command closure below.
const bashParser = new Parser()
bashParser.setLanguage(Bash)
const powershellParser = new Parser()
powershellParser.setLanguage(PowerShell)

const BASH_COMMANDS = new Set([
  'cat',
  'cd',
  'echo',
  'find',
  'grep',
  'head',
  'ls',
  'pwd',
  'tail',
  'wc',
])
const POWERSHELL_COMMANDS = new Set([
  'format-list',
  'format-table',
  'get-childitem',
  'get-command',
  'get-content',
  'get-date',
  'get-filehash',
  'get-item',
  'get-location',
  'get-process',
  'get-service',
  'measure-object',
  'resolve-path',
  'select-object',
  'select-string',
  'test-path',
])

const BASH_ALLOWED_NODES = new Set([
  'program',
  'list',
  'pipeline',
  'command',
  'command_name',
  'word',
  'raw_string',
  'string',
  'string_content',
  'number',
  'redirected_statement',
  'file_redirect',
  'file_descriptor',
  '"',
  '&&',
  ';',
  '|',
  '>',
])
const POWERSHELL_ALLOWED_NODES = new Set([
  'program',
  'statement_list',
  'empty_statement',
  'pipeline',
  'pipeline_chain',
  'command',
  'command_name',
  'command_elements',
  'command_argument_sep',
  'command_parameter',
  'generic_token',
  'array_literal_expression',
  'unary_expression',
  'integer_literal',
  'decimal_integer_literal',
  ';',
  '|',
  ' ',
])

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/
const EXPANSION_OR_DYNAMIC_NODE =
  /(?:expansion|substitution|assignment|function|compound|subshell|script_block|invoke|member|variable|heredoc|process_substitution|brace_expression|arithmetic|for_|while_|until_|if_|case_|switch_|try_|catch_|throw_|trap_|return_|break_|continue_)/

function walk(node, visitor) {
  visitor(node)
  for (const child of node.children || []) walk(child, visitor)
}

function plainArgument(text) {
  // A quoted argument is fine, but an executable must never be quoted. All
  // shell expansion and control punctuation is rejected even inside quotes.
  const value = String(text || '').trim()
  return (
    Boolean(value) && !/[`$\\]/.test(value) && !CONTROL_CHARACTERS.test(value)
  )
}

function plainPowerShellArgument(text) {
  // Backslash is an ordinary Windows path character in PowerShell (the escape
  // character is the backtick), so it cannot share Bash's argument rule.
  const value = String(text || '').trim()
  return (
    Boolean(value) && !/[`$]/.test(value) && !CONTROL_CHARACTERS.test(value)
  )
}

function isSafePath(value, { allowGlob = false } = {}) {
  if (!plainArgument(value) || value.startsWith('-') || value.includes('..'))
    return false
  if (!allowGlob && /[*?[\]{}]/.test(value)) return false
  return true
}

function commandParts(node, mode) {
  if (mode === 'bash') {
    const name = node.childForFieldName('name')
    return {
      args: (node.namedChildren || [])
        .filter((child) => child !== name)
        .map((child) => child.text.trim()),
      rawName: name?.text?.trim() || '',
    }
  }
  const elements = node.childForFieldName('command_elements')
  return {
    args: (elements?.namedChildren || [])
      .filter((child) => child.type !== 'command_argument_sep')
      .map((child) => child.text.trim()),
    rawName: node.childForFieldName('command_name')?.text?.trim() || '',
  }
}

function safeFindArguments(args) {
  if (args.length < 2) return false
  let index = 0
  while (
    index < args.length &&
    !args[index].startsWith('-') &&
    args[index] !== '!'
  ) {
    if (!isSafePath(args[index])) return false
    index++
  }
  if (index === 0) return false
  while (index < args.length) {
    const token = args[index]
    if (token === '-maxdepth' || token === '-mindepth') {
      if (!/^\d+$/.test(args[++index] || '')) return false
    } else if (
      token === '-name' ||
      token === '-iname' ||
      token === '-path' ||
      token === '-ipath'
    ) {
      if (!isSafePath(args[++index], { allowGlob: true })) return false
    } else if (token === '-type') {
      if (!/^[bcdflpsD]$/.test(args[++index] || '')) return false
    } else if (token === '-not' || token === '!') {
      // These only negate the following predicate in this intentionally tiny grammar.
    } else {
      return false
    }
    index++
  }
  return true
}

function safeGrepArguments(args) {
  if (args.length < 1 || !args.every(plainArgument)) return false
  let index = 0
  while (index < args.length && args[index].startsWith('-')) {
    const option = args[index]
    // GNU/BSD grep's read-only switches used for repository inspection. In
    // particular, do not accept config/program/file-output style long forms.
    if (!/^-([EFGHiILlnrRschvwxo]+)$/.test(option)) return false
    index++
  }
  if (index >= args.length) return false
  // Pattern followed by one or more ordinary repository paths/globs.
  if (!plainArgument(args[index++])) return false
  return (
    index === args.length ||
    args.slice(index).every((arg) => isSafePath(arg, { allowGlob: true }))
  )
}

function safeHeadTailArguments(args) {
  if (args.length === 0 || !args.every(plainArgument)) return false
  let index = 0
  if (/^-\d+$/.test(args[index])) index++
  else if (args[index] === '-n' && /^\d+$/.test(args[index + 1] || ''))
    index += 2
  return (
    index === args.length || args.slice(index).every((arg) => isSafePath(arg))
  )
}

function safeBashCommand(item) {
  if (
    !BASH_COMMANDS.has(item.name) ||
    item.path ||
    !item.args.every(plainArgument)
  )
    return false
  switch (item.name) {
    case 'cd':
      return item.args.length === 1 && isSafePath(item.args[0])
    case 'echo':
      return (
        item.args.length > 0 &&
        item.args.every((arg) => !arg.startsWith('-') && !arg.includes('\\'))
      )
    case 'find':
      return safeFindArguments(item.args)
    case 'grep':
      return safeGrepArguments(item.args)
    case 'head':
    case 'tail':
      return safeHeadTailArguments(item.args)
    case 'cat':
    case 'ls':
      return (
        item.args.length > 0 &&
        item.args.every((arg) => isSafePath(arg, { allowGlob: true }))
      )
    case 'pwd':
      return item.args.length === 0
    case 'wc':
      return (
        item.args.length > 0 &&
        item.args.every((arg) => isSafePath(arg, { allowGlob: true }))
      )
    default:
      return false
  }
}

function safePowerShellCommand(item) {
  // Do not trust aliases, functions, executable paths, or *.exe. The session
  // also starts PowerShell with -NoProfile, so these names resolve only to the
  // built-in read-only cmdlet set on an untouched session.
  if (
    !POWERSHELL_COMMANDS.has(item.name) ||
    item.path ||
    item.rawName.toLowerCase().endsWith('.exe')
  )
    return false
  return item.args.every(
    (arg) => plainPowerShellArgument(arg) && !/[&@{};]/.test(arg),
  )
}

function inspectBashRedirect(node) {
  if (node.type !== 'file_redirect') return false
  const descriptor = node.childForFieldName('descriptor')?.text || ''
  const destination = node.childForFieldName('destination')?.text?.trim() || ''
  // Keep only the exact stderr suppression used by inspection commands. Do
  // not grow this into a general "safe output redirection" exception.
  return (
    descriptor === '2' &&
    destination === '/dev/null' &&
    node.text.replace(/\s/g, '') === '2>/dev/null'
  )
}

function analyzeBash(source) {
  const tree = bashParser.parse(source)
  const commands = []
  let syntaxSafe = !tree.rootNode.hasError
  walk(tree.rootNode, (node) => {
    if (
      !BASH_ALLOWED_NODES.has(node.type) ||
      EXPANSION_OR_DYNAMIC_NODE.test(node.type)
    )
      syntaxSafe = false
    if (node.type === 'file_redirect' && !inspectBashRedirect(node))
      syntaxSafe = false
    if (node.type === 'command') {
      const { rawName, args } = commandParts(node, 'bash')
      const name = rawName.toLowerCase()
      commands.push({
        args,
        name,
        path:
          /[\\/]/.test(rawName) ||
          rawName.startsWith('.') ||
          !/^[a-z][a-z0-9_-]*$/.test(rawName),
        rawName,
      })
    }
  })
  const safe =
    syntaxSafe && commands.length > 0 && commands.every(safeBashCommand)
  return {
    commands,
    compound: commands.length > 1,
    safe,
    syntaxSafe,
    reason: syntaxSafe ? null : 'unsafe-shell-syntax',
  }
}

function analyzePowerShell(source) {
  const tree = powershellParser.parse(source)
  const commands = []
  let syntaxSafe = !tree.rootNode.hasError
  walk(tree.rootNode, (node) => {
    if (
      !POWERSHELL_ALLOWED_NODES.has(node.type) ||
      EXPANSION_OR_DYNAMIC_NODE.test(node.type)
    )
      syntaxSafe = false
    if (node.type === 'command') {
      const { rawName, args } = commandParts(node, 'powershell')
      const name = rawName.toLowerCase()
      commands.push({
        args,
        name,
        path:
          /[\\/]/.test(rawName) ||
          rawName.startsWith('.') ||
          !/^[A-Za-z][A-Za-z0-9-]*$/.test(rawName),
        rawName,
      })
    }
  })
  const safe =
    syntaxSafe && commands.length > 0 && commands.every(safePowerShellCommand)
  return {
    commands,
    compound: commands.length > 1,
    safe,
    syntaxSafe,
    reason: syntaxSafe ? null : 'unsafe-shell-syntax',
  }
}

export function analyzeShellCommand(command, platform = process.platform) {
  const source = String(command || '')
  if (!source.trim())
    return {
      commands: [],
      compound: false,
      reason: 'empty-command',
      safe: false,
      syntaxSafe: false,
    }
  // Reject terminal controls before parsing so cursor movement, escape
  // sequences, pasted input, and line editing cannot change what is analysed.
  if (CONTROL_CHARACTERS.test(source))
    return {
      commands: [],
      compound: false,
      reason: 'unsafe-shell-syntax',
      safe: false,
      syntaxSafe: false,
    }
  try {
    return platform === 'win32'
      ? analyzePowerShell(source.trim())
      : analyzeBash(source.trim())
  } catch {
    return {
      commands: [],
      compound: false,
      reason: 'parse-error',
      safe: false,
      syntaxSafe: false,
    }
  }
}

export function isSafeShellCommand(command, platform = process.platform) {
  return analyzeShellCommand(command, platform).safe
}

export function isCompoundShellCommand(command, platform = process.platform) {
  return analyzeShellCommand(command, platform).compound
}
