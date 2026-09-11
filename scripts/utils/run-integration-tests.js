#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { discoverTestRuntime } from './test-runtime.js'

function runNode(script, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], {
      env: { ...process.env, ...env },
      stdio: 'inherit',
    })
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code === 0) resolve()
      else reject(new Error(`${script} exited with ${signal || code}`))
    })
  })
}

async function main() {
  const runtime = await discoverTestRuntime()
  if (!runtime.baseUrl) {
    const checked = runtime.candidates.length ? runtime.candidates.join(', ') : 'no local listeners found'
    throw new Error(
      `No running MioChat HTTP service was discovered (${checked}). Start it on any port or set BASE_URL explicitly.`,
    )
  }
  if (!runtime.adminCode) {
    throw new Error('No admin credential was discovered. Set ADMIN_CODE or initialize the local database.')
  }

  console.log(`Integration target discovered: ${runtime.baseUrl}`)
  console.log(`Admin credential discovered: ${runtime.adminCode.slice(0, 4)}…`)
  const env = { ADMIN_CODE: runtime.adminCode, BASE_URL: runtime.baseUrl }

  await runNode('tests/integration/quick-test-onebot-api.js', env)
  await runNode('tests/integration/test-onebot-api.js', env)
  await runNode('tests/integration/test-onebot-config.js', env)
}

main().catch(error => {
  console.error(`Integration test runner failed: ${error.message}`)
  process.exitCode = 1
})
