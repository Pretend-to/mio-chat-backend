import fs from 'node:fs'
import path from 'node:path'

/**
 * 文件名在磁盘上的「真实名字」—— 规范化 + 容错查找。
 *
 * 背景（2026-09-24 真实事故）：`write` 回执 `File written successfully`，随后同一路径的
 * `ls` / `zip` / `share` 全都找不到这个文件，调用方把锅算在「文件名含全角冒号」上。
 * 事后查证（data/app.db 的 tool_calls 原始参数）：write 与 share 收到的是**同一个字符串**，
 * 名字里根本没有全角冒号 —— 文件是被同一批并行工具调用里的 `rm -rf` 删掉的。
 *
 * 但「同一个路径字符串在两处解析结果不同」本身是真实风险（macOS 的 NFD、Linux 的字节比较、
 * 复制粘贴带来的全/半角冒号），所以这里只做两件保守的事：
 *   1) 写入侧：路径统一到 Unicode NFC 再落盘。**不做字符替换**（不会把 `：` 悄悄改成 `:`）——
 *      替用户改名属于破坏 userspace 的行为；
 *   2) 读取侧：原样命中失败时，在同一目录里按「NFC 等价」或「全/半角冒号等价」找**唯一**候选，
 *      命中就用它，并把真实名字回告调用方；找不到或存在歧义就老实报错，不许猜。
 */

const COLON_RE = /[:：]/g

export function normalizePathName(p) {
  return typeof p === 'string' ? p.normalize('NFC') : p
}

/** 相对路径 → 绝对路径（NFC 规范化），语义与各工具原来的 path.join(cwd, ...) 一致 */
export function toAbsolutePath(filePath, cwd = process.cwd()) {
  const normalized = normalizePathName(filePath)
  return path.isAbsolute(normalized) ? normalized : path.join(cwd, normalized)
}

/** 比较用折叠键：NFC + 冒号半/全角统一（只用于查找，不用于落盘） */
function foldKey(name) {
  return normalizePathName(name).replace(COLON_RE, ':')
}

/**
 * 读回磁盘上的真实名字（文件系统可能对我们的名字做了规范化，例如 HFS+ 回吐 NFD）。
 * @returns {string|null} 目录里真实的名字，找不到返回 null
 */
export function readOnDiskName(absolutePath) {
  const dir = path.dirname(absolutePath)
  const want = path.basename(absolutePath)
  let entries
  try {
    entries = fs.readdirSync(dir)
  } catch {
    return null
  }
  if (entries.includes(want)) {return want}
  const hits = entries.filter((n) => foldKey(n) === foldKey(want))
  return hits.length === 1 ? hits[0] : null
}

/**
 * 容错解析一个「应该存在」的路径：原样 → NFC 等价 → 全/半角冒号等价。
 * 只在唯一命中时才返回候选；有歧义（多个等价名）一律拒绝，交给调用方报错。
 * @returns {{ path: string, actualName: string, reason: 'exact'|'nfc'|'colon' } | null}
 */
export function resolveExistingPath(absolutePath) {
  if (fs.existsSync(absolutePath)) {
    return { actualName: path.basename(absolutePath), path: absolutePath, reason: 'exact' }
  }

  const dir = path.dirname(absolutePath)
  const want = path.basename(absolutePath)
  let entries
  try {
    entries = fs.readdirSync(dir)
  } catch {
    return null
  }

  const wantNfc = normalizePathName(want)
  const wantFold = foldKey(want)
  const candidates = []
  for (const name of entries) {
    if (normalizePathName(name) === wantNfc) {candidates.push({ name, reason: 'nfc' })}
    else if (foldKey(name) === wantFold) {candidates.push({ name, reason: 'colon' })}
  }

  if (candidates.length !== 1) {return null}
  const hit = candidates[0]
  return { actualName: hit.name, path: path.join(dir, hit.name), reason: hit.reason }
}
