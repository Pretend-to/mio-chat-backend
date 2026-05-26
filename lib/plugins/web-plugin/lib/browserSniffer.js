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

    return null
}
