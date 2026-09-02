import Parser from 'tree-sitter'
import Bash from 'tree-sitter-bash'
import PowerShell from 'tree-sitter-powershell'

const bashParser = new Parser()
bashParser.setLanguage(Bash)

const powershellParser = new Parser()
powershellParser.setLanguage(PowerShell)

/**
 * Commands whose normal operation is read-only (or only changes the current
 * shell's working directory/output).  This is deliberately a positive list:
 * an unknown executable must still require approval.
 */
const SAFE_BASH_COMMANDS = new Set([
  '[', 'basename', 'cat', 'cd', 'cut', 'date', 'df', 'dir', 'dirname', 'du',
  'echo', 'false', 'fd', 'file', 'find', 'grep', 'head', 'hostname', 'id',
  'git', 'lsof', 'ls', 'more', 'printf', 'ps', 'pwd', 'readlink', 'realpath', 'rg',
  'sed', 'sort', 'stat', 'tail', 'test', 'tr', 'true', 'type', 'uname',
  'uniq', 'uptime', 'wc', 'which', 'whereis', 'whoami',
])

const SAFE_POWERSHELL_COMMANDS = new Set([
  '[', 'basename', 'cat', 'cd', 'chdir', 'clear-host', 'convertto-json',
  'dir', 'echo', 'fc', 'find', 'findstr', 'format-list', 'format-table',
  'get-alias', 'get-childitem', 'get-command', 'get-content', 'get-date',
  'get-filehash', 'get-history', 'get-item', 'get-itemproperty', 'get-location',
  'get-member', 'get-process', 'get-service', 'get-variable', 'git', 'grep',
  'head', 'hostname', 'ls', 'measure-object', 'more', 'out-default', 'out-host',
  'out-null', 'out-string', 'pop-location', 'printf', 'pwd', 'readlink', 'realpath',
  'resolve-path', 'rg', 'select-object', 'select-string', 'set-location',
  'sort-object', 'sort', 'stat', 'tail', 'test-path', 'type', 'uniq', 'uname',
  'where', 'where-object', 'whoami', 'write-host', 'write-output', 'wc',
])

const SAFE_GIT_SUBCOMMANDS = new Set([
  'branch', 'describe', 'diff', 'log', 'ls-files', 'ls-tree', 'remote',
  'rev-parse', 'show', 'status', 'version',
])

const FIND_WRITE_OPERATORS = new Set([
  '-delete', '-exec', '-execdir', '-fprint', '-fprint0', '-fprintf', '-fls',
  '-ok', '-okdir',
])

const BASH_FORBIDDEN_NODES = new Set([
  'arithmetic_expansion', 'brace_expression', 'case_statement', 'command_substitution',
  'compound_statement', 'do_group', 'for_statement', 'function_definition',
  'heredoc_body', 'heredoc_redirect', 'if_statement', 'negated_command',
  'process_substitution', 'subshell', 'unset_statement',
  'while_statement', 'until_statement',
])

const POWERSHELL_FORBIDDEN_NODES = new Set([
  'array_expression', 'assignment_statement', 'break_statement', 'call_operator',
  'catch_clause', 'command_invokation_operator', 'continue_statement',
  'do_statement', 'for_statement', 'foreach_statement', 'function_definition',
  'if_statement', 'invoke_member', 'member_access', 'parenthesized_expression',
  'return_statement', 'script_block', 'script_block_expression', 'sub_expression',
  'switch_statement', 'throw_statement', 'trap_statement', 'try_statement',
  'variable', 'while_statement',
])

const BASH_REDIRECT_OPERATORS = new Set(['>', '>>', '<', '>&', '&>'])

function walk(node, visitor) {
  visitor(node)
  for (const child of node.children || []) walk(child, visitor)
}

