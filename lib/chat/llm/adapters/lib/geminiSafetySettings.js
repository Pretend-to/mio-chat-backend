export const GEMINI_SAFETY_SETTINGS_SCHEMA = {
  safetySettings: {
    fields: {
      HARM_CATEGORY_DANGEROUS_CONTENT: {
        default: 'BLOCK_NONE',
        label: '危险内容',
        options: [
          { label: '不阻止', value: 'BLOCK_NONE' },
          { label: '仅阻止高可能性', value: 'BLOCK_ONLY_HIGH' },
          { label: '阻止中等及以上', value: 'BLOCK_MEDIUM_AND_ABOVE' },
          { label: '最严格', value: 'BLOCK_LOW_AND_ABOVE' },
        ],
        type: 'select',
      },
      HARM_CATEGORY_HARASSMENT: {
        default: 'BLOCK_NONE',
        label: '骚扰内容',
        options: [
          { label: '不阻止', value: 'BLOCK_NONE' },
          { label: '仅阻止高可能性', value: 'BLOCK_ONLY_HIGH' },
          { label: '阻止中等及以上', value: 'BLOCK_MEDIUM_AND_ABOVE' },
          { label: '最严格', value: 'BLOCK_LOW_AND_ABOVE' },
        ],
        type: 'select',
      },
      HARM_CATEGORY_HATE_SPEECH: {
        default: 'BLOCK_NONE',
        label: '仇恨言论',
        options: [
          { label: '不阻止', value: 'BLOCK_NONE' },
          { label: '仅阻止高可能性', value: 'BLOCK_ONLY_HIGH' },
          { label: '阻止中等及以上', value: 'BLOCK_MEDIUM_AND_ABOVE' },
          { label: '最严格', value: 'BLOCK_LOW_AND_ABOVE' },
        ],
        type: 'select',
      },
      HARM_CATEGORY_SEXUALLY_EXPLICIT: {
        default: 'BLOCK_NONE',
        label: '色情内容',
        options: [
          { label: '不阻止', value: 'BLOCK_NONE' },
          { label: '仅阻止高可能性', value: 'BLOCK_ONLY_HIGH' },
          { label: '阻止中等及以上', value: 'BLOCK_MEDIUM_AND_ABOVE' },
          { label: '最严格', value: 'BLOCK_LOW_AND_ABOVE' },
        ],
        type: 'select',
      },
    },
    label: '安全过滤设置',
    type: 'group',
  },
}
