/**
 * LLM 适配器注册表 - 自动发现适配器
 * 通过扫描 adapters 目录并读取各适配器的元数据来动态构建可用适配器列表
 */

import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readdirSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 缓存已加载的适配器类型
let cachedAdapterTypes = null
let cachedMetadataList = null

/**
 * 同步获取适配器文件名列表 (不加载模块,仅文件扫描)
 * @returns {string[]} 适配器类型列表 (从文件名推断)
 */
export function getAdapterTypesSync() {
  const adapterFiles = readdirSync(__dirname)
    .filter(file => file.endsWith('.js') && file !== 'base.js' && file !== 'registry.js')
  
  // 从文件名推断适配器类型 (例如 openai.js -> openai)
  return adapterFiles.map(file => file.replace('.js', ''))
}

/**
 * 获取所有可用的适配器类型
 * @returns {Promise<string[]>} 适配器类型列表
 */
export async function getAvailableAdapterTypes() {
  if (cachedAdapterTypes) {
    return cachedAdapterTypes
  }
  
  const adapterFiles = readdirSync(__dirname)
    .filter(file => file.endsWith('.js') && file !== 'base.js' && file !== 'registry.js')
  
  const adapters = []
  
  for (const file of adapterFiles) {
    try {
      const adapterModule = await import(`./${file}`)
      const AdapterClass = adapterModule.default
      
      if (AdapterClass && typeof AdapterClass.getAdapterMetadata === 'function') {
        const metadata = AdapterClass.getAdapterMetadata()
        adapters.push(metadata.type)
      }
    } catch (error) {
      console.warn(`加载适配器 ${file} 失败:`, error.message)
    }
  }
  
  cachedAdapterTypes = adapters
  return adapters
}

/**
 * 获取所有适配器的元数据
 * @returns {Promise<Array>} 适配器元数据列表
 */
export async function getAdapterMetadataList() {
  const adapterFiles = readdirSync(__dirname)
    .filter(file => file.endsWith('.js') && file !== 'base.js' && file !== 'registry.js')
  
  const metadataList = []
  
  for (const file of adapterFiles) {
    try {
      const adapterModule = await import(`./${file}`)
      const AdapterClass = adapterModule.default
      
      if (AdapterClass && typeof AdapterClass.getAdapterMetadata === 'function') {
        metadataList.push(AdapterClass.getAdapterMetadata())
      }
    } catch (error) {
      console.warn(`加载适配器 ${file} 失败:`, error.message)
    }
  }
  
  return metadataList
}

/**
 * 检查适配器类型是否有效
 * @param {string} adapterType - 适配器类型
 * @returns {Promise<boolean>} 是否有效
 */
export async function isValidAdapterType(adapterType) {
  const availableTypes = await getAvailableAdapterTypes()
  return availableTypes.includes(adapterType)
}

/**
 * 获取需要特殊认证的适配器列表
 * @returns {Promise<string[]>} 需要特殊认证的适配器类型列表
 */
export async function getSpecialAuthAdapters() {
  const metadataList = await getAdapterMetadataList()
  return metadataList
    .filter(meta => meta.requiresSpecialAuth)
    .map(meta => meta.type)
}
