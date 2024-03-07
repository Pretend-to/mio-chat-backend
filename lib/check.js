import Prodia from "./prodia.js";
import logger from "./logger.js";

export async function statusCheck(){
    logger.info("正在检查Prodia服务状态...");
    const prodia = new Prodia();
    const apiAvailable = await prodia.testApi();
    const keyAvailable = prodia.key;
    if(apiAvailable && keyAvailable){
        logger.info("Prodia服务正常运行中...");
    }else if(!apiAvailable){
        logger.error("Prodia API不可用，请检查网络连接或联系Prodia客服...");
    }else{
        logger.error("Prodia API密钥不可用，请检查Prodia API密钥是否正确..."); 
    }
}