import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

export const ClientID = process.env.GOOGLE_CLIENT_ID || [
  '1071006060591',
  'tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com'
].join('-')
export const ClientSecret = process.env.GOOGLE_CLIENT_SECRET || [
  'GOCSPX',
  'K58FWR486LdLJ1mLB8sXC4z6qDAf'
].join('-')
export const RedirectURI = 'http://localhost:8085/callback'
export const Scopes = [
  'https://www.googleapis.com/auth/cloud-platform',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
].join(' ')

const log = logger

export const SESSIONS_FILE = path.join(process.cwd(), 'tmp', 'oauth_sessions.json')
export const TOKEN_CACHE_FILE = path.join(process.cwd(), 'tmp', 'oauth_token_cache.json')

export const DEFAULT_GEMINI_OAUTH_MODELS = [
  { displayName: 'Gemini 2.5 Flash', id: 'gemini-2.5-flash', owner: 'google' },
  { displayName: 'Gemini 2.5 Flash Image', id: 'gemini-2.5-flash-image', owner: 'google' },
  { displayName: 'Gemini 2.5 Flash Lite', id: 'gemini-2.5-flash-lite', owner: 'google' },
  { displayName: 'Gemini 2.5 Flash Thinking', id: 'gemini-2.5-flash-thinking', owner: 'google' },
  { displayName: 'Gemini 2.5 Pro', id: 'gemini-2.5-pro', owner: 'google' },
  { displayName: 'Gemini 3 Flash', id: 'gemini-3-flash', owner: 'google' },
  { displayName: 'Gemini 3 Pro High', id: 'gemini-3-pro-high', owner: 'google' },
  { displayName: 'Gemini 3 Pro Low', id: 'gemini-3-pro-low', owner: 'google' },
  { displayName: 'Gemini 3 Pro Image', id: 'gemini-3-pro-image', owner: 'google' },
  { displayName: 'Gemini 3.1 Pro High', id: 'gemini-3.1-pro-high', owner: 'google' },
  { displayName: 'Gemini 3.1 Pro Low', id: 'gemini-3.1-pro-low', owner: 'google' },
  { displayName: 'Gemini 3.1 Flash Image', id: 'gemini-3.1-flash-image', owner: 'google' },
]

export class HybridSessionStore {
  constructor() {
    this.store = new Map()
    this.filePath = SESSIONS_FILE
    this.dbKey = 'gemini_oauth_sessions'
  }

  load() {}
  save() {}
  async loadFromDb() {}
  async saveToDb() {}

  get(state) {
    return this.store.get(state)
  }

  set(state, session) {
    this.store.set(state, session)
  }

  delete(state) {
    this.store.delete(state)
  }

  entries() {
    return this.store.entries()
  }
}

export class HybridTokenCache {
  constructor() {
    this.store = new Map()
    this.filePath = TOKEN_CACHE_FILE
    this.dbKey = 'gemini_oauth_token_cache'
    this.load()
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const fileContent = fs.readFileSync(this.filePath, 'utf8')
        if (fileContent.trim()) {
          const data = JSON.parse(fileContent)
          this.store = new Map(Object.entries(data))
        }
      }
    } catch (error) {
      log.warn(`[Gemini OAuth] 加载 oauth_token_cache.json 失败: ${error.message}`)
    }
  }

  save() {
    try {
      const dir = path.dirname(this.filePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      const data = Object.fromEntries(this.store.entries())
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8')
    } catch (error) {
      log.warn(`[Gemini OAuth] 保存 oauth_token_cache.json 失败: ${error.message}`)
    }
  }

  async loadFromDb() {
    try {
      const SystemSettingsService = (await import('../../../../database/services/SystemSettingsService.js')).default
      if (!SystemSettingsService.prisma) {
        await SystemSettingsService.initialize()
      }
      if (SystemSettingsService.prisma) {
        const setting = await SystemSettingsService.get(this.dbKey)
        if (setting && setting.value) {
          const dbData = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value
          for (const [k, v] of Object.entries(dbData)) {
            this.store.set(k, v)
          }
          this.save()
        }
      }
    } catch (error) {
      log.warn(`[Gemini OAuth] 从数据库加载 ${this.dbKey} 失败: ${error.message}`)
    }
  }

  async saveToDb() {
    try {
      const SystemSettingsService = (await import('../../../../database/services/SystemSettingsService.js')).default
      if (!SystemSettingsService.prisma) {
        await SystemSettingsService.initialize()
      }
      if (SystemSettingsService.prisma) {
        const data = Object.fromEntries(this.store.entries())
        await SystemSettingsService.set(this.dbKey, data, 'system', `Gemini OAuth ${this.dbKey}`)
      }
    } catch (error) {
      log.warn(`[Gemini OAuth] 保存 ${this.dbKey} 到数据库失败: ${error.message}`)
    }
  }

  get(code) {
    this.load()
    const cached = this.store.get(code)
    if (!cached) {return null}
    // 数据库缓存 tokens 具有更长的生存期（30天），保证跨重启及重新配置的连贯性
    const ttl = 30 * 24 * 60 * 60 * 1000
    if (Date.now() - cached.createdAt > ttl) {
      this.delete(code)
      return null
    }
    return cached
  }

  set(code, data) {
    this.store.set(code, {
      ...data,
      createdAt: Date.now()
    })
    this.save()
    this.saveToDb().catch(error => {
      log.warn(`[Gemini OAuth] 异步保存 token 失败: ${error.message}`)
    })
  }

  delete(code) {
    this.store.delete(code)
    this.save()
    this.saveToDb().catch(error => {
      log.warn(`[Gemini OAuth] 异步删除 token 失败: ${error.message}`)
    })
  }

  entries() {
    this.load()
    return this.store.entries()
  }
}

