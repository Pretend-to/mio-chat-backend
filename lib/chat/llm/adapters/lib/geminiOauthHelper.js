import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import logger from '../../../../../utils/logger.js'

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
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/cclog',
  'https://www.googleapis.com/auth/experimentsandconfigs'
].join(' ')

const log = logger

export const SESSIONS_FILE = path.join(process.cwd(), 'tmp', 'oauth_sessions.json')
export const TOKEN_CACHE_FILE = path.join(process.cwd(), 'tmp', 'oauth_token_cache.json')

export const DEFAULT_GEMINI_OAUTH_MODELS = [
  { id: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash', owner: 'google' },
  { id: 'gemini-2.5-flash-image', displayName: 'Gemini 2.5 Flash Image', owner: 'google' },
  { id: 'gemini-2.5-flash-lite', displayName: 'Gemini 2.5 Flash Lite', owner: 'google' },
  { id: 'gemini-2.5-flash-thinking', displayName: 'Gemini 2.5 Flash Thinking', owner: 'google' },
  { id: 'gemini-2.5-pro', displayName: 'Gemini 2.5 Pro', owner: 'google' },
  { id: 'gemini-3-flash', displayName: 'Gemini 3 Flash', owner: 'google' },
  { id: 'gemini-3-pro-high', displayName: 'Gemini 3 Pro High', owner: 'google' },
  { id: 'gemini-3-pro-low', displayName: 'Gemini 3 Pro Low', owner: 'google' },
  { id: 'gemini-3-pro-image', displayName: 'Gemini 3 Pro Image', owner: 'google' },
  { id: 'gemini-3.1-pro-high', displayName: 'Gemini 3.1 Pro High', owner: 'google' },
  { id: 'gemini-3.1-pro-low', displayName: 'Gemini 3.1 Pro Low', owner: 'google' },
  { id: 'gemini-3.1-flash-image', displayName: 'Gemini 3.1 Flash Image', owner: 'google' },
]

export class HybridSessionStore {
  constructor() {
    this.store = new Map()
    this.filePath = SESSIONS_FILE
    this.dbKey = 'gemini_oauth_sessions'
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
    } catch (err) {
      log.warn(`[Gemini OAuth] 加载 oauth_sessions.json 失败: ${err.message}`)
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
    } catch (err) {
      log.warn(`[Gemini OAuth] 保存 oauth_sessions.json 失败: ${err.message}`)
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
    } catch (err) {
      log.warn(`[Gemini OAuth] 从数据库加载 ${this.dbKey} 失败: ${err.message}`)
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
    } catch (err) {
      log.warn(`[Gemini OAuth] 保存 ${this.dbKey} 到数据库失败: ${err.message}`)
    }
  }

  get(state) {
    this.load()
    return this.store.get(state)
  }

  set(state, session) {
    this.store.set(state, session)
    this.save()
    this.saveToDb().catch(err => {
      log.warn(`[Gemini OAuth] 异步保存 session 失败: ${err.message}`)
    })
  }

  delete(state) {
    this.store.delete(state)
    this.save()
    this.saveToDb().catch(err => {
      log.warn(`[Gemini OAuth] 异步删除 session 失败: ${err.message}`)
    })
  }

  entries() {
    this.load()
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
    } catch (err) {
      log.warn(`[Gemini OAuth] 加载 oauth_token_cache.json 失败: ${err.message}`)
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
    } catch (err) {
      log.warn(`[Gemini OAuth] 保存 oauth_token_cache.json 失败: ${err.message}`)
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
    } catch (err) {
      log.warn(`[Gemini OAuth] 从数据库加载 ${this.dbKey} 失败: ${err.message}`)
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
    } catch (err) {
      log.warn(`[Gemini OAuth] 保存 ${this.dbKey} 到数据库失败: ${err.message}`)
    }
  }

  get(code) {
    this.load()
    const cached = this.store.get(code)
    if (!cached) return null
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
    this.saveToDb().catch(err => {
      log.warn(`[Gemini OAuth] 异步保存 token 失败: ${err.message}`)
    })
  }

  delete(code) {
    this.store.delete(code)
    this.save()
    this.saveToDb().catch(err => {
      log.warn(`[Gemini OAuth] 异步删除 token 失败: ${err.message}`)
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
        const text = content.parts[0].text
        if (text && typeof text === 'string') {
          const hash = crypto.createHash('sha256').update(text).digest()
          const high = hash.readUInt32BE(0)
          const low = hash.readUInt32BE(4)
          const combined = (BigInt(high & 0x7FFFFFFF) * 0x100000000n) + BigInt(low)
          return `-${combined}`
        }
      }
    }
  }
  const randVal = Math.floor(Math.random() * 9000000) + 1000000
  return `-${randVal}`
}
