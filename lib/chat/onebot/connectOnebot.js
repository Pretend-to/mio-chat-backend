import fs from 'fs'
import config from '../../config.js'

/**
 * OneBot 连接的**唯一入口**。
 *
 * 启动流程（lib/check.js）、设置页「保存配置 / 重新连接」、配置工具改配置，
 * 全部通过 connectOnebot() 发起，避免"只有启动时才会连"这种死角。
 *
 * 这里同时是 OneBot 对外状态的唯一出口：getOnebotState() 把
 * 「发起记录（含被校验拦下的）」与「socket 层实时快照」合并成一份，
 * 供 /api/onebot/status 与设置页展示。
 */
let lastConnectAttempt = null

function readOnebotConfig() {
  const cfg = config.getOnebotConfig() || {}
  const required = ['reverse_ws_url', 'bot_qq', 'admin_qq']
  return { cfg, missing: required.filter((key) => !cfg[key]) }
}

function getUserAgent() {
  try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
    return `${pkg.name}/${pkg.version}`
  } catch {
    return 'Mio-Chat/unknown'
  }
}

export function getLastConnectAttempt() {
  return lastConnectAttempt
}

/**
 * 按当前配置重建 OneBot 连接（幂等：会先关闭旧连接）。
 * @returns {Promise<{at:number, ok:boolean, reason:string|null, source:string}>}
 */
export async function connectOnebot({ source = 'manual' } = {}) {
  const { cfg, missing } = readOnebotConfig()
  const record = (ok, reason) => {
    lastConnectAttempt = { at: Date.now(), ok, reason, source }
    return lastConnectAttempt
  }

  if (!cfg.enable) return record(false, 'OneBot 未启用')
  if (missing.length > 0) {
    return record(false, `配置不完整，缺少 ${missing.join(' / ')}`)
  }
  if (!global.middleware?.startOnebot) {
    return record(false, '中间件尚未初始化')
  }

  try {
    global.middleware.startOnebot({
      botId: cfg.bot_qq,
      masterId: cfg.admin_qq,
      reconnectDelay: cfg.reconnect_delay,
      token: cfg.token,
      url: cfg.reverse_ws_url,
      userAgent: getUserAgent(),
    })
    return record(true, null)
  } catch (error) {
    logger.error('[OneBot] 发起连接失败:', error)
    return record(false, error.message)
  }
}

/** OneBot 对外状态快照（状态接口唯一数据源） */
export function getOnebotState() {
  const { cfg, missing } = readOnebotConfig()
  const instance = global.middleware?.onebot || null
  const live = instance?.getStatus?.() || {}
  const connected = Boolean(instance?.isAvaliable?.())
  const connecting =
    !connected && (live.readyState === 0 || Boolean(live.reconnecting))

  let phase = 'offline'
  if (!cfg.enable) phase = 'disabled'
  else if (connected) phase = 'online'
  else if (connecting) phase = 'connecting'
  else if (missing.length > 0 && !instance) phase = 'incomplete'

  return {
    admin_qq: cfg.admin_qq || '',
    attemptCount: live.attemptCount ?? 0,
    bot_qq: cfg.bot_qq || '',
    checkedAt: Date.now(),
    configMissing: missing,
    configured: missing.length === 0,
    connected,
    connectedAt: live.connectedAt ?? null,
    connecting,
    enable: Boolean(cfg.enable),
    lastConnectAttempt,
    lastError: live.lastError ?? null,
    phase,
    readyState: live.readyState ?? null,
    reconnecting: Boolean(live.reconnecting),
    reverse_ws_url: cfg.reverse_ws_url || '',
  }
}

/**
 * 发起连接并短暂等待结果（给"点一下就要看到结果"的交互用）。
 * 连接是异步的，这里最多等 timeoutMs；超时就把当下状态返回，前端继续轮询。
 */
export async function connectOnebotAndWait({
  source = 'manual',
  timeoutMs = 3000,
} = {}) {
  const attempt = await connectOnebot({ source })
  if (!attempt.ok) return { attempt, state: getOnebotState() }

  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (
      global.middleware?.onebot?.connected ||
      global.middleware?.onebot?.lastError
    ) {
      break
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  return { attempt, state: getOnebotState() }
}

export default connectOnebot
