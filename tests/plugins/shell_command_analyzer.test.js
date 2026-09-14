import { test } from 'node:test'
import assert from 'node:assert/strict'

import { analyzeShellCommand } from '../../lib/database/services/ShellCommandAnalyzer.js'
import { ShellPolicyService } from '../../lib/database/services/ShellPolicyService.js'

test('Bash AST allows a read-only compound inspection command', () => {
  const command =
    'cd /www && grep -rn "user_prompt|userPrompt|<user|user_input" channels/*.js 2>/dev/null | head -10; echo "===web前端==="; find public -maxdepth 2 -name "*.js" 2>/dev/null | head -5; grep -rn "xml|XML" channels/llm.js 2>/dev/null | head -5'
  const result = analyzeShellCommand(command, 'linux')

  assert.equal(result.syntaxSafe, true)
  assert.equal(result.compound, true)
  assert.equal(result.safe, true)
  assert.deepEqual(
    result.commands.map((item) => item.name),
    ['cd', 'grep', 'head', 'echo', 'find', 'head', 'grep', 'head'],
  )
})

test('Bash AST permits quoted operators but rejects controls, expansion, and writes', () => {
  assert.equal(analyzeShellCommand("grep 'a|b< c' file", 'darwin').safe, true)

  const substitution = analyzeShellCommand(
    'grep foo $(rm -rf /tmp/x)',
    'darwin',
  )
  assert.equal(substitution.syntaxSafe, false)
  assert.equal(substitution.safe, false)

  const outputFile = analyzeShellCommand('grep foo > /tmp/out', 'darwin')
  assert.equal(outputFile.syntaxSafe, false)
  assert.equal(outputFile.safe, false)

  const background = analyzeShellCommand('echo foo &', 'darwin')
  assert.equal(background.syntaxSafe, false)
  assert.equal(background.safe, false)

  for (const command of [
    'MODE=prod grep foo file',
    'grep foo > /dev/null',
    'grep foo \u001b[2Jfile',
  ]) {
    assert.equal(analyzeShellCommand(command, 'darwin').safe, false, command)
  }
})

test('Bash AST applies its small parameter closure to each pipeline command', () => {
  assert.equal(analyzeShellCommand('grep foo | head -10', 'linux').safe, true)
  assert.equal(
    analyzeShellCommand('find . -maxdepth 2 -name "*.js" | head -10', 'linux')
      .safe,
    true,
  )
  assert.equal(analyzeShellCommand('rg --files', 'linux').safe, false)
  assert.equal(analyzeShellCommand('sed -i x file', 'linux').safe, false)
  assert.equal(analyzeShellCommand('sort -o out file', 'linux').safe, false)
  assert.equal(analyzeShellCommand('git status', 'linux').safe, false)
  assert.equal(
    analyzeShellCommand('git status && git commit -am x', 'linux').safe,
    false,
  )
  assert.equal(
    analyzeShellCommand('find . -exec echo {} \\;', 'linux').safe,
    false,
  )
})

test('PowerShell AST allows canonical read-only cmdlet pipelines only', () => {
  const command = 'Get-Content x | Select-Object -First 10'
  const result = analyzeShellCommand(command, 'win32')

  assert.equal(result.syntaxSafe, true)
  assert.equal(result.compound, true)
  assert.equal(result.safe, true)
  assert.deepEqual(
    result.commands.map((item) => item.name),
    ['get-content', 'select-object'],
  )
  assert.equal(
    analyzeShellCommand('Get-ChildItem | Select-String foo', 'win32').safe,
    true,
  )
  assert.equal(
    analyzeShellCommand('Get-Content C:\\work\\file.txt', 'win32').safe,
    true,
  )
  assert.equal(analyzeShellCommand('git.exe status', 'win32').safe, false)
})

test('PowerShell AST rejects output files, expansion, variables, script blocks, and aliases', () => {
  for (const command of [
    'Get-Content x > out.txt',
    'Get-Content $(Remove-Item x)',
    'Get-Content "$env:PATH"',
    'Get-ChildItem | ForEach-Object { Remove-Item $_ }',
    'cat x',
    'Get-Content x 2>$null',
  ]) {
    const result = analyzeShellCommand(command, 'win32')
    assert.equal(result.safe, false, command)
  }
})

test('ShellPolicyService auto-allows a safe compound command after deny rules', async () => {
  const service = new ShellPolicyService()
  service._seeded = true
  service.prisma = {
    shellAutoApproveRule: {
      findMany: async () => [],
    },
  }

  const result = await service.evaluate('cd /tmp && grep foo file | head -10')
  assert.equal(result.verdict, 'allow')
  assert.equal(result.reason, 'safe-readonly-command')
  assert.equal(result.compound, true)
  assert.equal(result.safeShell, true)

  const actualQuery =
    'cd /www && grep -rn "user_prompt|userPrompt|<user|user_input" channels/*.js 2>/dev/null | head -10; echo "===web前端==="; find public -maxdepth 2 -name "*.js" 2>/dev/null | head -5; grep -rn "xml|XML" channels/llm.js 2>/dev/null | head -5'
  assert.equal(
    (await service.evaluate(actualQuery)).reason,
    'safe-readonly-command',
  )
  assert.equal(
    (await service.evaluate(actualQuery, null, { allowSafeReadonly: false }))
      .verdict,
    'unknown',
  )
})

test('ShellPolicyService keeps high-risk fallbacks for databases seeded before Windows rules', async () => {
  const service = new ShellPolicyService()
  service._seeded = true
  service.prisma = {
    shellAutoApproveRule: {
      findMany: async () => [],
    },
  }

  const result = await service.evaluate('Invoke-WebRequest https://example.com')
  assert.equal(result.verdict, 'block')
  assert.equal(result.reason, 'deny-rule-hit')
  assert.equal(result.rule.rememberable, true)
  assert.equal(
    (await service.evaluate('curl.exe https://example.com')).verdict,
    'block',
  )
  assert.equal(service.isForceApprovalCommand('Remove-Item C:\\tmp\\x'), true)
  assert.equal(
    service.isForceApprovalCommand('cmd.exe /c del C:\\tmp\\x'),
    true,
  )
  assert.equal(service.isForceApprovalCommand('Set-Location C:\\tmp'), false)
  assert.equal(
    service._cwdInScope('C:\\Work\\repo\\src', 'C:\\Work\\repo'),
    true,
  )
  assert.equal(
    service._cwdInScope('C:\\Work\\repo\\..\\outside', 'C:\\Work\\repo'),
    false,
  )
})
