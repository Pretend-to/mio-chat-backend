import logger from './path/to/logger'; // Assuming logger is imported from somewhere

class shareService {
  constructor() {
    this.shareData = new Map();
  }


  async createShare(shareId, contactor) {
    this.shareData.set(parseInt(shareId), contactor);
    const shareUrl = `/chat/0?shareId=${shareId}`;
    logger.debug(`Created share data for: ${shareId}`); // Updated logger message
    return {
      shareUrl
    };
  }


  async getShare(shareId) {
    logger.debug(`获取分享数据: ${shareId}`);
    const contactor = this.shareData.get(parseInt(shareId));
    if (!contactor) {
      throw new Error('分享数据不存在');
    }
    return {
      contactor,
    };
  }
}

export default new shareService();