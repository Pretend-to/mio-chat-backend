import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

/**
 * Sniffs common executable paths for Chrome, Chromium, and Microsoft Edge.
 * Returns the first valid path found, or null if none exist.
 */
export function findBrowserPath() {
    const platform = process.platform

    if (platform === 'darwin') {
        const macOSPaths = [
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
            '/Applications/Chromium.app/Contents/MacOS/Chromium',
            path.join(process.env.HOME || '', 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
            path.join(process.env.HOME || '', 'Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'),
            path.join(process.env.HOME || '', 'Applications/Chromium.app/Contents/MacOS/Chromium')
        ]
        for (const p of macOSPaths) {
            if (fs.existsSync(p)) {
                return p
            }
        }
    } else if (platform === 'win32') {
        const programFiles = process.env.PROGRAMFILES || 'C:\\Program Files'
        const programFilesX86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)'
        const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || 'C:\\Users\\Default', 'AppData\\Local')

        const winPaths = [
            path.join(programFiles, 'Google\\Chrome\\Application\\chrome.exe'),
            path.join(programFilesX86, 'Google\\Chrome\\Application\\chrome.exe'),
            path.join(localAppData, 'Google\\Chrome\\Application\\chrome.exe'),
            path.join(programFiles, 'Microsoft\\Edge\\Application\\msedge.exe'),
            path.join(programFilesX86, 'Microsoft\\Edge\\Application\\msedge.exe'),
            path.join(programFiles, 'Chromium\\Application\\chrome.exe'),
            path.join(programFilesX86, 'Chromium\\Application\\chrome.exe'),
            path.join(localAppData, 'Chromium\\Application\\chrome.exe')
        ]
        for (const p of winPaths) {
            if (fs.existsSync(p)) {
                return p
            }
        }
    } else {
        // Linux and other Unix-like systems
        const linuxBinaries = [
            'google-chrome-stable',
            'google-chrome',
            'chromium-browser',
            'chromium',
            'microsoft-edge-stable',
            'microsoft-edge'
        ]

        // 1. Try to find the binary using "which"
        for (const binary of linuxBinaries) {
            try {
                const stdout = execSync(`which ${binary}`, { stdio: ['ignore', 'pipe', 'ignore'] })
                const resolvedPath = stdout.toString().trim()
                if (resolvedPath && fs.existsSync(resolvedPath)) {
                    return resolvedPath
                }
            } catch (e) {
                // Ignore errors from which if command fails or binary is not found
            }
        }

        // 2. Fallback to common absolute paths
        const linuxPaths = [
            '/usr/bin/google-chrome-stable',
            '/usr/bin/google-chrome',
            '/usr/bin/chromium-browser',
            '/usr/bin/chromium',
            '/usr/bin/microsoft-edge-stable',
            '/usr/bin/microsoft-edge',
            '/usr/bin/snap/bin/chromium'
        ]
        for (const p of linuxPaths) {
            if (fs.existsSync(p)) {
                return p
            }
        }
    }

    // 3. Fallback: Search in Puppeteer cache directories
    const cachePath = findInCacheDirs()
    if (cachePath) {
        return cachePath
    }

    return null
}

function findInCacheDirs() {
    const home = process.env.HOME || process.env.USERPROFILE || ''
    const localAppData = process.env.LOCALAPPDATA || ''
    
    const possibleDirs = []
    if (home) {
        possibleDirs.push(path.join(home, '.cache/puppeteer'))
        if (process.platform === 'darwin') {
            possibleDirs.push(path.join(home, 'Library/Caches/puppeteer'))
        }
    }
    if (localAppData) {
        possibleDirs.push(path.join(localAppData, 'puppeteer'))
        possibleDirs.push(path.join(localAppData, '.cache/puppeteer'))
    }

    const executableNames = process.platform === 'win32'
        ? ['chrome.exe', 'msedge.exe']
        : ['chrome', 'Google Chrome', 'msedge', 'microsoft-edge']

    for (const dir of possibleDirs) {
        if (!fs.existsSync(dir)) continue
        const found = scanDirForExecutables(dir, executableNames)
        if (found) return found
    }
    return null
}

function scanDirForExecutables(dir, names, maxDepth = 6) {
    if (maxDepth < 0) return null
    try {
        const files = fs.readdirSync(dir, { withFileTypes: true })
        // First check files in the current folder for speed
        for (const file of files) {
            if (file.isFile()) {
                if (names.includes(file.name)) {
                    const fullPath = path.join(dir, file.name)
                    if (process.platform !== 'win32') {
                        try {
                            fs.accessSync(fullPath, fs.constants.X_OK)
                            return fullPath
                        } catch (e) {
                            // not executable, skip
                        }
                    } else {
                        return fullPath
                    }
                }
            }
        }
        // Then recurse into subdirectories
        for (const file of files) {
            if (file.isDirectory() && file.name !== 'node_modules' && !file.name.startsWith('.')) {
                const found = scanDirForExecutables(path.join(dir, file.name), names, maxDepth - 1)
                if (found) return found
            }
        }
    } catch (e) {
        // Directory unreadable, ignore
    }
    return null
}

