import fs from 'node:fs'
import path from 'node:path'

const NATIVE_METADATA = Object.freeze({
  adapterId: 'weixin-ilink',
  driver: 'native',
  platform: 'weixin-ilink',
  protocol: 'weixin.ilink',
  type: 'weixin-ilink',
})

function normalized(value) {
  return String(value || '').trim().toLowerCase()
}

export function isIlinkChannel(channel = {}) {
  const values = [
    channel.type,
    channel.adapterId,
    channel.platform,
  ].map(normalized)
  return values.some(value => [
    'wechat',
    'wechat-clawbot',
    'weixin-ilink',
  ].includes(value))
}

export function nativeIlinkMetadata() {
  return { ...NATIVE_METADATA }
}

export function oneBotsSessionPath(channelId, cwd = process.cwd()) {
  return path.join(
    cwd,
    'data',
    'wechat-clawbot',
    `${encodeURIComponent(channelId)}.json`,
  )
}

export async function readOneBotsIlinkSession(channelId, {
  cwd = process.cwd(),
} = {}) {
  const file = oneBotsSessionPath(channelId, cwd)
  try {
    const value = JSON.parse(await fs.promises.readFile(file, 'utf8'))
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    return {
      accountId: typeof value.accountId === 'string' ? value.accountId : '',
      contextTokens:
        value.contextTokens && typeof value.contextTokens === 'object' &&
        !Array.isArray(value.contextTokens)
          ? value.contextTokens
          : {},
      token: typeof value.token === 'string' ? value.token : '',
      userId: typeof value.userId === 'string' ? value.userId : '',
    }
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    throw new Error(`无法读取 OneBots iLink 会话 ${file}: ${error.message}`, {
      cause: error,
    })
  }
}

function migrationPatch(channel, session) {
  const patch = {}
  for (const [key, value] of Object.entries(NATIVE_METADATA)) {
    if (channel[key] !== value) patch[key] = value
  }
  if (!channel.token && session?.token) patch.token = session.token
  if (!channel.botId && session?.accountId) patch.botId = session.accountId
  const botId = patch.botId || channel.botId || session?.accountId || ''
  const validUserId = value => Boolean(value) &&
    !String(value).endsWith('@im.bot') && String(value) !== String(botId)
  if (!validUserId(channel.userId)) {
    patch.userId = validUserId(session?.userId) ? session.userId : ''
  }

  const token = patch.token || channel.token
  const userId = Object.hasOwn(patch, 'userId') ? patch.userId : channel.userId
  if (channel.status === 'running' && (!token || !userId)) {
    patch.status = 'stopped'
  }
  return patch
}

/**
 * 将历史微信记录和 OneBots wechat-clawbot 实例切换到 MioChat 原生 iLink。
 *
 * 迁移只回填 ChannelStore，不删除 OneBots 会话文件，因而可审计、可回退；
 * 对 JSON、shadow 与 database 持久化模式均通过 ChannelStore 的公开接口生效。
 */
export async function migrateOneBotsIlinkToNative({
  channelStore,
  createMemory = null,
  cwd = process.cwd(),
  logger = console,
} = {}) {
  if (!channelStore?.listInternal || !channelStore?.update) {
    throw new TypeError('iLink migration requires a ChannelStore')
  }

  const channels = await channelStore.listInternal()
  const result = {
    examined: channels.length,
    failed: 0,
    migrated: 0,
    recoveredCredentials: 0,
  }
  for (const channel of channels) {
    if (!isIlinkChannel(channel)) continue
    try {
      let session = null
      try {
        session = await readOneBotsIlinkSession(channel.id, { cwd })
      } catch (error) {
        logger.warn?.(
          `[ChannelMigration] OneBots 会话不可读，将仅使用 ChannelStore 凭据: ${error.message}`,
        )
      }
      const patch = migrationPatch(channel, session)
      if (Object.keys(patch).length > 0) {
        await channelStore.update(channel.id, patch)
        result.migrated += 1
        if (patch.token || patch.botId || patch.userId) {
          result.recoveredCredentials += 1
        }
      }

      const userId = Object.hasOwn(patch, 'userId') ? patch.userId : channel.userId
      const latestContextToken = userId && session?.contextTokens?.[userId]
      if (latestContextToken && typeof createMemory === 'function') {
        const memory = await createMemory(channel.agentId || 'wechat-master')
        const current = await memory.getAgentMeta('latestContextToken', null)
        if (!current) await memory.setAgentMeta('latestContextToken', latestContextToken)
      }
    } catch (error) {
      result.failed += 1
      logger.error?.(
        `[ChannelMigration] iLink 实例 "${channel.id}" 迁移失败: ${error.message}`,
      )
    }
  }

  if (result.migrated > 0) {
    logger.info?.(
      `[ChannelMigration] 已将 ${result.migrated} 个微信 iLink 实例切换到原生适配器` +
      `（恢复凭据 ${result.recoveredCredentials} 个，失败 ${result.failed} 个）`,
    )
  }
  return result
}

export default migrateOneBotsIlinkToNative
