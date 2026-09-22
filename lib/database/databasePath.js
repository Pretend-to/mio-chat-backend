import path from 'node:path'

/**
 * 数据库路径的唯一来源：`<process.cwd()>/data/app.db`。
 *
 * 设计约定（2026-09 切分支丢数据事故后收敛）：
 * 1. 不支持 `MIOCHAT_DATABASE_PATH` 等自定义路径 —— 路径只由「运行目录」决定。
 *    曾经"路径由环境变量/分支代码决定"的设计会让同一份数据指向不同文件：
 *    master 指向 prisma/data/app.db（不存在→起空库），dev 指向 data/app.db（真库），
 *    切一次分支就等于换了一个数据库。
 * 2. 不再从 `prisma/data/` 搬迁旧库。那段"目标缺失就 rename"的逻辑会把其它实例
 *    留下的空库搬进 data/，把真数据顶掉。`prisma/data/` 已彻底废弃。
 */
export function resolveDatabasePath({ rootDir = process.cwd() } = {}) {
  return path.resolve(path.join(rootDir, 'data/app.db'))
}

export default resolveDatabasePath
