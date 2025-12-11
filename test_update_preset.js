import fetch from 'node-fetch'

const updateData = {
  name: "测试助手",
  category: "common",
  history: [
    {
      role: "system",
      content: "你是一个专业的软件测试助手，可以帮助用户进行各种类型的软件测试。"
    },
    {
      role: "user",
      content: "你好，我想学习自动化测试"
    },
    {
      role: "assistant",
      content: "你好！我可以帮助你学习自动化测试。自动化测试可以提高测试效率。"
    }
  ],
  opening: "你好！我是专业的软件测试助手，可以帮你进行各种软件测试。",
  tools: ["web_search", "code_interpreter"]
}

fetch('http://localhost:3080/api/config/presets/测试助手', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'X-Admin-Code': '123456'
  },
  body: JSON.stringify(updateData)
})
.then(response => response.json())
.then(data => console.log(JSON.stringify(data, null, 2)))
.catch(error => console.error('Error:', error))