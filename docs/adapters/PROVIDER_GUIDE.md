# 主流模型供应商配置指南 (Provider Guide)

本文记录了部分特殊认证机制适配器的接入方法，帮助你快速完成配置。

---

## 1. Google Vertex AI (Enterprise)

Mio-Chat 提供了对 Google Vertex AI 的深度支持，支持两种认证模式。

### 方案 A：API Key (Express 模式)
这是最简单的接入方式，适合快速测试。
1.  进入 [Google Cloud Console](https://console.cloud.google.com/)。
2.  在 **API 和服务 > 凭据** 中创建一个 **API 密钥**。
3.  确保已在项目中启用 **Vertex AI API**。
4.  在 Mio-Chat 对应适配器配置中填入该 Key，并确保基础 URL 正确。

### 方案 B：ADC 模式 (推荐用于生产)
使用 Google 的 **Application Default Credentials**。
1.  在 Google Cloud 中创建一个 **服务账号 (Service Account)**，并赋予 `Vertex AI User` 权限。
2.  下载并保存该账号的 **JSON 密钥文件**。
3.  在服务器环境变量中设置：`export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/key.json"`。
4.  在 Mio-Chat 配置中开启 **阻断/禁用 Express 模式**。系统将自动调用 Google SDK 刷新 Access Token。

---

## 2. Gemini OAuth

Gemini OAuth 适配器旨在通过 OAuth2 协议提供更灵活的认证能力。

### 认证流程
1.  **获取凭据**：你需要在 [Google Cloud Console](https://console.cloud.google.com/apis/credentials) 创建一个类型为 **Web 应用** 的 OAuth 2.0 客户端 ID。
2.  **设置回调**：将 Mio-Chat 的后端授权回调地址（通常为 `https://your-domain.com/api/auth/gemini/callback`）添加到“已启用的重定向 URI”中。
3.  **配置参数**：在适配器设置中填入 `Client ID` 和 `Client Secret`。
4.  **授权绑定**：通过管理界面发起的授权流程，获取 `Refresh Token`。系统将自动处理后续的 Token 续期逻辑。

---

## 3. Anthropic (Claude)

*   **官方 API**：直接在 [Anthropic Console](https://console.anthropic.com/) 获取 API Key。
*   **跨地域使用**：如果你身处受限地区，可以通过设置 `base_url` 配合反向代理或第三方中转服务（如 OpenRouter）进行接入。

---

## 4. DeepSeek (高性价比推荐)

*   **配置**：DeepSeek 提供原生 OpenAI 兼容接口。
*   **优化**：在 Mio-Chat 中使用 DeepSeek 适配器时，系统会自动启用针对 DeepSeek 的 `thinking_tokens` 审计，确保你能够清晰查看到模型的“思维过程”消耗。

---
*持续更新中... 如果你发现了新的配置技巧，欢迎提交 PR。*
