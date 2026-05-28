export const GEMINI_SAFETY_SETTINGS_SCHEMA = {
  safetySettings: {
    type: 'group',
    label: '安全过滤设置',
    fields: {
      HARM_CATEGORY_HARASSMENT: {
        type: 'select',
        label: '骚扰内容',
        default: 'BLOCK_NONE',
        options: [
          { label: '不阻止', value: 'BLOCK_NONE' },
          { label: '仅阻止高可能性', value: 'BLOCK_ONLY_HIGH' },
          { label: '阻止中等及以上', value: 'BLOCK_MEDIUM_AND_ABOVE' },
          { label: '最严格', value: 'BLOCK_LOW_AND_ABOVE' },
        ],
      },
      HARM_CATEGORY_HATE_SPEECH: {
        type: 'select',
        label: '仇恨言论',
        default: 'BLOCK_NONE',
        options: [
          { label: '不阻止', value: 'BLOCK_NONE' },
          { label: '仅阻止高可能性', value: 'BLOCK_ONLY_HIGH' },
          { label: '阻止中等及以上', value: 'BLOCK_MEDIUM_AND_ABOVE' },
          { label: '最严格', value: 'BLOCK_LOW_AND_ABOVE' },
        ],
      },
      HARM_CATEGORY_SEXUALLY_EXPLICIT: {
        type: 'select',
        label: '色情内容',
        default: 'BLOCK_NONE',
        options: [
          { label: '不阻止', value: 'BLOCK_NONE' },
          { label: '仅阻止高可能性', value: 'BLOCK_ONLY_HIGH' },
          { label: '阻止中等及以上', value: 'BLOCK_MEDIUM_AND_ABOVE' },
          { label: '最严格', value: 'BLOCK_LOW_AND_ABOVE' },
        ],
      },
      HARM_CATEGORY_DANGEROUS_CONTENT: {
        type: 'select',
        label: '危险内容',
        default: 'BLOCK_NONE',
        options: [
          { label: '不阻止', value: 'BLOCK_NONE' },
          { label: '仅阻止高可能性', value: 'BLOCK_ONLY_HIGH' },
          { label: '阻止中等及以上', value: 'BLOCK_MEDIUM_AND_ABOVE' },
          { label: '最严格', value: 'BLOCK_LOW_AND_ABOVE' },
        ],
      },
    },
  },
}
