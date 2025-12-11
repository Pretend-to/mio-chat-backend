import fetch from 'node-fetch'

const presetData = {
  name: "测试助手",
  category: "common",
  history: [
    {
      role: "system",
      content: "你是一个测试助手，专门帮助用户进行软件测试。"
    }
  ],
  opening: "你好！我是测试助手，可以帮助你进行软件测试。",
  tools: ["web_search"]
}

fetch('http://localhost:3080/api/config/presets', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Admin-Code': '123456'
  },
  body: JSON.stringify(presetData)
})
.then(response => response.json())
.then(data => console.log(JSON.stringify(data, null, 2)))
.catch(error => console.error('Error:', error))