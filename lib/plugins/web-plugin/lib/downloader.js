import os from 'os'
import path from 'path'
import fs from 'fs'
import { exec } from 'child_process'
import net from 'net'
import { Readable } from 'stream'
import { finished } from 'stream/promises'

export async function testNetwork() {
  let googleConnected = false
  let mirrorConnected = false

  try {
    const start = Date.now()
    await fetch('https://storage.googleapis.com', { signal: AbortSignal.timeout(3000) })
    googleConnected = true
    logger.debug(`[WebPlugin] Google connection test succeeded in ${Date.now() - start}ms`)
  } catch (e) {
    logger.debug('[WebPlugin] Google connection test failed or timed out:', e.message)
  }

  try {
    const start = Date.now()
    await fetch('https://cdn.npmmirror.com', { signal: AbortSignal.timeout(3000) })
    mirrorConnected = true
    logger.debug(`[WebPlugin] npmmirror connection test succeeded in ${Date.now() - start}ms`)
  } catch (e) {
    logger.debug('[WebPlugin] npmmirror connection test failed or timed out:', e.message)
  }

  return { googleConnected, mirrorConnected }
}

export function getFreePort(startPort) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.on('error', () => {
      resolve(getFreePort(startPort + 1))
    })
    server.listen(startPort, () => {
      server.close(() => {
        // Resolve with an offset of 100 to avoid immediate TCP TIME_WAIT port conflicts on spawn
        resolve(startPort + 100)
      })
    })
  })
}

export async function downloadFile(url, targetPath) {
  const response = await fetch(url, { signal: AbortSignal.timeout(120000) })
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  const fileStream = fs.createWriteStream(targetPath)
  await finished(Readable.fromWeb(response.body).pipe(fileStream))
}

export async function installObscuraInBackground(pluginInstance) {
  logger.info('[WebPlugin] Checking network connectivity for Obscura background installation...')
  const netStatus = await testNetwork()
  
  if (!netStatus.googleConnected && !netStatus.mirrorConnected) {
    logger.error('[WebPlugin] Network is offline or extremely slow/unreachable. Cannot download Obscura in background.')
    return
  }

  runObscuraInstallation(netStatus, pluginInstance).catch(err => {
    logger.error('[WebPlugin] Background Obscura installation failed:', err.message)
    logger.info('[WebPlugin] Falling back to standard Chromium background download...')
    installChromiumInBackground(pluginInstance)
  })
}

