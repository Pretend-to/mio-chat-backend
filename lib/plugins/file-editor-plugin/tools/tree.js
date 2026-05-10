import { MioFunction } from '../../../function.js'
import path from 'path'
import fs from 'fs'
import { generateTree, generateList } from '../lib/explorer.js'

export default class ReadFolderTool extends MioFunction {
  constructor() {
    super({
      name: 'read_folder',
      description: [
        'Explore a directory and output its structure.',
        'Supports two formats:',
        '- "tree": A visual ASCII tree (best for human/agent reading).',
        '- "list": A flattened array of nodes with ID/ParentID (best for programmatic use and init_folder compatibility).',
      ].join('\n'),
      parameters: {
        type: 'object',
        properties: {
          directory_path: {
            type: 'string',
            description: 'The path of the directory to explore.',
          },
          depth: {
            type: 'integer',
            description: 'Maximum depth to explore.',
            default: 3
          },
          format: {
            type: 'string',
            enum: ['tree', 'list'],
            description: 'Output format.',
            default: 'tree'
          },
          ignore: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of patterns to ignore.',
            default: ['node_modules', '.git', 'dist', 'output', '.prisma']
          }
        },
        required: [],
      },
      adminOnly: false,
    })
    this.func = this.readFolder
  }

  async readFolder(e) {
    const { directory_path = '.', depth = 3, format = 'tree', ignore = ['node_modules', '.git', 'dist', 'output', '.prisma'] } = e.params
    const targetPath = path.isAbsolute(directory_path) ? directory_path : path.join(process.cwd(), directory_path)

    if (!fs.existsSync(targetPath)) {
      return { error: `Directory not found: ${directory_path}` }
    }

    try {
      if (format === 'list') {
        const nodes = generateList(targetPath, null, 0, depth, ignore, [], process.cwd())
        return { path: targetPath, nodes }
      } else {
        const tree = generateTree(targetPath, '', 0, depth, ignore)
        return { path: targetPath, structure: tree || '(Empty directory)' }
      }
    } catch (error) {
      return { error: `Failed to read folder: ${error.message}` }
    }
  }
}
