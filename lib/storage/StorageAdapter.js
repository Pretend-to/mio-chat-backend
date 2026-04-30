/**
 * Base class for all storage adapters.
 * Defines the interface that every storage adapter must implement.
 */
export default class StorageAdapter {
  constructor(config = {}) {
    this.config = config
  }

  /**
   * Upload a file to the storage.
   * @param {Buffer|Stream} data - The file data.
   * @param {string} fileName - The name of the file.
   * @param {string} type - The type of file (e.g., 'image', 'file').
   * @param {Object} options - Additional options.
   * @returns {Promise<Object>} - Information about the uploaded file (e.g., { url, key }).
   */
  async upload(_data, _fileName, _type = 'file', _options = {}) {
    throw new Error('Method upload() must be implemented.')
  }

  /**
   * Delete a file from the storage.
   * @param {string} key - The file key or path.
   * @returns {Promise<void>}
   */
  async delete(_key) {
    throw new Error('Method delete() must be implemented.')
  }

  /**
   * Check if a file exists in the storage.
   * @param {string} key - The file key or path.
   * @returns {Promise<boolean>}
   */
  async exists(_key) {
    throw new Error('Method exists() must be implemented.')
  }

  /**
   * Get a public URL for a file.
   * @param {string} key - The file key or path.
   * @returns {string} - The public URL.
   */
  getUrl(_key) {
    throw new Error('Method getUrl() must be implemented.')
  }
}
