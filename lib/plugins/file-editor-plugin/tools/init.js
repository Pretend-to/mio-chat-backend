import { MioFunction } from '../../../function.js'
import path from 'path'
import fs from 'fs'
import { generateTree } from '../lib/explorer.js'

export default class InitFolderTool extends MioFunction {
  constructor() {
    super({
      name: 'init_folder',
      description: [
        'Initialize a complex directory structure using a flattened array of nodes (ID/ParentID pattern).',
        'This is the most reliable way to scaffold projects as it avoids deep JSON nesting issues.',
      ].join('\n'),
      parameters: {
        type: 'object',
        properties: {
          base_path: {
            type: 'string',
            description: 'The root directory where the structure will be created.',
          },
          nodes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Unique identifier for this node.' },
                parentId: { type: 'string', description: 'ID of the parent directory. Leave empty for root nodes.' },
                name: { type: 'string', description: 'Name of the file or directory.' },
                type: { type: 'string', enum: ['file', 'dir'], description: 'Type of the node.' },
                content: { type: 'string', description: 'Initial content for files. Ignored for directories.' }
              },
              required: ['id', 'name', 'type']
            },
            description: 'List of nodes representing the file system structure.'
          }
        },
        required: ['base_path', 'nodes'],
      },
      adminOnly: false,
    })
    this.func = this.initFolder
  }

  async initFolder(e) {
    try {
      const basePath = e.params?.base_path || e.params?.basePath
      const nodes = e.params?.nodes

      if (!basePath || typeof basePath !== 'string') {
        return { error: 'Missing required parameter "base_path" (or "basePath") as a string.' }
      }
      if (!Array.isArray(nodes)) {
        return { error: 'Parameter "nodes" must be an array.' }
      }

      const rootPath = path.isAbsolute(basePath) ? basePath : path.join(process.cwd(), basePath)

      if (!fs.existsSync(rootPath)) {
        fs.mkdirSync(rootPath, { recursive: true })
      }

      const results = { created: [], errors: [] }
      const idToPath = new Map()
      
      // Pass 1: Build paths for root nodes
      nodes.forEach(node => {
        if (!node || typeof node !== 'object') return
        if (!node.id || !node.name) return
        const pId = node.parentId !== undefined ? node.parentId : node.parent_id
        if (!pId) {
          idToPath.set(node.id, path.join(rootPath, node.name))
        }
      })

      // Pass 2: Iteratively resolve paths for children
      let resolvedCount
      do {
        resolvedCount = 0
        nodes.forEach(node => {
          if (!node || typeof node !== 'object') return
          if (!node.id || !node.name) return
          const pId = node.parentId !== undefined ? node.parentId : node.parent_id
          if (!pId) return // Skip root nodes
          
          if (!idToPath.has(node.id) && idToPath.has(pId)) {
            idToPath.set(node.id, path.join(idToPath.get(pId), node.name))
            resolvedCount++
          }
        })
      } while (resolvedCount > 0)

      // Pass 3: Create items
      for (const node of nodes) {
        if (!node || typeof node !== 'object') continue
        if (!node.id || !node.name) {
          results.errors.push(`Invalid node object: ${JSON.stringify(node)}`)
          continue
        }

        const fullPath = idToPath.get(node.id)
        if (!fullPath) {
          const pId = node.parentId !== undefined ? node.parentId : node.parent_id
          results.errors.push(`Node "${node.name}" (id: ${node.id}) has an unresolvable parentId/parent_id: "${pId}".`)
          continue
        }

        try {
          if (node.type === 'dir') {
            if (!fs.existsSync(fullPath)) {
              fs.mkdirSync(fullPath, { recursive: true })
              results.created.push({ name: node.name, type: 'dir' })
            }
          } else {
            const dir = path.dirname(fullPath)
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
            
            fs.writeFileSync(fullPath, node.content || '')
            results.created.push({ name: node.name, type: 'file' })
          }
        } catch (err) {
          results.errors.push(`Failed to create ${node.name}: ${err.message}`)
        }
      }

      // Generate success tree structure as a confirmation
      const structure = generateTree(rootPath, '', 0, 5)

      return {
        success: results.errors.length === 0,
        message: `Initialized ${results.created.length} items at ${basePath}`,
        structure: structure || '(Empty directory)',
        errors: results.errors.length > 0 ? results.errors : undefined
      }
    } catch (error) {
      return { error: `Initialization failed: ${error.message}` }
    }
  }
}
