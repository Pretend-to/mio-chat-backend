import fetch from 'node-fetch'

fetch('http://localhost:3080/api/config/presets/测试助手', {
  method: 'DELETE',
  headers: {
    'Content-Type': 'application/json',
    'X-Admin-Code': '123456'
  }
})
.then(response => response.json())
.then(data => console.log(JSON.stringify(data, null, 2)))
.catch(error => console.error('Error:', error))