function normalizeCommandName(text, mode = 'bash') {
  const value = String(text || '').trim()
  if (!value) return { name: '', path: false }
  const quoted = (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  const unquoted = quoted ? value.slice(1, -1) : value
  const lower = unquoted.toLowerCase()
  return {
    name: mode === 'powershell' && lower.endsWith('.exe') ? lower.slice(0, -4) : lower,
    path: /[\\/]/.test(unquoted) || unquoted.startsWith('.') || /^[A-Za-z]:/.test(unquoted),
  }
}

function commandArguments(node, mode) {
  if (mode === 'bash') {
    const name = node.childForFieldName('name')
    return (node.namedChildren || [])
      .filter(child => child !== name && !child.type.endsWith('_redirect'))
      .map(child => child.text.trim())
      .filter(Boolean)
  }

  const elements = node.childForFieldName('command_elements')
  return (elements?.namedChildren || [])
    .filter(child => child.type !== 'command_argument_sep')
    .map(child => child.text.trim())
    .filter(Boolean)
}

function safeGitArguments(args) {
  if (args.some(arg => ['-c', '--config-env', '--exec-path'].includes(arg))) return false
  if (args.some(arg => /^-o$|^--output(?:=|$)/i.test(arg))) return false
  const subcommand = args.find(arg => !arg.startsWith('-'))?.replace(/^['"]|['"]$/g, '').toLowerCase()
  return SAFE_GIT_SUBCOMMANDS.has(subcommand)
}

function safeCommand(name, args, mode, source) {
  const safeCommands = mode === 'powershell' ? SAFE_POWERSHELL_COMMANDS : SAFE_BASH_COMMANDS
  if (!safeCommands.has(name)) return false
  if (name === 'git') return safeGitArguments(args)

  const lowered = args.map(arg => arg.toLowerCase())
  if (name === 'find' && lowered.some(arg => FIND_WRITE_OPERATORS.has(arg))) return false
  if (name === 'sed' && lowered.some(arg => arg === '-i' || arg === '--in-place' || /^-i[^-]/.test(arg))) return false
  if (name === 'sort' && lowered.some(arg => arg === '-o' || arg === '--output' || arg.startsWith('--output='))) return false

  // PowerShell aliases can point at arbitrary functions.  These names are the
  // read-only subset we explicitly trust; reject script-like argument forms
  // even if the command name itself is on the list.
  if (mode === 'powershell' && /(?:^|\s)(?:-Command|-EncodedCommand)\b/i.test(source)) return false
  return true
}

function inspectBashRedirect(node) {
  if (node.type !== 'file_redirect') return false
  const operator = node.children.find(child => !child.isNamed && BASH_REDIRECT_OPERATORS.has(child.type))?.type
  const descriptor = node.childForFieldName('descriptor')?.text || ''
  const destinationNode = node.childForFieldName('destination')
  const destination = destinationNode?.text?.trim() || ''
  if (!operator || !destination) return false
  if (destinationNode?.namedChildren?.length) return false

  const descriptorAllowed = !descriptor || descriptor === '1' || descriptor === '2'
  if (operator === '<') return (!descriptor || descriptor === '0') && destination === '/dev/null'
  if (operator === '>&') return descriptorAllowed && (destination === '1' || destination === '2')
  if (operator === '>' || operator === '>>' || operator === '&>') {
    return descriptorAllowed && destination === '/dev/null'
  }
  return false
}

function inspectPowerShellRedirect(node) {
  const text = node.text.trim()
  if (node.type === 'redirection') {
    if (/^(?:[12]\s*)?>\s*\$null$/i.test(text)) return true
    if (/^(?:[12]\s*)?>>\s*\$null$/i.test(text)) return true
    if (/^(?:[12]\s*)?>&\s*[12]$/i.test(text)) return true
    if (/^<\s*\$null$/i.test(text)) return true
    return false
  }
  // The grammar keeps compact forms such as 2>$null as generic_token nodes.
  if (node.type === 'generic_token' && /[<>]/.test(text)) {
    return /^(?:[12]\s*)?>\s*\$null$/i.test(text) ||
      /^(?:[12]\s*)?>&\s*[12]$/i.test(text)
  }
  return true
}

function analyzeBash(command) {
  const tree = bashParser.parse(command)
  const root = tree.rootNode
  const commands = []
  let syntaxSafe = !root.hasError

  walk(root, node => {
    if (node.type === 'command') {
      const nameNode = node.childForFieldName('name')
      const normalized = normalizeCommandName(nameNode?.text, 'bash')
      commands.push({
        args: commandArguments(node, 'bash'),
        name: normalized.name,
        path: normalized.path,
        source: node.text,
      })
    }
    if (BASH_FORBIDDEN_NODES.has(node.type) || node.type === '&' || node.type === '!') {
      syntaxSafe = false
    }
    if (node.type === 'file_redirect' && !inspectBashRedirect(node)) syntaxSafe = false
    if (node.type === 'herestring_redirect') syntaxSafe = false
  })

  const compound = commands.length > 1
  const safe = syntaxSafe && commands.length > 0 && commands.every(item =>
    !item.path && safeCommand(item.name, item.args, 'bash', item.source))
  return { commands, compound, safe, syntaxSafe, reason: syntaxSafe ? null : 'unsafe-shell-syntax' }
}

function analyzePowerShell(command) {
  const tree = powershellParser.parse(command)
  const root = tree.rootNode
  const commands = []
  let syntaxSafe = !root.hasError

  walk(root, node => {
    if (node.type === 'command') {
      const nameNode = node.childForFieldName('command_name')
      const normalized = normalizeCommandName(nameNode?.text, 'powershell')
      commands.push({
        args: commandArguments(node, 'powershell'),
        name: normalized.name,
        path: normalized.path,
        source: node.text,
      })
    }
    if (POWERSHELL_FORBIDDEN_NODES.has(node.type)) {
      // `$null` is the only variable accepted by the redirect policy; it is
      // a constant sink, not user/environment-controlled data.
      if (node.type !== 'variable' || node.text.toLowerCase() !== '$null') syntaxSafe = false
    }
    if (node.type === 'generic_token' && !inspectPowerShellRedirect(node)) syntaxSafe = false
    if (node.type === 'redirection' && !inspectPowerShellRedirect(node)) syntaxSafe = false
  })

  const compound = commands.length > 1
  const safe = syntaxSafe && commands.length > 0 && commands.every(item =>
    !item.path && safeCommand(item.name, item.args, 'powershell', item.source))
  return { commands, compound, safe, syntaxSafe, reason: syntaxSafe ? null : 'unsafe-shell-syntax' }
}

export function analyzeShellCommand(command, platform = process.platform) {
  const source = String(command || '').trim()
  if (!source) return { commands: [], compound: false, reason: 'empty-command', safe: false, syntaxSafe: false }
  return platform === 'win32' ? analyzePowerShell(source) : analyzeBash(source)
}

export function isSafeShellCommand(command, platform = process.platform) {
  return analyzeShellCommand(command, platform).safe
}

export function isCompoundShellCommand(command, platform = process.platform) {
  return analyzeShellCommand(command, platform).compound
}
