import Prodia from "./draw/prodia.js";
import logger from "./logger.js";

export async function statusCheck(){
    // 检查Prodia服务状态
    logger.info("正在检查Prodia服务状态...");
    const prodia = new Prodia();
    prodia.initProdia();
}