/**
 * LLM 适配器注册表
 * 基于声明式 Profile 数据字典与核心协议基类，统一管理与分发适配器
 */

import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readdirSync } from 'fs'
import {
  declarativeProfiles,
  declarativeProfilesMap,
  makeDeclarativeAdapter,
} from './declarativeProfiles.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const implementationsDir = join(__dirname, 'implementations')

// 核心定制型适配器列表（待后续阶段进一步抽象）
const BUILTIN_CUSTOM_TYPES = [
  'agentPlatform',
  'anthropic',
  'gemini',
  'geminiOauth',
  'openai-responses',
  'openai',
  'xai',
]

// 缓存已加载的适配器类型和适配器类
let cachedAdapterTypes = null
const adapterClassCache = new Map()

/**
 * 清除适配器缓存
 */
export function clearCache() {
  cachedAdapterTypes = null
  adapterClassCache.clear()
}

/**
 * 获取适配器类（工厂方法）
 * 声明型适配器直接基于 Profile 生成，定制型适配器按需动态导入
 * @param {string} adapterType
 * @returns {Promise<Function|null>}
 */
export async function getAdapterClass(adapterType) {
  if (adapterClassCache.has(adapterType)) {
    return adapterClassCache.get(adapterType)
  }

  // 1. 优先匹配声明型 Profile
  const declarativeProfile = declarativeProfilesMap.get(adapterType)
  if (declarativeProfile) {
    const Cls = await makeDeclarativeAdapter(declarativeProfile)
    adapterClassCache.set(adapterType, Cls)
    return Cls
  }

  // 2. 匹配定制型实现文件
  try {
    const adapterPath = `./implementations/${adapterType}.js`
    const adapterModule = await import(adapterPath)
    const AdapterClass = adapterModule.default
    if (AdapterClass) {
      adapterClassCache.set(adapterType, AdapterClass)
      return AdapterClass
    }
  } catch (error) {
    console.warn(`加载定制适配器 ${adapterType} 失败:`, error.message)
  }

  return null
}

/**
 * 同步获取适配器文件名/类型列表
 * @returns {string[]} 适配器类型列表
 */
export function getAdapterTypesSync() {
  const declarativeTypes = declarativeProfiles.map((p) => p.type)
  const existingFiles = readdirSync(implementationsDir)
    .filter((file) => file.endsWith('.js'))
    .map((file) => file.replace('.js', ''))

  return Array.from(
    new Set([...BUILTIN_CUSTOM_TYPES, ...existingFiles, ...declarativeTypes]),
  )
}

/**
 * 获取所有可用的适配器类型
 * @returns {Promise<string[]>} 适配器类型列表
 */
export async function getAvailableAdapterTypes() {
  if (cachedAdapterTypes) {
    return cachedAdapterTypes
  }

  const allTypes = getAdapterTypesSync()
  const available = []

  for (const type of allTypes) {
    const Cls = await getAdapterClass(type)
    if (Cls && typeof Cls.getAdapterMetadata === 'function') {
      const metadata = Cls.getAdapterMetadata()
      if (metadata && metadata.type) {
        available.push(metadata.type)
      }
    }
  }

  cachedAdapterTypes = available
  return available
}

/**
 * 获取适配器别名映射表 (用于自动迁移)
 * @returns {Promise<Object>} { alias: mainType } 映射
 */
export async function getAdapterAliasesMap() {
  const availableTypes = await getAvailableAdapterTypes()
  const aliasMap = {}

  for (const type of availableTypes) {
    try {
      const Cls = await getAdapterClass(type)
      if (Cls && typeof Cls.getAdapterMetadata === 'function') {
        const metadata = Cls.getAdapterMetadata()
        if (metadata.aliases && Array.isArray(metadata.aliases)) {
          for (const alias of metadata.aliases) {
            aliasMap[alias] = metadata.type
          }
        }
      }
    } catch {
      // 忽略单个加载失败
    }
  }

  return aliasMap
}

/**
 * 获取所有适配器的元数据
 * @returns {Promise<Array>} 适配器元数据列表
 */
export async function getAdapterMetadataList() {
  const availableTypes = await getAvailableAdapterTypes()
  const metadataList = []

  for (const type of availableTypes) {
    try {
      const Cls = await getAdapterClass(type)
      if (Cls && typeof Cls.getAdapterMetadata === 'function') {
        metadataList.push(Cls.getAdapterMetadata())
      }
    } catch (error) {
      console.warn(`获取适配器元数据 ${type} 失败:`, error.message)
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
    .filter((meta) => meta.requiresSpecialAuth)
    .map((meta) => meta.type)
}

import modelRegistryService from '../services/ModelRegistryService.js'

export { modelRegistryService }
export const getModelMetadata = (model) =>
  modelRegistryService.getModelMetadata(model)
export const getWatermark = (model) => modelRegistryService.getWatermark(model)
export const supportsVision = (model) =>
  modelRegistryService.supportsVision(model)
export const syncModelsRegistry = () => modelRegistryService.syncRegistry()
