/* eslint-disable camelcase */
import express from "express";
import Drawer from "./draw.js";
import { convertJPGToPNGBase64 } from "./jpg2png.js";

const painter = new Drawer();

const logger = {
    info(req, msg) {
        const ip = req.headers["x-real-ip"] || req.connection.remoteAddress;
        console.log(`[${new Date().toISOString()}][INFO][${ip}] ${msg}`);
    },
    warn(req, msg) {
        const ip = req.headers["x-real-ip"] || req.connection.remoteAddress;
        console.log(`[${new Date().toISOString()}][WARN][${ip}] ${msg}`);
    },
    wrong(req, msg) {
        const ip = req.headers["x-real-ip"] || req.connection.remoteAddress;
        console.log(`[${new Date().toISOString()}][ERROR][${ip}] ${msg}`);
    }
};

function checkModel(engine, name) {
    const info = painter.getEngineInfo(engine)
    const models = info.models
    return models.filter(item => item.includes(name));
}


export function startServer() {
    const app = express();

    app.use(express.json({ limit: "1000kb" }));

    app.get("/api/:model/sdapi/v1/samplers", async (req, res) => {
        logger.info(req, "获取方法列表");
        const info = painter.getEngineMethod("prodia.stablediffusion");
        res.status(200).send(info);
    });


    // GET 请求处理
    app.get("/api/:model/sdapi/v1/upscalers", (req, res) => {
        logger.info(req, "获取采样方法列表");
        const info = { data: [] }
        res.status(200).send(info);
    });


    // GET 请求处理
    app.get("/api/:model/sdapi/v1/loras", (req, res) => {
        logger.info(req, "获取LoRa列表");
        const info = { data: [] }
        res.status(200).send(info);
    });

    // 不知道干啥的，ap要的
    app.get("/api/:model", (req, res) => {
        logger.info(req, "AP测试接口连通性");
        res.status(405).json({ data: { detail: "Method Not Allowed" } });
    });

    //定义路由
    app.post("/api/:model/sdapi/v1/txt2img", async (req, res) => {
        const engine = "prodia.stablediffusion";
        const model = req.params.model;
        const wholemodel = checkModel(engine, model);
        const data = req.body;
        const prompt = data.prompt;
        const config = {
            width: data.width,
            height: data.height,
            steps: data.steps,
            negative_prompt: data.negative_prompt,
            cfg_scale: data.cfg_scale,
            model: wholemodel,
            method: data.sampler_index,
            seed: data.seed
        }


        try {
            if (!data.prompt) {
                throw new Error("Invalid prompt");
            }

            if (!wholemodel) {
                throw new Error("Invalid model");
            } else {
                const beginTime = new Date().getTime();
                logger.info(req, `ip地址：${req.headers["x-real-ip"] || req.remoteAddress}的用户开始生成图片，使用模型：${model}，prompt：\n${prompt}`);
                const result = await painter.draw(engine, prompt, config);
                const endTime = new Date().getTime();
                logger.info(req, `ip地址：${req.headers["x-real-ip"] || req.remoteAddress}的用户图片生成完成，耗时：${(endTime - beginTime) / 1000}s`);
                if (result.code === 0) {
                    const png64 = await convertJPGToPNGBase64(result.path);

                    const responseData = {
                        images: [png64],
                        parameters: {
                            seed: data.seed,
                            sampler_index: config.method,
                            width: config.width,
                            height: config.height,
                            cfg_scale: config.cfg_scale,
                            prompt: prompt,
                            negative_prompt: config.negative_prompt,
                            steps: config.steps
                        }
                    }
                    res.status(200).send(responseData);
                } else {
                    res.status(500).send(result.msg);
                }
            }
        } catch (error) {
            logger.wrong(req, error);
            res.status(500).send("Internal Server Error");
        }
    });

    // 启动服务器
    const port = 3080;
    app.listen(port, () => {
        console.log(`[${new Date().toISOString()}][INFO][服务开启，端口：${port}]`);
    });
}

