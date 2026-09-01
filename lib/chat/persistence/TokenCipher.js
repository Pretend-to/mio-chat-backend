import crypto from 'node:crypto'

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
