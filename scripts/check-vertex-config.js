#!/usr/bin/env node

import { getFullConfig } from '../lib/server/http/services/configService.js'

async function checkVertexConfig() {
  const config = await getFullConfig()
  const vertexInstance = config.llm_adapters?.vertex?.[0]
  
  console.log('Vertex 实例启用状态:', vertexInstance?.enable)
  console.log('Vertex 实例配置:', {
    name: vertexInstance?.name,
    enable: vertexInstance?.enable,
    region: vertexInstance?.region,
    has_service_account_json: !!vertexInstance?.service_account_json,
    manual_models_length: vertexInstance?.manual_models?.length || 0
  })
}

checkVertexConfig()