#!/usr/bin/env node
/**
 * 轻量级 SQLite Web 查看器 — 带 JSON 语法高亮预览
 *
 * 用法: node scripts/sqlite-viewer.js [port]
 * 默认端口: 5555
 */

import http from 'http'
import path from 'path'
import BetterSqlite3 from 'better-sqlite3'

const PORT = parseInt(process.argv[2], 10) || 5555
const DB_PATH = path.resolve(process.cwd(), 'prisma/data/app.db')

const db = new BetterSqlite3(DB_PATH)
db.pragma('journal_mode = WAL')

function getTables() {
  return db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%'
    ORDER BY name
  `).all().map(t => {
    const count = db.prepare(`SELECT COUNT(*) as cnt FROM "${t.name}"`).get()
    return { name: t.name, rowCount: count.cnt }
  })
}

function getTableInfo(tableName) {
  return db.prepare(`PRAGMA table_info("${tableName}")`).all()
}

function getTableData(tableName, page = 0, pageSize = 50) {
  const offset = page * pageSize
  const columns = getTableInfo(tableName).map(c => c.name)
  const rows = db.prepare(`SELECT * FROM "${tableName}" LIMIT ? OFFSET ?`).all(pageSize, offset)
  const total = db.prepare(`SELECT COUNT(*) as cnt FROM "${tableName}"`).get().cnt
  return { columns, rows, total, page, pageSize }
}

function renderPage(tables, activeTable, data) {
  const rows = data?.rows ?? []
  const columns = data?.columns ?? []
  const total = data?.total ?? 0
  const page = data?.page ?? 0
  const pageSize = data?.pageSize ?? 50
  const totalPages = Math.ceil(total / pageSize)
  const dbName = path.basename(DB_PATH)

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${dbName} — SQLite Viewer</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; background: #f0f2f5; color: #1a1a2e; display: flex; min-height: 100vh; }
  
  /* Sidebar */
  .sidebar { width: 260px; background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%); color: #fff; flex-shrink: 0; display: flex; flex-direction: column; }
  .sidebar-header { padding: 20px 20px 16px; border-bottom: 1px solid rgba(255,255,255,.08); }
  .sidebar-header h1 { font-size: 16px; font-weight: 700; letter-spacing: -.3px; }
  .sidebar-header p { font-size: 11px; color: rgba(255,255,255,.4); margin-top: 4px; }
  .sidebar-list { flex: 1; overflow-y: auto; padding: 8px 0; }
  .sidebar a { display: flex; align-items: center; justify-content: space-between; padding: 10px 20px; color: rgba(255,255,255,.65); text-decoration: none; transition: all .12s; border-left: 3px solid transparent; font-size: 14px; }
  .sidebar a:hover { background: rgba(255,255,255,.05); color: #fff; }
  .sidebar a.active { background: rgba(255,255,255,.1); color: #fff; border-left-color: #6c63ff; }
  .sidebar a .badge { background: rgba(255,255,255,.12); font-size: 11px; padding: 1px 8px; border-radius: 10px; font-variant-numeric: tabular-nums; }
  .sidebar a.active .badge { background: rgba(108,99,255,.3); }
  .sidebar-footer { padding: 12px 20px; border-top: 1px solid rgba(255,255,255,.08); font-size: 11px; color: rgba(255,255,255,.3); }
  .sidebar-footer a { color: rgba(255,255,255,.5); text-decoration: none; }
  .sidebar-footer a:hover { color: #fff; }

  /* Main */
  .main { flex: 1; padding: 24px 32px; overflow-x: hidden; min-width: 0; }
  .main-header { margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; }
  .main-header h2 { font-size: 20px; font-weight: 700; }
  .main-header .info { font-size: 13px; color: #888; }

  /* Table */
  .table-wrap { background: #fff; border-radius: 10px; box-shadow: 0 1px 4px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04); overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #f8f9fb; font-weight: 600; color: #555; padding: 12px 14px; text-align: left; border-bottom: 2px solid #e8ecf0; white-space: nowrap; position: sticky; top: 0; z-index: 1; }
  td { padding: 10px 14px; border-bottom: 1px solid #f0f1f3; max-width: 360px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: #f5f7fc; }
  td.null { color: #bbb; font-style: italic; }
  td.json { font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace; font-size: 12px; color: #6c63ff; cursor: pointer; transition: .1s; position: relative; }
  td.json:hover { color: #4a42d4; background: #f0eeff !important; }
  td.json::after { content: '🔍'; font-size: 10px; margin-left: 6px; opacity: .4; }
  td.number { font-variant-numeric: tabular-nums; text-align: right; font-family: 'SF Mono', monospace; }
  td.date { font-family: 'SF Mono', monospace; font-size: 12px; color: #666; }

  /* Pagination */
  .pagination { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 20px; }
  .pagination a, .pagination span { padding: 7px 15px; border-radius: 8px; text-decoration: none; font-size: 13px; }
  .pagination a { background: #fff; border: 1px solid #e0e2e6; color: #444; transition: .12s; }
  .pagination a:hover { border-color: #6c63ff; color: #6c63ff; }
  .pagination .disabled { opacity: .35; pointer-events: none; }
  .pagination .current { background: #6c63ff; color: #fff; border: 1px solid #6c63ff; font-weight: 600; }

  /* Modal */
  .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.55); backdrop-filter: blur(4px); z-index: 999; align-items: center; justify-content: center; }
  .modal-overlay.open { display: flex; }
  .modal { background: #1a1a2e; border-radius: 14px; max-width: 88vw; max-height: 84vh; overflow: hidden; box-shadow: 0 24px 48px rgba(0,0,0,.4); display: flex; flex-direction: column; animation: modal-in .2s ease; }
  @keyframes modal-in { from { opacity: 0; transform: scale(.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
  .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,.1); }
  .modal-header h3 { font-size: 14px; font-weight: 600; color: #e6d5b8; }
  .modal-header .close-btn { background: none; border: none; color: rgba(255,255,255,.4); font-size: 20px; cursor: pointer; padding: 4px 8px; border-radius: 6px; transition: .1s; line-height: 1; }
  .modal-header .close-btn:hover { background: rgba(255,255,255,.1); color: #fff; }
  .modal-body { padding: 20px; overflow: auto; flex: 1; }
  .modal-body pre { font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace; font-size: 13px; line-height: 1.65; color: #e6d5b8; white-space: pre-wrap; word-wrap: break-word; tab-size: 2; }

  /* JSON syntax highlighting */
  .jk { color: #6caeff; }  /* key */
  .jv { color: #9bdd7c; }  /* string value */
  .jn { color: #f9a85d; }  /* number */
  .jb { color: #f07878; }  /* boolean/null */
  .jc { color: #888; }     /* braces/punctuation */

  /* Empty state */
  .empty { text-align: center; padding: 60px 20px; color: #aaa; }
  .empty .icon { font-size: 40px; margin-bottom: 12px; }
  .empty p { font-size: 15px; }
</style>
</head>
<body>

<div class="sidebar">
  <div class="sidebar-header">
    <h1>📊 ${dbName}</h1>
    <p>${tables.length} 个表</p>
  </div>
  <div class="sidebar-list">
    ${tables.map(t =>
      `<a href="/?table=${encodeURIComponent(t.name)}" class="${activeTable === t.name ? 'active' : ''}">
        <span>${t.name}</span>
        <span class="badge">${t.rowCount}</span>
      </a>`
    ).join('')}
  </div>
  <div class="sidebar-footer">
    <a href="/">↻ 刷新</a>
  </div>
</div>

<div class="main">
  ${activeTable ? `
    <div class="main-header">
      <h2>${activeTable}</h2>
      <div class="info">${total} 行 · 第 ${page + 1}/${Math.max(totalPages, 1)} 页</div>
    </div>
    ${rows.length === 0 ? `
      <div class="empty"><div class="icon">📭</div><p>表是空的</p></div>
    ` : `
      <div class="table-wrap">
        <table>
          <thead><tr>${columns.map(c => `<th>${c}</th>`).join('')}</tr></thead>
          <tbody>
            ${rows.map(row => `<tr>${
              columns.map(c => {
                const val = row[c]
                if (val === null) return '<td class="null">NULL</td>'
                const str = String(val)
                if (!str) return '<td class="null">—</td>'
                // Check if it's a JSON object/array
                if (str.length > 0 && (str[0] === '[' || str[0] === '{')) {
const preview = str.length > 80 ? str.slice(0, 80).replace(/\\n/g, '↵') + '…' : str.replace(/\\n/g, '↵')
                  return `<td class="json" onclick="openModal('${encodeURIComponent(str).replace(/'/g, '%27')}')">${preview}</td>`
                }
                // Number detection
                if (/^-?\d+(\.\d+)?$/.test(str) && str.length < 20) return `<td class="number">${str}</td>`
                // Date detection
                if (/^\d{4}-\d{2}-\d{2}T/.test(str)) return `<td class="date">${str.replace('T', ' ').slice(0, 19)}</td>`
                // Truncate long text
                const display = str.length > 200 ? str.slice(0, 200) + '…' : str
                return `<td title="${str.replace(/"/g, '&quot;')}">${display}</td>`
              }).join('')
            }</tr>`).join('')}
          </tbody>
        </table>
      </div>
      ${totalPages > 1 ? `
      <div class="pagination">
        <a href="/?table=${encodeURIComponent(activeTable)}&page=0" class="${page === 0 ? 'disabled' : ''}">⏮</a>
        <a href="/?table=${encodeURIComponent(activeTable)}&page=${page - 1}" class="${page === 0 ? 'disabled' : ''}">◀</a>
        ${(() => {
          const pages = []
          const start = Math.max(0, page - 2)
          const end = Math.min(totalPages - 1, page + 2)
          for (let i = start; i <= end; i++) {
            pages.push(i === page
              ? `<span class="current">${i + 1}</span>`
              : `<a href="/?table=${encodeURIComponent(activeTable)}&page=${i}">${i + 1}</a>`
            )
          }
          return pages.join('')
        })()}
        <a href="/?table=${encodeURIComponent(activeTable)}&page=${page + 1}" class="${page + 1 >= totalPages ? 'disabled' : ''}">▶</a>
        <a href="/?table=${encodeURIComponent(activeTable)}&page=${totalPages - 1}" class="${page + 1 >= totalPages ? 'disabled' : ''}">⏭</a>
      </div>` : ''}
    `}
  ` : `
    <div class="empty">
      <div class="icon">🗄️</div>
      <p>左侧选择一个表查看数据</p>
    </div>
  `}
</div>

<!-- JSON Modal -->
<div id="modal" class="modal-overlay" onclick="closeModal(event)">
  <div class="modal">
    <div class="modal-header">
      <h3>📄 JSON 预览</h3>
      <button class="close-btn" onclick="hideModal()">✕</button>
    </div>
    <div class="modal-body">
      <pre id="jsonView"></pre>
    </div>
  </div>
</div>

<script>
  const modal = document.getElementById('modal')
  const jsonView = document.getElementById('jsonView')

  function openModal(raw) {
    try {
      const parsed = JSON.parse(decodeURIComponent(raw))
      jsonView.innerHTML = syntaxHighlight(JSON.stringify(parsed, null, 2))
    } catch (e) {
      jsonView.textContent = decodeURIComponent(raw)
    }
    modal.classList.add('open')
  }

  function hideModal() {
    modal.classList.remove('open')
  }

  function closeModal(e) {
    if (e.target === e.currentTarget) hideModal()
  }

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') hideModal()
  })

  function syntaxHighlight(json) {
    return json
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/({|}|\[|\]|,)/g, '<span class="jc">$1</span>')
      .replace(/"([^"]+)":/g, '<span class="jk">"$1"</span>:')
      .replace(/: "((?:[^"\\\\]|\\\\.)*)"/g, ': <span class="jv">"$1"</span>')
      .replace(/: (-?\d+\.?\d*(?:e[+-]?\d+)?)/g, ': <span class="jn">$1</span>')
      .replace(/: (true|false|null)/g, ': <span class="jb">$1</span>')
  }
</script>
</body>
</html>`
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const pathname = url.pathname

  if (pathname === '/' || pathname === '/index.html') {
    const table = url.searchParams.get('table') || null
    const page = Math.max(0, parseInt(url.searchParams.get('page'), 10) || 0)
    const tables = getTables()
    let data = null
    if (table && tables.some(t => t.name === table)) {
      data = getTableData(table, page)
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(renderPage(tables, table, data))
  } else {
    res.writeHead(404)
    res.end('Not Found')
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ SQLite Viewer running at http://0.0.0.0:${PORT}`)
  console.log(`   DB: ${DB_PATH}`)
})
