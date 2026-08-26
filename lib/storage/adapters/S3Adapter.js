import path from 'path'
import StorageAdapter from '../StorageAdapter.js'

/**
 * Adapter for S3-compatible storage (Amazon S3, Cloudflare R2, MinIO, etc.)
 * Requires @aws-sdk/client-s3 and @aws-sdk/lib-storage
 */
export default class S3Adapter extends StorageAdapter {
  constructor(config = {}) {
    super(config)
    this.client = null
    this.bucket = config.bucket
    this.baseUrl = config.baseUrl // E.g., https://pub-xxx.r2.dev or custom domain
    this.region = config.region || 'auto'
    this.endpoint = config.endpoint
    this.accessKeyId = config.accessKeyId
    this.secretAccessKey = config.secretAccessKey
  }

  async _initClient() {
    if (this.client) {return}
    
    const { S3Client } = await import('@aws-sdk/client-s3')
    this.client = new S3Client({
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
      },
      endpoint: this.endpoint,
      forcePathStyle: true, // Needed for some S3-compatible providers
      region: this.region,
    })
  }

  async upload(data, fileName, type = 'file', options = {}) {
    await this._initClient()
    const { Upload } = await import('@aws-sdk/lib-storage')
    
    let finalFileName = fileName
    let key = `${type}/${finalFileName}`
    
    const ext = path.extname(fileName)
    const baseName = path.basename(fileName, ext)
    let counter = 1

    // 内容寻址去重：文件名基于内容哈希（如 MD5）时，相同 key 应幂等返回已有 URL，而非生成序号副本
    if (options.dedup === true) {
      if (await this.exists(key)) {
        return { deduped: true, key, size: data.length, url: this.getUrl(key) }
      }
    } else {
      // 自定义文件名场景：重名时追加序号，保留不同文件
      while (await this.exists(key)) {
        finalFileName = `${baseName}(${counter})${ext}`
        key = `${type}/${finalFileName}`
        counter++
      }
    }

    const contentType = options.contentType || 'application/octet-stream'

    const parallelUploads3 = new Upload({
      client: this.client,
      params: {
        ACL: options.acl || 'public-read',
        Body: data,
        Bucket: this.bucket,
        ContentType: contentType,
        Key: key
      },
    })

    await parallelUploads3.done()

    return {
      key,
      size: data.length,
      url: this.getUrl(key)
    }
  }

  async delete(key) {
    await this._initClient()
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3')
    await this.client.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key
    }))
  }

  async exists(key) {
    await this._initClient()
    const { HeadObjectCommand } = await import('@aws-sdk/client-s3')
    try {
      await this.client.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key
      }))
      return true
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false
      }
      throw error
    }
  }

  getUrl(key) {
    if (this.baseUrl) {
      // Remove trailing slash if exists
      const base = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl
      return `${base}/${key}`
    }
    // Fallback to generic S3 URL if baseUrl is not provided
    return `${this.endpoint}/${this.bucket}/${key}`
  }
}
