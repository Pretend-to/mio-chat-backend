/* eslint-disable camelcase */
/* eslint-disable no-undef */
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import logger from "../logger.js";
import config from "../config.js";

const savePic = async (pic, engine, model) => {
    try {
        const shortModel = model.includes("[") ? model.split(" [")[0] : model;
        let buffer;

        if (pic.startsWith("http")) {
            const response = await fetch(pic);
            const arrayBuffer = await response.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
        } else {
            buffer = Buffer.from(pic.split(",")[1], "base64");
        }

        const outputDir = path.join("./output", engine, shortModel);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const timestamp = new Date().getTime();
        const outPath = path.join(outputDir, timestamp + ".jpg");
        fs.writeFileSync(outPath, buffer);

        return { error: false, path: outPath };
    } catch (error) {
        console.log(error);
        return { error: error, path: null };
    }
};

const getPNGBase64 = async (url,id) => {
    try {
        let final_url = url;
        const proxy_pass = config.config.proxy.PROXY_PASS? config.config.proxy.PROXY_PASS : "";
        if (proxy_pass && final_url.startsWith("https://images.prodia.xyz")) {
            // exchange https://images.prodia.xyz to proxy_pass
            final_url = final_url.replace("https://images.prodia.xyz", proxy_pass);
            logger.info(`使用反向代理 ${proxy_pass} 获取图片`);
        }

        const startTime1 = Date.now();
        const response = await fetch(final_url);
        const endTime1 = Date.now();
        const elapsedTime1 = endTime1 - startTime1;
        logger.info(`[${id}] 结果获取耗时：${elapsedTime1}ms`);

        const startTime2 = Date.now();
        const arrayBuffer = await response.arrayBuffer();
        const endTime2 = Date.now();
        const elapsedTime2 = endTime2 - startTime2;
        logger.info(`[${id}] PNG-Base64转换耗时：${elapsedTime2}ms`);
        const buffer = Buffer.from(arrayBuffer);
        const base64String = "data:image/png;base64," + buffer.toString("base64");

        return base64String;
    } catch (error) {
        logger.error(error);
        return null;
    }
};

export { getPNGBase64, savePic };
