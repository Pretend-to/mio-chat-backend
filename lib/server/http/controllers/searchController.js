import { makeStandardResponse } from '../utils/responseFormatter.js'
import { searchService } from '../../../chat/search/SearchService.js'
import { SearchRegistry } from '../../../chat/search/SearchRegistry.js'

export async function getSearchAdapters(req, res) {
  try {
    const { default: prismaManager } = await import('../../../database/prisma.js')
    const prisma = await prismaManager.initialize()
    const list = prisma?.searchAdapter ? await prisma.searchAdapter.findMany({ orderBy: { createdAt: 'desc' } }) : []
    const availableTypes = SearchRegistry.getConfigurableMetadata()
    const fallbackEngines = SearchRegistry.getFallbackMetadata()
    res.json(makeStandardResponse({ adapters: list, availableTypes, fallbackEngines }))
  } catch (error) {
    res.status(500).json({ code: 1, message: error.message })
  }
}

export async function createSearchAdapter(req, res) {
  try {
    const { adapterType, instanceName, configData, enabled = true, isDefault = false } = req.body
    const { default: prismaManager } = await import('../../../database/prisma.js')
    const prisma = await prismaManager.initialize()

    if (isDefault) {
      await prisma.searchAdapter.updateMany({ where: {}, data: { isDefault: false } })
    }

    const created = await prisma.searchAdapter.create({
      data: {
        adapterType,
        instanceName,
        configData: typeof configData === 'string' ? configData : JSON.stringify(configData || {}),
        enabled,
        isDefault
      }
    })

    await searchService.reloadConfigsFromDb()
    res.json(makeStandardResponse(created))
  } catch (error) {
    res.status(500).json({ code: 1, message: error.message })
  }
}

export async function updateSearchAdapter(req, res) {
  try {
    const { id } = req.params
    const { instanceName, configData, enabled, isDefault } = req.body
    const { default: prismaManager } = await import('../../../database/prisma.js')
    const prisma = await prismaManager.initialize()

    if (isDefault) {
      await prisma.searchAdapter.updateMany({ where: {}, data: { isDefault: false } })
    }

    const updateData = {}
    if (instanceName !== undefined) updateData.instanceName = instanceName
    if (configData !== undefined) updateData.configData = typeof configData === 'string' ? configData : JSON.stringify(configData)
    if (enabled !== undefined) updateData.enabled = enabled
    if (isDefault !== undefined) updateData.isDefault = isDefault

    const updated = await prisma.searchAdapter.update({
      where: { id: Number(id) },
      data: updateData
    })

    await searchService.reloadConfigsFromDb()
    res.json(makeStandardResponse(updated))
  } catch (error) {
    res.status(500).json({ code: 1, message: error.message })
  }
}

export async function deleteSearchAdapter(req, res) {
  try {
    const { id } = req.params
    const { default: prismaManager } = await import('../../../database/prisma.js')
    const prisma = await prismaManager.initialize()

    await prisma.searchAdapter.delete({ where: { id: Number(id) } })
    await searchService.reloadConfigsFromDb()
    res.json(makeStandardResponse({ deleted: true }))
  } catch (error) {
    res.status(500).json({ code: 1, message: error.message })
  }
}

export async function testSearch(req, res) {
  try {
    const { query = 'MioChat AI', adapterId, count = 5 } = req.body
    const responseData = await searchService.search({ query, count }, adapterId)
    const results = Array.isArray(responseData) ? responseData : (responseData.results || [])
    const answer = responseData.answer || null
    res.json(makeStandardResponse({ results, answer, query }))
  } catch (error) {
    res.status(500).json({ code: 1, message: error.message })
  }
}
