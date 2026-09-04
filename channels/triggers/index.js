import { getTriggerService } from '../../lib/triggers/index.js'

/**
 * 挂载 Trigger 系统到 ChannelRuntime
 * @param {import('../ChannelRuntime.js').ChannelRuntime} channelRuntime
 */
export function mountTriggersToRuntime(channelRuntime, { start = true } = {}) {
  const triggerService = getTriggerService()
  triggerService.setChannelRuntime(channelRuntime)
  if (start) triggerService.startScheduler()
  return triggerService
}
