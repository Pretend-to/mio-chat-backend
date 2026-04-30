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
    this.baseUrl = config.baseUrl // e.g., https://pub-xxx.r2.dev or custom domain
    this.region = config.region || 'auto'
    this.endpoint = config.endpoint
    this.accessKeyId = config.accessKeyId
    this.secretAccessKey = config.secretAccessKey
  }

  async _initClient() {
    if (this.client) return
    
    const { S3Client } = await import('@aws-sdk/client-s3')
    this.client = new S3Client({
      region: this.region,
      endpoint: this.endpoint,
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
      },
      forcePathStyle: true, // Needed for some S3-compatible providers
    })
  }

  async upload(data, fileName, type = 'file', options = {}) {
    await this._initClient()
    const { Upload } = await import('@aws-sdk/lib-storage')
    
    const key = `${type}/${fileName}`
    const contentType = options.contentType || 'application/octet-stream'

    const parallelUploads3 = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
        ACL: options.acl || 'public-read'
      },
    })

    await parallelUploads3.done()

    return {
      key,
      url: this.getUrl(key),
      size: data.length
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
