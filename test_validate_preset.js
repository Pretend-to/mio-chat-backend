import fetch from 'node-fetch'

// 测试无效的预设数据
const invalidPreset = {
  name: "",
  history: []
}

fetch('http://localhost:3080/api/config/presets/validate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Admin-Code': '123456'
  },
  body: JSON.stringify(invalidPreset)
})
.then(response => response.json())
.then(data => console.log(JSON.stringify(data, null, 2)))
.catch(error => console.error('Error:', error))