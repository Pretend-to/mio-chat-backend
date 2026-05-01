import skillService from '../../../chat/llm/services/SkillService.js'

class SkillController {
  async getSkills(req, res) {
    try {
      const catalog = skillService.getSkillCatalog()
      res.json({
        success: true,
        data: catalog
      })
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      })
    }
  }

  async reloadSkills(req, res) {
    try {
      await skillService.initialize()
      const catalog = skillService.getSkillCatalog()
      res.json({
        success: true,
        data: catalog
      })
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      })
    }
  }
}

export default new SkillController()