async function runObscuraInstallation(netStatus, pluginInstance) {
  const platform = os.platform()
  const arch = os.arch()
  const home = os.homedir()
  const cacheDir = path.join(home, '.cache/obscura')
  
  let archiveName = ''
  let binaryName = 'obscura'

  if (platform === 'darwin') {
    if (arch === 'arm64') {
      archiveName = 'obscura-aarch64-macos.tar.gz'
    } else {
      archiveName = 'obscura-x86_64-macos.tar.gz'
    }
  } else if (platform === 'linux') {
    archiveName = 'obscura-x86_64-linux.tar.gz'
  } else if (platform === 'win32') {
    archiveName = 'obscura-x86_64-windows.zip'
    binaryName = 'obscura.exe'
  } else {
    throw new Error(`Unsupported platform for Obscura: ${platform}`)
  }

  const officialUrl = `https://github.com/h4ckf0r0day/obscura/releases/latest/download/${archiveName}`
  const mirrorUrl = `https://mirror.ghproxy.com/https://github.com/h4ckf0r0day/obscura/releases/latest/download/${archiveName}`

  logger.info(`[WebPlugin] Preparing background download of Obscura. Destination: ${cacheDir}`)
  fs.mkdirSync(cacheDir, { recursive: true })
  const tempPath = path.join(cacheDir, `temp_${archiveName}`)
  const finalBinaryPath = path.join(cacheDir, binaryName)

  let success = false
  let lastError = null

  // 1. Try official GitHub releases first
  try {
    logger.info(`[WebPlugin] Attempting official Obscura download: ${officialUrl}`)
    await downloadFile(officialUrl, tempPath)
    success = true
  } catch (err) {
    lastError = err
    logger.warn(`[WebPlugin] Official download failed: ${err.message}. Retrying via ghproxy mirror...`)
  }

  // 2. Fallback to mirror if official failed
  if (!success) {
    try {
      logger.info(`[WebPlugin] Attempting mirror Obscura download: ${mirrorUrl}`)
      await downloadFile(mirrorUrl, tempPath)
      success = true
    } catch (err) {
      lastError = err
      logger.error(`[WebPlugin] Mirror download failed: ${err.message}`)
    }
  }

  if (!success) {
    throw new Error(`All download attempts for Obscura failed. Last error: ${lastError?.message}`)
  }

  logger.info(`[WebPlugin] Obscura download completed successfully. Extracting to ${cacheDir}...`)

  await new Promise((resolve, reject) => {
    let command = ''
    if (platform === 'win32') {
      command = `tar -xf "${tempPath}" -C "${cacheDir}"`
    } else {
      command = `tar -xzf "${tempPath}" -C "${cacheDir}"`
    }
    exec(command, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })

  if (platform !== 'win32') {
    fs.chmodSync(finalBinaryPath, '755')
  }

  if (fs.existsSync(tempPath)) {
    fs.unlinkSync(tempPath)
  }

  logger.info(`[WebPlugin] Obscura background installation completed successfully! Executable: ${finalBinaryPath}`)
  pluginInstance.obscuraPath = finalBinaryPath
  
  await pluginInstance.startObscuraService()
}

export async function installChromiumInBackground(pluginInstance) {
  logger.info('[WebPlugin] Checking network connectivity for Chromium background installation...')
  const netStatus = await testNetwork()
  
  if (!netStatus.googleConnected && !netStatus.mirrorConnected) {
    logger.error('[WebPlugin] Network is offline or extremely slow/unreachable. Cannot download Chromium in background.')
    return
  }

  runChromiumInstallation(netStatus).catch(err => {
    logger.error('[WebPlugin] Background Chromium installation failed:', err.message)
  })
}

async function runChromiumInstallation(netStatus) {
  const { install, Browser, detectBrowserPlatform, resolveBuildId } = await import('@puppeteer/browsers')
  const os = await import('os')
  const path = await import('path')

  const platform = detectBrowserPlatform()
  const home = os.homedir()
  const cacheDir = path.join(home, '.cache/puppeteer')

  let buildId = '131.0.6778.204' // Default stable fallback
  let downloadBaseUrl = undefined

  if (netStatus.googleConnected) {
    try {
      buildId = await resolveBuildId(Browser.CHROME, platform, 'stable')
      logger.info(`[WebPlugin] Resolved latest Chrome stable build ID: ${buildId}`)
    } catch (err) {
      logger.warn(`[WebPlugin] Failed to resolve build ID from Google, using stable fallback: ${err.message}`)
      if (netStatus.mirrorConnected) {
        downloadBaseUrl = 'https://cdn.npmmirror.com/binaries/chrome-for-testing'
      }
    }
  } else if (netStatus.mirrorConnected) {
    downloadBaseUrl = 'https://cdn.npmmirror.com/binaries/chrome-for-testing'
    logger.info('[WebPlugin] Google is unreachable/blocked. Using npmmirror to download.')
  }

  logger.info(`[WebPlugin] Starting background installation of Chrome ${buildId} to ${cacheDir}...`)
  const startTime = Date.now()

  const installedBrowser = await install({
    browser: Browser.CHROME,
    buildId,
    cacheDir,
    platform,
    downloadBaseUrl,
  })

  const duration = ((Date.now() - startTime) / 1000).toFixed(1)
  logger.info(`[WebPlugin] Background Chrome installation completed successfully in ${duration}s! Executable: ${installedBrowser.executablePath}`)
}
