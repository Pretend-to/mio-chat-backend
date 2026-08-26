import { MioFunction } from '../../../function.js'
import path from 'path'
import fs from 'fs'
import { generateList, generateTree } from '../lib/explorer.js'

export default class ReadFolderTool extends MioFunction {
  constructor() {
    super({
      adminOnly: false,
      description: [
        'Explore a directory and output its structure.',
        'Supports two formats:',
        '- "tree": A visual ASCII tree (best for human/agent reading).',
        '- "list": A flattened array of nodes with ID/ParentID (best for programmatic use and init_folder compatibility).',
      ].join('\n'),
      name: 'read_folder',
      parameters: {
        properties: {
          depth: {
            default: 1,
            description: 'Maximum depth to explore.',
            type: 'integer'
          },
          directory_path: {
            description: 'The path of the directory to explore.',
            type: 'string',
          },
          format: {
            default: 'tree',
            description: 'Output format.',
            enum: ['tree', 'list'],
            type: 'string'
          },
          ignore: {
            default: ['node_modules', '.git', 'dist', 'output', '.prisma'],
            description: 'List of patterns to ignore.',
            items: { type: 'string' },
            type: 'array'
          }
        },
        required: [],
        type: 'object',
      },
    })
    this.func = this.readFolder
  }
  getDisplayName(params) {
    const directoryPath = params?.directory_path || params?.directoryPath || '.'
    const dirName = directoryPath === '.' ? 'workspace root' : path.basename(directoryPath)
    return `Scanning directory ${dirName}`
  }
  async readFolder(e) {
    try {
      const directoryPath = e.params?.directory_path || e.params?.directoryPath || '.'
      const depth = e.params?.depth !== undefined ? e.params.depth : 1
      const format = e.params?.format || 'tree'
      const ignore = e.params?.ignore || ['node_modules', '.git', 'dist', 'output', '.prisma']

      if (typeof directoryPath !== 'string') {
        return { error: 'Parameter "directory_path" (or "directoryPath") must be a string.' }
      }

      const targetPath = path.isAbsolute(directoryPath) ? directoryPath : path.join(process.cwd(), directoryPath)

      if (!fs.existsSync(targetPath)) {
        return { error: `Directory not found: ${directoryPath}` }
      }

      if (format === 'list') {
        const nodes = generateList(targetPath, null, 0, depth, ignore, [], process.cwd())
        return { nodes, path: targetPath }
      } else {
        const tree = generateTree(targetPath, '', 0, depth, ignore)
        return { path: targetPath, structure: tree || '(Empty directory)' }
      }
    } catch (error) {
      return { error: `Failed to read folder: ${error.message}` }
    }
  }
}
