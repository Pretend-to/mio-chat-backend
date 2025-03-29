import { MioFunction } from '../../../functions.js'
import FormData from 'form-data'
import fetch from 'node-fetch' // Import fetch for Node.js

export default class parseFile extends MioFunction {
  constructor() {
    super({
      name: 'parseFile',
      description: 'A tool to upload a file for content extraction and retrieve the extracted content, then delete the uploaded file.',
      params: [{
        name: 'file_urls',
        type: 'array',
        description: 'The URLs of the files to parse for content extraction.',
        items: {
          type: 'string',
        },
      }],
      required: ['file_urls'] 
    })
    this.func = this.parseFile
  }

  async parseFile(e) {
    const fileUrls = e.params.file_urls
    const { apiKey } = this.getPluginConfig()  // Assuming this retrieves your API key
    if (!apiKey) {
      return {
        error: 'API key is missing. Please configure it in pluginInfo.config.token.'
      }
    }

    if (!Array.isArray(fileUrls) || fileUrls.length === 0) {
      return {
        error: 'file_urls must be a non-empty array.'
      }
    }

    const results = []

    for (const fileUrl of fileUrls) {
      let fileId = null // Store fileId for deletion
      let fileName

      try {
        // Fetch the file from the URL
        const fileResponse = await fetch(fileUrl)
        if (!fileResponse.ok) {
          results.push({
            fileUrl: fileUrl,
            error: `Failed to fetch file from URL: ${fileResponse.status} ${fileResponse.statusText}`
          })
          continue
        }
        const arrayBuffer = await fileResponse.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Extract filename (more robust)
        try {
          const urlParts = new URL(fileUrl) // Using URL constructor for safety
          const pathname = urlParts.pathname
          fileName = pathname.substring(pathname.lastIndexOf('/') + 1)
        } catch (error) {
          fileName = 'unknown_file' // Fallback if URL parsing fails
          console.warn('Failed to parse URL to extract filename:', error)
        }
        // Upload the file
        const formData = new FormData()
        formData.append('file', buffer, fileName)
        formData.append('purpose', 'file-extract') // Hardcoded for file extraction

        let uploadResponse, uploadData

        try {
          uploadResponse = await fetch('https://open.bigmodel.cn/api/paas/v4/files', {
            method: 'POST',
            body: formData,
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              ...formData.getHeaders(),
            },
          })
          uploadData = await uploadResponse.json()  // Try parsing as JSON

          console.log('Upload response status:', uploadResponse.status) // Debugging.  Look at the RESPONSE STATUS
          console.log('Upload response headers:', uploadResponse.headers) // Look at headers

          if (uploadResponse.status !== 200) { // Modified check
            console.error('Upload failed:', uploadData)  // See error message
            throw new Error(`Upload failed with status ${uploadResponse.status}: ${uploadData.msg || uploadResponse.statusText}`)
          }


          fileId = uploadData.id  // Correctly access file id // Store the file ID
          console.log(`Uploaded fileId: ${fileId}`)
        } catch (uploadError) {
          console.error('Upload error:', uploadError)
          results.push({
            fileUrl: fileUrl,
            error: `Upload request failed. ${uploadError.message}`
          })
          continue
        }

        console.log('Upload successful:', uploadData)

        // Retrieve the content
        let contentResponse
        try {
          contentResponse = await fetch(`https://open.bigmodel.cn/api/paas/v4/files/${fileId}/content`, {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
            },
          })
        } catch (contentError) {
          results.push({
            fileUrl: fileUrl,
            error: `Content request failed: ${contentError.message}`,
          })
          continue
        }

        if (!contentResponse.ok) {
          const errorText = await contentResponse.text()
          results.push({
            fileUrl: fileUrl,
            error: `Failed to retrieve content: ${contentResponse.status} ${contentResponse.statusText} - ${errorText}`,
          })
          continue
        }

        const contentData = await contentResponse.json() // Expect JSON, may need to adjust based on API
        results.push({
          fileUrl: fileUrl,
          uploadData: uploadData, // Include uploadData for debugging
          content: contentData,
        })
      } catch (error) {
        console.error('General error:', error)
        results.push({
          fileUrl: fileUrl,
          error: `An error occurred: ${error.message}`,
        })
      } finally {
        // Delete the file, even if there was an error.
        if (fileId) {
          try {
            const deleteResponse = await fetch(`https://open.bigmodel.cn/api/paas/v4/files/${fileId}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
              },
            })

            if (!deleteResponse.ok) {
              const errorText = await deleteResponse.text()
              results.push({
                fileUrl: fileUrl,
                fileId: fileId,
                deletionError: `Failed to delete file: ${deleteResponse.status} ${deleteResponse.statusText} - ${errorText}`,
              })
            } else {
              results.push({
                fileUrl: fileUrl,
                fileId: fileId,
                deleted: true,
              })
            }
          } catch (deleteError) {
            results.push({
              fileUrl: fileUrl,
              fileId: fileId,
              deletionError: `Deletion request failed: ${deleteError.message}`,
            })
          }
        }
      }
    }

    return {
      results: results,
    }
  }
}