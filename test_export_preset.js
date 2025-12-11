import fetch from 'node-fetch'
import fs from 'fs'

fetch('http://localhost:3080/api/config/presets/旅行指南/export', {
  method: 'GET',
  headers: {
    'X-Admin-Code': '123456'
  }
})
.then(response => {
  if (response.headers.get('content-disposition')) {
    console.log('Content-Disposition:', response.headers.get('content-disposition'))
  }
  return response.text()
})
.then(data => {
  console.log('导出的预设数据:')
  console.log(data)

  // 保存到文件
  fs.writeFileSync('exported_preset.json', data)
  console.log('\n已保存到 exported_preset.json')
})
.catch(error => console.error('Error:', error))