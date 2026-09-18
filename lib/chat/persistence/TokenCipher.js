import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const ALGORITHM = 'aes-256-gcm'
const FORMAT_VERSION = 'v1'
const IV_BYTES = 12
const KEY_BYTES = 32

function decodeBase64Strict(value) {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) {
    return null
  }
  const decoded = Buffer.from(value, 'base64')
  return decoded.toString('base64') === value ? decoded : null
}
/**
 * Parse MIOCHAT_ENC_KEY without silently treating a low-entropy passphrase as
 * an encryption key. Supported forms are 64 hex characters or canonical
 * base64 encoding of exactly 32 bytes.
 */
export function parseEncryptionKey(value = process.env.MIOCHAT_ENC_KEY) {
  const raw = String(value || '').trim()
  if (!raw) {
    throw new Error('MIOCHAT_ENC_KEY is required to migrate bound Channel credentials')
  }

  let key = null
  if (/^[a-fA-F0-9]{64}$/.test(raw)) {
    key = Buffer.from(raw, 'hex')
  } else {
    key = decodeBase64Strict(raw)
  }

  if (!key || key.length !== KEY_BYTES) {
    throw new Error('MIOCHAT_ENC_KEY must be exactly 32 bytes encoded as 64 hex characters or canonical base64')
  }
  return key
}

export function encryptToken(plainText, keyInput) {
  if (plainText === null || plainText === undefined || plainText === '') return null
  const key = Buffer.isBuffer(keyInput) ? keyInput : parseEncryptionKey(keyInput)
  if (key.length !== KEY_BYTES) throw new Error('Invalid encryption key length')

  const iv = crypto.randomBytes(IV_BYTES)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return [
    FORMAT_VERSION,
    iv.toString('base64'),
    tag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':')
}

export function decryptToken(encoded, keyInput) {
  if (encoded === null || encoded === undefined || encoded === '') return ''
  const key = Buffer.isBuffer(keyInput) ? keyInput : parseEncryptionKey(keyInput)
  const parts = String(encoded).split(':')
  if (parts.length !== 4 || parts[0] !== FORMAT_VERSION) {
    throw new Error('Unsupported encrypted token format')
  }

  const iv = decodeBase64Strict(parts[1])
  const tag = decodeBase64Strict(parts[2])
  const encrypted = decodeBase64Strict(parts[3])
  if (!iv || iv.length !== IV_BYTES || !tag || !encrypted) {
    throw new Error('Malformed encrypted token')
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

async function writePrivateFile(filePath, content) {
  await fs.promises.mkdir(path.dirname(filePath), { mode: 0o700, recursive: true })
  try {
    await fs.promises.writeFile(filePath, content, { flag: 'wx', mode: 0o600 })
  } catch (error) {
    if (error.code !== 'EEXIST') throw error
  }
  await fs.promises.chmod(filePath, 0o600)
}

export async function ensureEncryptionKey({ allowGenerate = true, keyPath } = {}) {
  keyPath ||= path.join(process.cwd(), 'data/channel-storage.key')
  const legacyKeyPath = path.join(process.cwd(), 'prisma/data/channel-storage.key')
  if (!fs.existsSync(keyPath) && fs.existsSync(legacyKeyPath)) {
    try {
      await fs.promises.mkdir(path.dirname(keyPath), { recursive: true })
      await fs.promises.rename(legacyKeyPath, keyPath)
    } catch {}
  }
  const configured = process.env.MIOCHAT_ENC_KEY?.trim() || null
  let stored = null
  try {
    stored = (await fs.promises.readFile(keyPath, 'utf8')).trim()
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }

  if (configured) parseEncryptionKey(configured)
  if (stored) parseEncryptionKey(stored)
  if (configured && stored && !crypto.timingSafeEqual(parseEncryptionKey(configured), parseEncryptionKey(stored))) {
    throw new Error(`MIOCHAT_ENC_KEY does not match the persisted instance key at ${keyPath}`)
  }

  let selected = configured || stored
  if (!selected && !allowGenerate) {
    throw new Error(`No instance key exists at ${keyPath} and MIOCHAT_ENC_KEY is unset.`)
  }
  selected ||= crypto.randomBytes(32).toString('hex')
  if (!stored) await writePrivateFile(keyPath, `${parseEncryptionKey(selected).toString('hex')}\n`)
  process.env.MIOCHAT_ENC_KEY = selected
  return selected
}
