import LocalAdapter from './adapters/LocalAdapter.js'
import S3Adapter from './adapters/S3Adapter.js'
import logger from '../../utils/logger.js'

class StorageService {
  constructor() {
    this.adapter = null
    this.isInitialized = false
  }

  async initialize(force = false) {
    if (this.isInitialized && !force) return
    
    try {
      // Import SystemSettingsService dynamically to avoid circular dependencies
      const { default: SystemSettingsService } = await import('../database/services/SystemSettingsService.js')
      
      if (!SystemSettingsService.prisma) {
        await SystemSettingsService.initialize()
      }

      const storageConfigSetting = await SystemSettingsService.get('storage_config')
      const config = storageConfigSetting?.value || { type: 'local' }

      logger.info(`[StorageService] Initializing with type: ${config.type}`)

      switch (config.type) {
        case 's3':
          this.adapter = new S3Adapter(config)
          break
        case 'local':
        default:
          this.adapter = new LocalAdapter(config)
          break
      }

      this.isInitialized = true
    } catch (error) {
      logger.error('[StorageService] Initialization failed:', error)
      // Fallback to local adapter in case of error
      if (!this.adapter) {
        this.adapter = new LocalAdapter()
      }
      this.isInitialized = true
    }
  }

  async reload() {
    logger.info('[StorageService] Reloading configuration...')
    await this.initialize(true)
  }

  async upload(data, fileName, type = 'file', options = {}) {
    if (!this.isInitialized) await this.initialize()
    return this.adapter.upload(data, fileName, type, options)
  }

  async delete(key) {
    if (!this.isInitialized) await this.initialize()
    return this.adapter.delete(key)
  }

  async exists(key) {
    if (!this.isInitialized) await this.initialize()
    return this.adapter.exists(key)
  }

  async getUrl(key) {
    if (!this.isInitialized) await this.initialize()
    return this.adapter.getUrl(key)
  }
}

// Create singleton instance
const storageService = new StorageService()
export default storageService
