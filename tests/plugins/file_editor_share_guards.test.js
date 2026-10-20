/**
 * file-editor / share 三处真实缺陷的回归测试（2026-09-24 事故）：
 *
 *  ① replace/batch 模糊匹配「部分应用 + 回报成功」，把 app.js 改出语法错误；
 *  ② write 回执成功但文件没落盘；
 *  ③ share 解析不到 write 刚写的同一路径。
 *
 * 复现素材直接取自 data/app.db 的 tool_calls 原始参数：
 *   - app.js 那次 replace 的 target 是**一行**（多行块被转义成了字面量 `\n`），replacement 是 24 行；
 *     回执 `Block replaced successfully (fuzzy(100%))` + lint 里的 SyntaxError；
 *   - write / share 收到的是**同一个路径字符串**（名字是半角 `-`，没有全角冒号），
 *     文件真的不在磁盘上。
 */
import { after, test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import '../adapters/mock-env.js'

import Replace from '../../lib/plugins/file-editor-plugin/tools/replace.js'
import Read from '../../lib/plugins/file-editor-plugin/tools/read.js'
import Write from '../../lib/plugins/file-editor-plugin/tools/write.js'
import Share from '../../lib/plugins/ai-plugin/tools/share.js'
import storageService from '../../lib/storage/StorageService.js'

const created = []

function tmpDir(prefix = 'mio-file-editor-test-') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix))
  created.push(dir)
  return dir
}

after(() => {
  for (const dir of created) {
    fs.rmSync(dir, { force: true, recursive: true })
  }
})

const replaceTool = new Replace()
const readTool = new Read()
const writeTool = new Write()
const shareTool = new Share()

// app.js 事故里那块代码的真实形状（缩进 6 空格，多行）
const INCIDENT_BLOCK = [
  '      try {',
  '        const sessionTurnService = new SessionTurnService({ channelRuntime })',
  '        const dispatcher = getChatEventDispatcher()',
  '        const resumed = await dispatcher.resumePending()',
  '      } catch (e) {',
  "        logger.error('[SessionWork] 恢复持久 Session 工作失败:', e.message)",
  '        throw e',
  '      }',
].join('\n')

test('replace: 换行被转义成字面量 \\n 的 target 必须拒绝，且不碰文件', async () => {
  const dir = tmpDir()
  const file = path.join(dir, 'app.js')
  // 文件里同时存在：真多行块 + 一份「转义成一行」的近似副本（旧实现在这里会模糊命中并吃掉一行）
  const escapedCopy = INCIDENT_BLOCK.replace(/\n/g, '\\n').replace('throw e', 'throw err')
  fs.writeFileSync(
    file,
    `function init() {\n${INCIDENT_BLOCK}\n}\n// legacy\n${escapedCopy}\n`,
    'utf8',
  )
  const before = fs.readFileSync(file, 'utf8')

  const res = await replaceTool.func({
    params: {
      filePath: file,
      replacement: ['      try {', '        return 1', '      } catch (e) {', '        throw e', '      }'].join('\n'),
      // 调用方把换行转义了：整块变成一行，正是事故现场
      target: INCIDENT_BLOCK.replace(/\n/g, '\\n'),
    },
  })

  assert.notEqual(res.success, true)
  assert.match(res.error, /NO real newlines/)
  assert.match(res.error, /startLine\/endLine/)
  assert.equal(fs.readFileSync(file, 'utf8'), before, '拒绝应用时文件必须保持原样')
})

test('replace: 同样的改动用真换行发送 → 正常应用（match 字段回告匹配方式）', async () => {
  const dir = tmpDir()
  const file = path.join(dir, 'app.js')
  const src = `function init() {\n${INCIDENT_BLOCK}\n}\ninit()\n`
  fs.writeFileSync(file, src, 'utf8')

  const replacement = [
    '      try {',
    '        const sessionTurnService = new SessionTurnService({ channelRuntime })',
    '        const dispatcher = getChatEventDispatcher()',
    '        stopSessionWorkRunner = dispatcher.registerWakeRunner((workItem) => {',
    '          sessionTurnService.runWorkItem(workItem)',
    '        })',
    '      } catch (e) {',
    "        logger.error('[SessionWork] 安装失败:', e.message)",
    '        throw e',
    '      }',
  ].join('\n')

  const res = await replaceTool.func({ params: { filePath: file, replacement, target: INCIDENT_BLOCK } })

  assert.equal(res.success, true)
  assert.equal(res.match, 'exact')
  assert.equal(res.warning, undefined)
  assert.equal(fs.readFileSync(file, 'utf8'), `function init() {\n${replacement}\n}\ninit()\n`)
})

