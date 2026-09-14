#!/usr/bin/env node

import prismaManager from '../lib/database/prisma.js'
import { LegacyMigrationService } from '../lib/chat/persistence/index.js'

function argumentValue(args, name) {
  const exact = args.find(arg => arg.startsWith(`${name}=`))
  if (exact) return exact.slice(name.length + 1)
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : null
}
function printInventory(inventory) {
  console.log(JSON.stringify({
    agentIds: inventory.agentDirs,
    blocked: inventory.blocked.map(file => ({
      error: file.error,
      path: file.relativePath,
    })),
    manifestHash: inventory.manifestHash,
    summary: inventory.summary,
  }, null, 2))
}

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const verifyOnly = args.includes('--verify')
const rootDir = argumentValue(args, '--root') || process.cwd()
const expectedManifest = argumentValue(args, '--manifest')

await prismaManager.initialize()
const service = new LegacyMigrationService({
  encryptionKey: process.env.MIOCHAT_ENC_KEY,
  prisma: prismaManager.getClient(),
  rootDir,
})

try {
  const inventory = await service.inventory()
  printInventory(inventory)

  if (inventory.blocked.length > 0) {
    process.exitCode = 2
  } else if (verifyOnly) {
    const verification = await service.verify({ inventory })
    console.log(JSON.stringify({ verification }, null, 2))
  } else if (apply) {
    if (!expectedManifest || expectedManifest !== inventory.manifestHash) {
      throw new Error(
        'Refusing to apply: pass the exact dry-run hash with --manifest <hash>',
      )
    }
    const result = await service.migrate()
    console.log(JSON.stringify({
      applied: true,
      verification: result.verification,
    }, null, 2))
  } else {
    console.log('Dry run only. No database records or legacy files were changed.')
  }
} finally {
  await prismaManager.disconnect()
}
