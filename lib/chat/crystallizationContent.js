/**
 * 将一次回复内的累计式结晶流合并为单个 UI 事件。
 *
 * 压缩模型会依次发出 `<`、`<long`、`<long_term>...` 这样的累计快照；
 * 它们是同一个事件的状态更新，不是多条独立回复。事件保留首次出现的
 * 位置，并使用最后一次更新的状态和摘要。
 */
export function coalesceCrystallizeEvents(content) {
  if (!Array.isArray(content) || content.length < 2) return content || []

  const result = []
  let crystallizeIndex = -1

  for (const block of content) {
    if (block?.type !== 'crystallize_event') {
      result.push(block)
      continue
    }

    if (crystallizeIndex === -1) {
      crystallizeIndex = result.length
      result.push(block)
      continue
    }

    const previous = result[crystallizeIndex]
    result[crystallizeIndex] = {
      ...previous,
      ...block,
      data: {
        ...previous?.data,
        ...block?.data,
      },
      type: 'crystallize_event',
    }
  }

  return result
}

export default { coalesceCrystallizeEvents }
