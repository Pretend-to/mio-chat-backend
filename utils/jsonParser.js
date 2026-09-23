/**
 * 安全解析 JSON，支持：
 * 1. 标准 JSON 对象 / 数组 / 标量
 * 2. 某些模型（如 Qwen/DeepSeek/GLM/中转站）在并行工具调用时输出的紧密拼接多 JSON：`{...}{...}` 或 `{...}\n{...}`
 * 3. 各种特殊转义与容错解析
 *
 * @param {any} input 待解析的字符串或对象
 * @returns {any} 解析出的对象、对象数组，或兜底原始/空对象
 */
export function parseConcatenatedJson(input) {
  if (typeof input !== 'string') {
    return input || {}
  }

  const trimmed = input.trim()
  if (!trimmed) {
    return {}
  }

  // 1. 尝试直接标准 JSON 解析
  try {
    return JSON.parse(trimmed)
  } catch {
    // 存在紧密拼接或格式微瑕，继续深入流式分词提取
  }

  // Some models terminate a nested tool argument immediately after closing
  // the inner object, leaving only the outer wrapper unclosed. Repair only
  // that narrow case: strings must be complete and every observed closer must
  // match its opener. This keeps large HTML/code payloads as normal JSON and
  // avoids introducing a second string-encoded argument protocol.
  const stack = []
  let repairInString = false
  let repairEscape = false
  let repairable = true
  for (const char of trimmed) {
    if (repairEscape) {
      repairEscape = false
      continue
    }
    if (char === '\\' && repairInString) {
      repairEscape = true
      continue
    }
    if (char === '"') {
      repairInString = !repairInString
      continue
    }
    if (repairInString) continue
    if (char === '{' || char === '[') {
      stack.push(char)
      continue
    }
    if (char === '}' || char === ']') {
      const expected = char === '}' ? '{' : '['
      if (stack.pop() !== expected) {
        repairable = false
        break
      }
    }
  }
  if (repairable && !repairInString && stack.length > 0) {
    const suffix = stack
      .toReversed()
      .map((char) => (char === '{' ? '}' : ']'))
      .join('')
    try {
      return JSON.parse(`${trimmed}${suffix}`)
    } catch {
      // Continue with concatenated-JSON extraction.
    }
  }

  // 2. 流式括号平衡提取所有顶层独立 JSON 对象
  const extracted = []
  let depth = 0
  let inString = false
  let isEscape = false
  let startIndex = -1

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i]

    if (isEscape) {
      isEscape = false
      continue
    }

    if (char === '\\') {
      if (inString) isEscape = true
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (!inString) {
      if (char === '{' || char === '[') {
        if (depth === 0) {
          startIndex = i
        }
        depth++
      } else if (char === '}' || char === ']') {
        depth--
        if (depth === 0 && startIndex !== -1) {
          const chunk = trimmed.substring(startIndex, i + 1)
          try {
            extracted.push(JSON.parse(chunk))
          } catch {
            // ignore malformed chunk
          }
          startIndex = -1
        }
      }
    }
  }

  if (extracted.length === 1) {
    return extracted[0]
  } else if (extracted.length > 1) {
    return extracted
  }

  // 3. Fallback: 尝试使用正则包裹成数组解析
  try {
    const arrayWrapped = `[${trimmed.replace(/}\s*\{/g, '},{')}]`
    return JSON.parse(arrayWrapped)
  } catch {
    // 4. Fallback: 尝试提取最外层第一个可用的 `{...}`
    const firstBrace = trimmed.indexOf('{')
    const lastBrace = trimmed.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(trimmed.substring(firstBrace, lastBrace + 1))
      } catch {}
    }
  }

  return {}
}
