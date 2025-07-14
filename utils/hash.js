import crypto from 'crypto'

export function generateHash(input) {
  const hash = crypto.createHash('md5')
  hash.update(input)
  return hash.digest('hex').slice(0, 6)
}
