import { MioFunction } from '../../../function.js'
import { TemplateStore } from '../lib/TemplateStore.js'
import { render } from '../lib/TemplateRenderer.js'
import { imageService } from '../../../chat/image/ImageService.js'

/**
 * send_ui - 发送 UI
 * 前后端解耦设计：
 *   - 后端只负责数据流分发与任务状态调度，不注入任何硬编码假图 SVG；
 *   - 异步生图时，初始状态下 vars.imageUrl 为空字符串，由 HTML 模板层自主掌控骨架屏、流动极光背景与加载提示；
 *   - 前端监听到 WebSocket 回填或任务就绪后，直接将真实图片 URL 赋予目标节点，实现平滑渐入。
 */
export default class SendUi extends MioFunction {
  constructor() {
    super({
      name: 'send_ui',
      description:
        '渲染并发送交互式 UI 界面到消息流（Shadow DOM 独立渲染，支持 JS 交互）。' +
        '【图片双模适配】：' +
        '1. 静态图片：直接传 imageUrl / imgurl（如现有图片链接、网络图、素材图），直接即时渲染；' +
        '2. 动态异步生图：传入 prompt / imagePrompt，自动提交后台生图任务并即刻输出卡片（由模板原生 CSS/DOM 呈现骨架屏），图片绘制完成后 WebSocket 自动平滑淡入回填；' +
        '3. 图生图：同时传入 imageUrl + prompt，将作为参考图进行图生图重绘。' +
        '用法：传 template（推荐，如 "gal_dialogue_card"）+ variables，或传 html 发送内联 HTML。',
      parameters: {
        type: 'object',
        properties: {
          template: { type: 'string', description: '模板库中的模板名（推荐，如全局模板 "gal_dialogue_card"）' },
          html: { type: 'string', description: '内联 HTML 正文（与 template 二选一）' },
          variables: { type: 'string', description: '变量值 JSON 对象字符串，如 {"chapterTitle":"第一章","caption":"角色名","text1":"对白..."}' },
          imageUrl: { type: 'string', description: '可选：静态图片地址（URL/Base64/本地路径）。若提供且无 prompt，直接显示该图；若同时提供 prompt 则作为参考图' },
          imgurl: { type: 'string', description: '可选：imageUrl 的别名' },
          prompt: { type: 'string', description: '可选：生图提示词。直接触发内置异步绘图并自动绑定至卡片' },
          imagePrompt: { type: 'string', description: '可选：prompt 的别名' },
          imageSize: { type: 'string', default: '1024x1024', description: '生图尺寸/比例，如 "1024x1024", "square", "portrait", "landscape"' },
          adapterId: { type: 'string', description: '可选：指定生图适配器名称，默认走系统当前默认生图通道' }
        },
        required: []
      }
    })
    this.func = this.execute.bind(this)
  }

  getDescription() {
    const defaultAdapter = imageService?.defaultInstanceId
      ? imageService.instances?.get(imageService.defaultInstanceId)
      : (imageService?.instances?.size > 0 ? Array.from(imageService.instances.values())[0] : null)

    const defaultType = defaultAdapter?.constructor?.getAdapterMetadata?.()?.type || defaultAdapter?.name || ''
    const isDefaultTagStyle = defaultType === 'tukuai-image' || defaultType === 'sd-webui'

    const promptGuidance = isDefaultTagStyle
      ? '（当前生图通道为 SD/NovelAI 类模型，prompt 建议使用英文逗号分隔的 Tag 词组，如: "1girl, solo, masterpiece, anime style, sunset"）'
      : '（prompt 支持中文/英文自然语言详细描述）'

    // 动态汇总全局模板：名称 + 一句话描述 + 逐字段中文含义（数据源为模板库 schema/variableDocs，与库内内容实时同步）
    const templateLines = []
    try {
      const globals = TemplateStore.list('global')
      for (const t of globals) {
        const schema = t.schema || {}
        const properties = schema.properties || {}
        const requiredSet = new Set(Array.isArray(schema.required) ? schema.required : [])
        const docs = t.variableDocs || {}

        const varKeys = Object.keys(properties).length > 0 ? Object.keys(properties) : (t.variables || [])
        const varParts = varKeys.map((v) => {
          const prop = properties[v] || {}
          const doc = docs[v] || {}
          const label = prop.description || (typeof doc === 'string' ? doc : doc.description) || ''
          const isReq = requiredSet.has(v) || Boolean(doc.required)
          const reqMark = isReq ? '*' : ''
          return label ? `${reqMark}${v}（${label}）` : `${reqMark}${v}`
        }).join('、')
        templateLines.push(`- 「${t.name}」: ${t.description || ''}${varParts ? ` ｜ 参数 Schema（*必填）：${varParts}` : ''}`)
      }
    } catch { /* 模板库暂不可读时仅降级为基础说明 */ }

    const templateSection = templateLines.length > 0
      ? `可用全局模板（字段已附 JSON Schema 含义，带 * 为必填；可用 manage_ui_templates 查看完整 schema）：\n${templateLines.join('\n')}`
      : ''

    return `渲染并发送交互式 UI 界面到消息流（Shadow DOM 独立渲染，支持 JS 交互）。\n【图片与生图双模支持】：\n- 直接传静态图：支持 imageUrl / imgurl（如已有图片链接）；\n- 自动异步生图：支持 prompt / imagePrompt${promptGuidance}，自动提交后台任务并输出卡片，图片绘制完成后 WebSocket 自动无缝回填；\n- 图生图重绘：同时传 imageUrl + prompt，将作为参考图重绘。\n${templateSection ? `\n${templateSection}` : ''}`
  }

