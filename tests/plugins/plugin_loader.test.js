import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { pathToFileURL } from 'node:url'

globalThis.logger ||= console
const [{ default: Plugin }, { default: hookManager }] = await Promise.all([
  import('../../lib/plugin.js'),
  import('../../lib/hooks/index.js'),
])

class TestPlugin extends Plugin {
  constructor(root) {
    super({ importMetaUrl: pathToFileURL(path.join(root, 'index.mjs')).href }, { toolsPath: path.join(root, 'tools') })
  }
}

const source = version => `export default class Tool {
  constructor() { this.name = 'recoverable'; this.version = ${version} }
  setPlugin(plugin) { this.plugin = plugin }
}\n`

test('tool loader retries failed files and retains last good tool until replacement succeeds', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mio-tool-loader-'))
  t.after(() => fs.rm(root, { force: true, recursive: true }))
  const toolsPath = path.join(root, 'tools')
  await fs.mkdir(toolsPath)
  const file = path.join(toolsPath, 'recoverable.mjs')
  const plugin = new TestPlugin(root)

  await fs.writeFile(file, 'throw new Error("temporary import failure")\n')
  await plugin.loadTools({ silent: true })
  assert.equal(plugin.tools.has('recoverable'), false)

  await fs.writeFile(file, source(1))
  await plugin.loadTools({ silent: true })
  assert.equal(plugin.tools.get('recoverable')?.version, 1)

  await fs.writeFile(file, 'throw new Error("second temporary failure")\n')
  await plugin.loadTools({ silent: true })
  assert.equal(plugin.tools.get('recoverable')?.version, 1)

  await fs.writeFile(file, source(2))
  await plugin.loadTools({ silent: true })
  assert.equal(plugin.tools.get('recoverable')?.version, 2)

  await fs.writeFile(file, source(3))
  const replacementPlugin = new TestPlugin(root)
  await replacementPlugin.loadTools({ silent: true })
  assert.equal(replacementPlugin.tools.get('recoverable')?.version, 3)

  await fs.rm(file)
  await plugin.loadTools({ silent: true })
  await replacementPlugin.loadTools({ silent: true })
  assert.equal(plugin.tools.has('recoverable'), false)
  assert.equal(replacementPlugin.tools.has('recoverable'), false)
})

test('tool loader logs hook refusal with file and tool name', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mio-tool-loader-'))
  t.after(() => fs.rm(root, { force: true, recursive: true }))
  const toolsPath = path.join(root, 'tools')
  await fs.mkdir(toolsPath)
  await fs.writeFile(path.join(toolsPath, 'recoverable.mjs'), source(1))
  const plugin = new TestPlugin(root)
  const originalExecute = hookManager.execute
  const originalWarn = logger.warn
  const warnings = []
  hookManager.execute = async () => false
  logger.warn = (...args) => warnings.push(args.join(' '))
  t.after(() => {
    hookManager.execute = originalExecute
    logger.warn = originalWarn
  })
  await plugin.loadTools({ silent: true })
  assert.equal(plugin.tools.size, 0)
  assert.match(warnings.join('\n'), /recoverable\.mjs.*recoverable/)
})
