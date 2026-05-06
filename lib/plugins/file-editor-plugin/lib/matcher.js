/**
 * 4-level layered text matching engine
 *
 * Levels:
 *   1 — Exact match (indexOf)         → 0 tolerance
 *   2 — Trimmed line match            → handles indentation / trailing ws
 *   3 — Whitespace-normalized match   → collapses all ws runs
 *   4 — Fuzzy match (Dice ≥ 0.6)     → handles minor typos / diffs
 *
 * Each level returns { index, matchedText, method } or null.
 */

// ----------------------------------------------------------------
//  Public API
// ----------------------------------------------------------------

/**
 * Find target text within lines using layered matching.
 * @param {string[]} lines — file content split by '\n'
 * @param {string}   target — the text block to find
 * @returns {{ index: number, matchedText: string, method: string } | null}
 */
export function findTarget(lines, target) {
  const targetLines = target.split('\n')
  const content = lines.join('\n')

  // Level 1 — Exact
  const l1 = _exactMatch(content, target)
  if (l1) return l1

  // Level 2 — Trimmed
  const l2 = _trimmedMatch(lines, targetLines)
  if (l2) return l2

  // Level 3 — Whitespace-normalized
  const l3 = _wsNormalizedMatch(lines, targetLines)
  if (l3) return l3

  // Level 4 — Fuzzy
  const l4 = _fuzzyMatch(lines, targetLines)
  if (l4) return l4

  return null
}

/**
 * Find all match info for error reporting.
 * Returns { bestScore, bestStart, bestLines } for the closest block.
 */
export function findClosestBlock(lines, targetLines) {
  if (targetLines.length > lines.length || targetLines.length === 0) {
    return { bestScore: -1, bestStart: -1, worstLineIdx: -1, worstFileLine: '', worstTargetLine: '' }
  }

  let bestScore = -1
  let bestStart = -1
  let worstLineIdx = -1
  let worstFileLine = ''
  let worstTargetLine = ''

  for (let i = 0; i <= lines.length - targetLines.length; i++) {
    let totalSim = 0
    let minLineSim = Infinity
    let minLineIdx = -1
    for (let j = 0; j < targetLines.length; j++) {
      const sim = lineSimilarity(lines[i + j], targetLines[j])
      totalSim += sim
      if (sim < minLineSim) {
        minLineSim = sim
        minLineIdx = j
      }
    }
    const avgSim = totalSim / targetLines.length
    if (avgSim > bestScore) {
      bestScore = avgSim
      bestStart = i
      worstLineIdx = minLineIdx
      worstFileLine = lines[i + minLineIdx] || ''
      worstTargetLine = targetLines[minLineIdx] || ''
    }
  }

  return { bestScore, bestStart, worstLineIdx, worstFileLine, worstTargetLine }
}

/**
 * Dice coefficient on character bigrams (0.0 – 1.0)
 */
export function lineSimilarity(a, b) {
  if (a === b) return 1.0
  if (a.length === 0 || b.length === 0) return 0.0
  const aStr = a.toLowerCase()
  const bStr = b.toLowerCase()
  const bigrams = new Set()
  for (let i = 0; i < aStr.length - 1; i++) {
    bigrams.add(aStr.substring(i, i + 2))
  }
  let intersection = 0
  for (let i = 0; i < bStr.length - 1; i++) {
    if (bigrams.has(bStr.substring(i, i + 2))) intersection++
  }
  return (2.0 * intersection) / (aStr.length + bStr.length)
}

// ----------------------------------------------------------------
//  Internal: Level implementations
// ----------------------------------------------------------------

function _exactMatch(content, target) {
  const idx = content.indexOf(target)
  if (idx === -1) return null

  const lastIdx = content.lastIndexOf(target)
  if (idx !== lastIdx) {
    // Multiple matches — not safe, let caller decide
    return null
  }

  return { index: idx, matchedText: target, method: 'exact' }
}

function _trimmedMatch(lines, targetLines) {
  if (targetLines.length > lines.length) return null

  const trimmedLines = lines.map((l) => l.trim())
  const trimmedTarget = targetLines.map((l) => l.trim())

  for (let i = 0; i <= trimmedLines.length - trimmedTarget.length; i++) {
    let match = true
    for (let j = 0; j < trimmedTarget.length; j++) {
      if (trimmedLines[i + j] !== trimmedTarget[j]) {
        match = false
        break
      }
    }
    if (!match) continue

    const matchedText = lines.slice(i, i + targetLines.length).join('\n')
    return { index: _findPosition(lines.join('\n'), matchedText), matchedText, method: 'trimmed' }
  }
  return null
}

function _wsNormalizedMatch(lines, targetLines) {
  if (targetLines.length > lines.length) return null

  const normalize = (s) => s.replace(/\s+/g, ' ').trim()
  const normLines = lines.map(normalize)
  const normTarget = targetLines.map(normalize)

  for (let i = 0; i <= normLines.length - normTarget.length; i++) {
    let match = true
    for (let j = 0; j < normTarget.length; j++) {
      if (normLines[i + j] !== normTarget[j]) {
        match = false
        break
      }
    }
    if (!match) continue

    const matchedText = lines.slice(i, i + targetLines.length).join('\n')
    return { index: _findPosition(lines.join('\n'), matchedText), matchedText, method: 'ws-normalized' }
  }
  return null
}

function _fuzzyMatch(lines, targetLines) {
  if (targetLines.length > lines.length || targetLines.length === 0) return null

  let bestScore = -1
  let bestStart = -1

  for (let i = 0; i <= lines.length - targetLines.length; i++) {
    let totalSim = 0
    for (let j = 0; j < targetLines.length; j++) {
      totalSim += lineSimilarity(lines[i + j], targetLines[j])
    }
    const avgSim = totalSim / targetLines.length
    if (avgSim > bestScore) {
      bestScore = avgSim
      bestStart = i
    }
  }

  if (bestScore >= 0.6 && bestStart >= 0) {
    const matchedText = lines.slice(bestStart, bestStart + targetLines.length).join('\n')
    return {
      index: _findPosition(lines.join('\n'), matchedText),
      matchedText,
      method: `fuzzy(${(bestScore * 100).toFixed(0)}%)`,
    }
  }
  return null
}

/**
 * Safety check: verify the matched text appears exactly once in content.
 * Returns the index, or -1 if not found / ambiguous.
 */
function _findPosition(content, matchedText) {
  const idx = content.indexOf(matchedText)
  if (idx !== -1) {
    const lastIdx = content.lastIndexOf(matchedText)
    if (idx === lastIdx) return idx
  }
  return -1
}
