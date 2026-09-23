export function hasPendingInteraction(event, interactionId) {
  if (!event || !interactionId) return false
  const interactions = [event._interactions, event.interactions].find(
    (candidate) => candidate && typeof candidate.has === 'function',
  )
  return Boolean(interactions?.has(interactionId))
}

export function filterReplayChunks(chunks, event) {
  return (Array.isArray(chunks) ? chunks : []).filter((chunk) => {
    if (chunk?.type !== 'action') return true
    return hasPendingInteraction(event, chunk.content?.interactionId)
  })
}

export function buildReplayMetadata(metaData = {}) {
  return {
    ...metaData,
    triggerType: metaData.triggerType || (metaData.isTask ? 'task' : 'chat'),
  }
}

export default {
  buildReplayMetadata,
  filterReplayChunks,
  hasPendingInteraction,
}
