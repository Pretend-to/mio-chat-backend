import fs from 'fs'
import path from 'path'

/**
 * 递归生成 ASCII 树状结构
 */
export function generateTree(dir, prefix = '', currentDepth = 0, maxDepth = 1, ignore = []) {
  if (currentDepth > maxDepth) return ''
  let result = ''
  
  try {
    const files = fs.readdirSync(dir, { withFileTypes: true })
    const filteredFiles = files
      .filter(f => !ignore.some(p => f.name.includes(p)))
      .sort((a, b) => (a.isDirectory() === b.isDirectory() ? a.name.localeCompare(b.name) : a.isDirectory() ? -1 : 1))

    filteredFiles.forEach((file, index) => {
      const isLast = index === filteredFiles.length - 1
      result += `${prefix}${isLast ? '└── ' : '├── '}${file.name}${file.isDirectory() ? '/' : ''}\n`
      if (file.isDirectory()) {
        result += generateTree(path.join(dir, file.name), prefix + (isLast ? '    ' : '│   '), currentDepth + 1, maxDepth, ignore)
      }
    })
  } catch (err) {
    result += `${prefix} [Error reading directory: ${err.message}]\n`
  }
  
  return result
}

/**
 * 递归生成扁平化的节点列表 (ID/ParentID)
 */
export function generateList(dir, parentId = null, currentDepth = 0, maxDepth = 1, ignore = [], nodes = [], rootPath = process.cwd()) {
  if (currentDepth > maxDepth) return nodes
  
  try {
    const files = fs.readdirSync(dir, { withFileTypes: true })
    
    files.filter(f => !ignore.some(p => f.name.includes(p))).forEach(file => {
      const fullPath = path.join(dir, file.name)
      const id = path.relative(rootPath, fullPath)
      
      nodes.push({
        id,
        parentId,
        name: file.name,
        type: file.isDirectory() ? 'dir' : 'file'
      })
      
      if (file.isDirectory()) {
        generateList(fullPath, id, currentDepth + 1, maxDepth, ignore, nodes, rootPath)
      }
    })
  } catch {
    // Skip failed directories
  }
  
  return nodes
}
