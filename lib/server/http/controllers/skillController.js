import skillService from '../../../chat/llm/services/SkillService.js'

class SkillController {
  async getSkills(req, res) {
    try {
      const catalog = skillService.getSkillCatalog()
      res.json({
        data: catalog,
        success: true
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      })
    }
  }

  async reloadSkills(req, res) {
    try {
      await skillService.initialize()
      const catalog = skillService.getSkillCatalog()
      res.json({
        data: catalog,
        success: true
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      })
    }
  }
}

export default new SkillController()
