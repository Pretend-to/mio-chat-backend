import { MioFunction, Param } from '../../../lib/functions.js'
import { pluginInfo } from '../index.js'
import fetch from 'node-fetch'
import FormData from 'form-data'

export class parseFile extends MioFunction {
  constructor() {
    super({
      name: 'parseFile',
      description: 'A tool to upload a file for content extraction and retrieve the extracted content, then delete the uploaded file.',
      params: [
        new Param({
          name: 'file_urls',
          type: 'array',
          description: 'The URLs of the files to parse for content extraction.',
          required: true,
          items: {  
            type: 'string', 
          },
        }),
      ]
    })
    this.func = this.parseFile
  }

  async parseFile(e) {
    const fileUrls = e.params.file_urls
    const apiKey = pluginInfo.config.api_key

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
        const fileName = fileUrl.substring(fileUrl.lastIndexOf('/') + 1)

        // Upload the file
        const formData = new FormData()
        formData.append('file', buffer, fileName)
        formData.append('purpose', 'file-extract') // Hardcoded for file extraction

        let uploadResponse
        try {
          uploadResponse = await fetch('https://open.bigmodel.cn/api/paas/v4/files', {
            method: 'POST',
            body: formData,
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              ...formData.getHeaders(),
            },
          })
        } catch (uploadError) {
          results.push({
            fileUrl: fileUrl,
            error: `Upload request failed: ${uploadError.message}`,
          })
          continue
        }
        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text()
          results.push({
            fileUrl: fileUrl,
            error: `Upload failed: ${uploadResponse.status} ${uploadResponse.statusText} - ${errorText}`,
          })
          continue
        }

        const uploadData = await uploadResponse.json()
        fileId = uploadData.id // Store the file ID

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
          uploadData: uploadData,
          content: contentData,
        })

      } catch (error) {
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