test('replace: 模糊匹配必须在回执里显式降级告警，不能混成 fuzzy(100%) 的“成功”', async () => {
  const dir = tmpDir()
  const file = path.join(dir, 'fuzzy.js')
  const head = 'const a = 1\nconst b = 2\n'
  const tail = 'const keep = 9\n'
  fs.writeFileSync(file, `${head}const gamma = 3\nconst delta = 4\n${tail}`, 'utf8')

  const res = await replaceTool.func({
    params: {
      filePath: file,
      replacement: 'const gamma = 33\nconst delta = 4',
      // 第三行差一点点 → 只能降级到模糊匹配
      target: 'const gamma = 33x\nconst delta = 4',
    },
  })

  assert.equal(res.success, true)
  assert.equal(res.match, 'fuzzy')
  assert.ok(res.similarity > 0.5 && res.similarity < 1, `similarity=${res.similarity}`)
  assert.match(res.warning, /模糊匹配/)
  assert.match(res.message, /FUZZY \(non-exact\)/)
  assert.doesNotMatch(res.message, /fuzzy\(/, '不得把 fuzzy(100%) 这种伪精确度混进成功信息')
  assert.match(fs.readFileSync(file, 'utf8'), /const gamma = 33\n/)
})

test('replace: 模糊匹配会打到“相似但不是它”的块 → 残留自检必须拒绝写入', async () => {
  const dir = tmpDir()
  const file = path.join(dir, 'dup.js')
  // 两个相似块：copy A 更接近 target（模糊匹配会打到它），调用方真正想改的 copy B 留在原地
  fs.writeFileSync(
    file,
    [
      '// copy A',
      'const b = 2',
      'const c = 3',
      'const d = 04',
      '',
      '// copy B (调用方想改的)',
      'const b = 2',
      'const c = 3',
      'const e = 99',
      '',
    ].join('\n'),
    'utf8',
  )
  const before = fs.readFileSync(file, 'utf8')

  const res = await replaceTool.func({
    params: {
      filePath: file,
      replacement: 'const b = 22\nconst c = 33\nconst d = 44',
      target: 'const b = 2\nconst c = 3\nconst d = 4',
    },
  })

  assert.notEqual(res.success, true)
  assert.match(res.error, /部分应用|残留/)
  assert.match(res.error, /startLine\/endLine/)
  assert.equal(res.match, 'fuzzy')
  assert.equal(fs.readFileSync(file, 'utf8'), before, '拒绝应用时文件必须保持原样')
})

test('replace: 多行块只命中了某一行的一部分（前缀命中）→ 拒绝，不许吃掉半行', async () => {
  const dir = tmpDir()
  const file = path.join(dir, 'prefix.js')
  const before = 'const b = 2\nconst c = 3\nconst d = 400\n'
  fs.writeFileSync(file, before, 'utf8')

  const res = await replaceTool.func({
    params: {
      filePath: file,
      replacement: 'const b = 2\nconst c = 3\nconst d = 4',
      // target 是文件里更长文本的前缀 → indexOf 会在行中间命中
      target: 'const b = 2\nconst c = 3\nconst d = 4',
    },
  })

  assert.notEqual(res.success, true)
  assert.match(res.error, /NOT on line boundaries/)
  assert.match(res.error, /startLine\/endLine/)
  assert.equal(fs.readFileSync(file, 'utf8'), before, '拒绝应用时文件必须保持原样')
})

test('write: 文件名含全角冒号 → 落盘校验通过并回告实际落盘名', async () => {
  const dir = tmpDir()
  const name = '00-导读：阅读顺序与结论.md'
  const file = path.join(dir, name)

  const res = await writeTool.func({ params: { content: '# 导读\n', filePath: file } })

  assert.equal(res.success, true)
  assert.equal(res.size, Buffer.byteLength('# 导读\n'))
  assert.ok(res.mtime)
  assert.equal(res.resolvedPath, file)
  assert.equal(res.onDiskName.normalize('NFC'), name.normalize('NFC'))
  assert.match(res.message, /verified on disk/)
  assert.equal(fs.readFileSync(file, 'utf8'), '# 导读\n')
})

test('write: 写盘静默失败（文件没落盘）必须报错，而不是回执成功', async () => {
  const dir = tmpDir()
  const file = path.join(dir, 'ghost.md')
  const original = fs.writeFileSync
  fs.writeFileSync = () => {} // 模拟“没报错但什么也没写”
  try {
    const res = await writeTool.func({ params: { content: 'x', filePath: file } })
    assert.notEqual(res.success, true)
    assert.match(res.error, /NOT verified on disk/)
  } finally {
    fs.writeFileSync = original
  }
  assert.equal(fs.existsSync(file), false)
})

test('replace: 行号模式（Mode 1）不受自检影响', async () => {
  const dir = tmpDir()
  const file = path.join(dir, 'range.js')
  fs.writeFileSync(file, 'const a = 1\nconst b = 2\nconst c = 3\n', 'utf8')

  const res = await replaceTool.func({
    params: { endLine: 2, filePath: file, replacement: 'const b = 22', startLine: 2 },
  })

  assert.equal(res.success, true)
  assert.equal(fs.readFileSync(file, 'utf8'), 'const a = 1\nconst b = 22\nconst c = 3\n')
})

test('read: 半角冒号路径也能读到全角冒号的文件', async () => {
  const dir = tmpDir()
  const name = '00-导读：阅读顺序与结论.md'
  fs.writeFileSync(path.join(dir, name), '# 导读\n', 'utf8')

  const res = await readTool.func({ params: { filePath: path.join(dir, '00-导读:阅读顺序与结论.md') } })

  assert.match(JSON.stringify(res), /导读/)
})

test('share: 文件真的不在时，报错要带上父目录文件名（区分“名字不对”和“文件没了”）', async () => {
  const dir = tmpDir()
  fs.writeFileSync(path.join(dir, 'present.md'), 'ok', 'utf8')

  let uploadCalls = 0
  const originalUpload = storageService.upload
  storageService.upload = async () => {
    uploadCalls++
    return { url: '/f/up/file/x.md' }
  }
  try {
    const res = await shareTool.handleFileShare({ params: { filePath: path.join(dir, 'nope：x.md') } })

    assert.equal(res.success, false)
    assert.match(res.error, /文件不存在或无法访问/)
    assert.deepEqual(res.dirEntries, ['present.md'])
    assert.equal(uploadCalls, 0, '找不到文件时不得上传')
  } finally {
    storageService.upload = originalUpload
  }
})

test('share: 半角冒号 vs 磁盘上的全角冒号 → 唯一等价命中，按真实文件上传并回告', async () => {
  const dir = tmpDir()
  const actualName = '00-导读：阅读顺序与结论.md'
  fs.writeFileSync(path.join(dir, actualName), '# 导读\n', 'utf8')

  const uploads = []
  const originalUpload = storageService.upload
  storageService.upload = async (data, fileName, type) => {
    uploads.push({ fileName, size: data.length, type })
    return { url: '/f/up/document/x.md' }
  }
  try {
    const res = await shareTool.handleFileShare({
      params: { filePath: path.join(dir, '00-导读:阅读顺序与结论.md') },
    })

    assert.equal(res.result.success, true)
    assert.equal(res.result.resolvedFileName, actualName)
    assert.match(res.result.warning, /冒号等价/)
    assert.equal(res.result.fileSize, Buffer.byteLength('# 导读\n'))
    assert.equal(uploads.length, 1)
    assert.equal(uploads[0].fileName, actualName)
  } finally {
    storageService.upload = originalUpload
  }
})
