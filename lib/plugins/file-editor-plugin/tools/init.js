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
    const { base_path, nodes } = e.params
    const rootPath = path.isAbsolute(base_path) ? base_path : path.join(process.cwd(), base_path)

    try {
      if (!fs.existsSync(rootPath)) {
        fs.mkdirSync(rootPath, { recursive: true })
      }

      const results = { created: [], errors: [] }
      const idToPath = new Map()
      
      // Pass 1: Build paths for root nodes
      nodes.forEach(node => {
        if (!node.parentId) {
          idToPath.set(node.id, path.join(rootPath, node.name))
        }
      })

      // Pass 2: Iteratively resolve paths for children
      let resolvedCount
      do {
        resolvedCount = 0
        nodes.forEach(node => {
          if (!idToPath.has(node.id) && idToPath.has(node.parentId)) {
            idToPath.set(node.id, path.join(idToPath.get(node.parentId), node.name))
            resolvedCount++
          }
        })
      } while (resolvedCount > 0)

      // Pass 3: Create items
      for (const node of nodes) {
        const fullPath = idToPath.get(node.id)
        if (!fullPath) {
          results.errors.push(`Node "${node.name}" (id: ${node.id}) has an unresolvable parentId.`)
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
        message: `Initialized ${results.created.length} items at ${base_path}`,
        structure: structure || '(Empty directory)',
        errors: results.errors.length > 0 ? results.errors : undefined
      }
    } catch (error) {
      return { error: `Initialization failed: ${error.message}` }
    }
  }
}