export const sessionStore = new HybridSessionStore()
export const tokenCache = new HybridTokenCache()

// Clean up expired sessions (older than 30 minutes) and cached tokens (older than 30 days)
const sessionCleanupInterval = setInterval(() => {
  const now = Date.now()
  const sessionExpireTime = 30 * 60 * 1000
  const tokenExpireTime = 30 * 24 * 60 * 60 * 1000 // 30 days

  // Cleanup sessions
  const keysToDelete = []
  for (const [state, session] of sessionStore.entries()) {
    if (now - session.createdAt > sessionExpireTime) {
      keysToDelete.push(state)
    }
  }
  if (keysToDelete.length > 0) {
    for (const key of keysToDelete) {
      sessionStore.delete(key)
    }
  }

  // Cleanup tokens
  const tokensToDelete = []
  for (const [code, cached] of tokenCache.entries()) {
    if (now - cached.createdAt > tokenExpireTime) {
      tokensToDelete.push(code)
    }
  }
  if (tokensToDelete.length > 0) {
    for (const key of tokensToDelete) {
      tokenCache.delete(key)
    }
  }
}, 5 * 60 * 1000)

if (typeof sessionCleanupInterval.unref === 'function') {
  sessionCleanupInterval.unref()
}

export function base64UrlEncode(buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

export function generateState() {
  return base64UrlEncode(crypto.randomBytes(32))
}

export function encryptState(verifier, createdAt = Date.now()) {
  try {
    const key = crypto.createHash('sha256').update(ClientSecret).digest()
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
    
    const payload = JSON.stringify({ t: createdAt, v: verifier })
    let encrypted = cipher.update(payload, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    const tag = cipher.getAuthTag()
    
    const buffer = Buffer.concat([iv, tag, Buffer.from(encrypted, 'hex')])
    return base64UrlEncode(buffer)
  } catch (error) {
    log.error('[Gemini OAuth] encryptState failed:', error)
    return null
  }
}

export function decryptState(stateStr) {
  try {
    const key = crypto.createHash('sha256').update(ClientSecret).digest()
    const base64Str = stateStr.replace(/-/g, '+').replace(/_/g, '/')
    const buffer = Buffer.from(base64Str, 'base64')
    if (buffer.length < 28) {
      return null
    }
    
    const iv = buffer.subarray(0, 12)
    const tag = buffer.subarray(12, 28)
    const ciphertext = buffer.subarray(28)
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)
    
    let decrypted = decipher.update(ciphertext, 'binary', 'utf8')
    decrypted += decipher.final('utf8')
    
    const parsed = JSON.parse(decrypted)
    if (parsed && parsed.v && parsed.t) {
      if (Date.now() - parsed.t < 15 * 60 * 1000) {
        return parsed.v
      } else {
        log.warn('[Gemini OAuth] Decrypted state has expired')
      }
    }
  } catch (error) {
    log.debug(`[Gemini OAuth] decryptState failed (might be legacy state): ${error.message}`)
  }
  return null
}

export function generateCodeVerifier() {
  return base64UrlEncode(crypto.randomBytes(32))
}

export function generateCodeChallenge(verifier) {
  const hash = crypto.createHash('sha256').update(verifier).digest()
  return base64UrlEncode(hash)
}

export function generateStableSessionID(contents) {
  if (Array.isArray(contents)) {
    for (const content of contents) {
      if (content && content.role === 'user' && Array.isArray(content.parts) && content.parts.length > 0) {
        const {text} = content.parts[0]
        if (text && typeof text === 'string') {
          const hash = crypto.createHash('sha256').update(text).digest()
          const high = hash.readUInt32BE(0)
          const low = hash.readUInt32BE(4)
          const combined = (BigInt(high & 0x7F_FF_FF_FF) * 0x1_00_00_00_00n) + BigInt(low)
          return `-${combined}`
        }
      }
    }
  }
  const randVal = Math.floor(Math.random() * 9_000_000) + 1_000_000
  return `-${randVal}`
}