  async execute(e) {
    const userId = e.user?.id || 'guest'
    const params = e.params || {}

    // 1. 解析 variables
    let vars = {}
    if (params.variables) {
      try {
        const parsed = typeof params.variables === 'string' ? JSON.parse(params.variables) : params.variables
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) vars = parsed
        else return { success: false, error: 'variables 必须是 JSON 对象，如 {"chapterTitle":"序章"}' }
      } catch {
        return { success: false, error: 'variables 不是合法 JSON 字符串' }
      }
    }

    // 2. 统一提取 prompt 与 imageUrl
    const rawPrompt = params.prompt || params.imagePrompt || vars.prompt || vars.imagePrompt || vars.image_prompt
    const rawImageUrl = params.imageUrl || params.imgurl || params.image_url || params.image ||
                        vars.imageUrl || vars.imgurl || vars.image_url || vars.image

    let taskId = null

    // 场景 A：有生图提示词 -> 提交异步生图任务
    if (rawPrompt && typeof rawPrompt === 'string' && rawPrompt.trim()) {
      try {
        const task = await imageService.createTask({
          prompt: rawPrompt.trim(),
          image: rawImageUrl || null, // 若同时有 imageUrl 则作为图生图参考图
          size: params.imageSize || vars.imageSize || '1024x1024'
        }, params.adapterId || vars.adapterId || null)

        taskId = task.taskId
        vars.taskId = taskId
        // 后端前后端解耦：不强塞任何假图 SVG，未完成前 imageUrl 保持为空或原参考图
        vars.imageUrl = rawImageUrl || ''
        vars.imgurl = rawImageUrl || ''
        vars.image_url = rawImageUrl || ''
      } catch (imgErr) {
        console.warn('[send_ui] Auto async image creation warning:', imgErr.message)
        vars.imageUrl = rawImageUrl || ''
        vars.imgurl = rawImageUrl || ''
        vars.image_url = rawImageUrl || ''
      }
    } else if (rawImageUrl) {
      // 场景 B：仅有静态图片 URL -> 直接使用静态图片
      vars.imageUrl = rawImageUrl
      vars.imgurl = rawImageUrl
      vars.image_url = rawImageUrl
      vars.taskId = ''
    } else {
      vars.imageUrl = ''
      vars.imgurl = ''
      vars.image_url = ''
      vars.taskId = ''
    }

    // 3. 读取模板正文
    let templateHtml = ''
    let usedTemplate = null
    if (params.template) {
      const stored = TemplateStore.get(userId, params.template)
      if (!stored) return { success: false, error: `模板「${params.template}」不存在，请先用 define_ui_template 定义，或改用 html 内联发送` }
      templateHtml = stored.html
      usedTemplate = stored.name
    } else if (params.html) {
      templateHtml = params.html
    } else {
      return { success: false, error: '必须提供 template（模板名）或 html（内联正文）' }
    }

    // 4. 模板变量渲染
    let renderedHtml = render(templateHtml, vars)

    // 5. 若有异步生图任务，确保容器或 img 挂载 data-task-id 属性以供前端 Shadow DOM 回填定位
    if (taskId && !renderedHtml.includes(`data-task-id="${taskId}"`)) {
      if (renderedHtml.includes('class="stage"')) {
        renderedHtml = renderedHtml.replace(
          /(<div\b[^>]*\bclass="[^"]*\bstage\b[^"]*"[^>]*)/i,
          `$1 data-task-id="${taskId}"`
        )
      } else {
        renderedHtml = renderedHtml.replace(
          /(<img\b(?![^>]*\bdata-task-id\b)[^>]*)/i,
          `$1 data-task-id="${taskId}"`
        )
      }
    }

    return {
      success: true,
      message: usedTemplate ? `UI「${usedTemplate}」已渲染` : 'UI 已渲染',
      rendered: true,
      taskId: taskId || undefined,
      extraRender: [{ type: 'html', html: renderedHtml, placement: 'outer' }]
    }
  }
}
