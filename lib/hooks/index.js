import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import HookManager from './HookManager.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BUILTINS_DIR = path.join(__dirname, 'builtins')

/**
 * 全局单例 Hook 管理器
 */
const hookManager = new HookManager()

/**
 * 动态加载并注册内置钩子
 */
export async function loadBuiltinHooks() {
  if (!fs.existsSync(BUILTINS_DIR)) return

  try {
    const files = fs.readdirSync(BUILTINS_DIR).filter(f => f.endsWith('.js'))
    
    for (const file of files) {
      const filePath = path.join(BUILTINS_DIR, file)
      const fileUrl = `${pathToFileURL(filePath).toString()}?t=${Date.now()}`
      
      try {
        const module = await import(fileUrl)
        const HookClass = module.default
        
        if (typeof HookClass === 'function') {
          const hookInstance = new HookClass()
          // 自动根据 Hook 名称注销旧的，确保热重载不冲突
          if (hookInstance.name) {
            hookManager.unregister(hookInstance.name)
          }
          hookManager.register(hookInstance)
        }
      } catch (err) {
        console.error(`[Hooks] 加载内置钩子失败 ${file}:`, err)
      }
    }
    logger.info(`[Hooks] 已完成 ${files.length} 个内置钩子的动态加载/重载`)
  } catch (error) {
    console.error('[Hooks] 扫描内置钩子目录失败:', error)
  }
}

// 初始化加载
loadBuiltinHooks()

export default hookManager
export { hookManager }
