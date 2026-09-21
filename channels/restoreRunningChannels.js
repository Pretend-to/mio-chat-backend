import {
  isNativeIlinkChannel,
  isOneBotsChannel,
} from './ChannelAdapterRegistry.js'
import { isIlinkChannel } from './migrations/migrateOneBotsIlinkToNative.js'

/** Restore channels from the configured authoritative ChannelStore. */
export async function restoreRunningChannels(channelRuntime, logger = console) {
  const allChannels = await channelRuntime.channelStore.listInternal()
  const supports = (channel) => {
    const nativeIlink =
      typeof channelRuntime.isNativeIlinkChannel === 'function'
        ? channelRuntime.isNativeIlinkChannel(channel)
        : isNativeIlinkChannel(channel)
    const onebots =
      typeof channelRuntime.isOneBotsChannel === 'function'
        ? channelRuntime.isOneBotsChannel(channel)
        : isOneBotsChannel(channel)
    return nativeIlink || (onebots && !isIlinkChannel(channel))
  }
  const isBound = (channel) =>
    isNativeIlinkChannel(channel)
      ? Boolean(channel.token && channel.userId)
      : Boolean(channel.userId || channel.botId)
  const toRestore = allChannels.filter(
    (channel) =>
      channel.status === 'running' && supports(channel) && isBound(channel),
  )

  if (toRestore.length > 0) {
    logger.info?.(
      `[ChannelRuntime] 自动恢复 ${toRestore.length} 个运行中渠道...`,
    )
  }
  for (const channel of toRestore) {
    try {
      if (
        typeof channelRuntime.isRunning !== 'function' ||
        !channelRuntime.isRunning(channel.id)
      ) {
        await channelRuntime.start(channel.id)
      }
      logger.info?.(
        `[ChannelRuntime] 渠道 "${channel.name}" (${channel.id}) 已恢复运行`,
      )
    } catch (error) {
      logger.warn?.(
        `[ChannelRuntime] 渠道 "${channel.name}" (${channel.id}) 恢复失败: ${error.message}`,
      )
      await channelRuntime.channelStore.update(channel.id, {
        status: 'stopped',
      })
    }
  }
  return { discovered: allChannels.length, restored: toRestore.length }
}

export default restoreRunningChannels
