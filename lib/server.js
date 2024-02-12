/* eslint-disable camelcase */
import express from "express";
import Drawer from "./draw.js";
import { convertJPGToPNGBase64 } from "./jpg2png.js";
import logger from "./logger.js";
import { savePic } from "./stroge.js";

const painter = new Drawer();


function checkModel(engine, name) {
    const info = painter.getEngineInfo(engine);
    const models = info.models;
    return models.find(item => item.includes(name));
}

export function startServer() {
    const app = express();

    app.use(express.json({ limit: "1000kb" }));

    app.get("/api/:model/sdapi/v1/samplers", async (req, res) => {
        logger.info( "获取方法列表",req);
        const info = painter.getEngineMethod("prodia.stablediffusion");
        res.status(200).send(info);
    });


    // GET 请求处理
    app.get("/api/:model/sdapi/v1/upscalers", (req, res) => {
        logger.info( "获取放大方法列表",req);
        const info = { data: [] }
        res.status(200).send(info);
    });


    // GET 请求处理
    app.get("/api/:model/sdapi/v1/loras", (req, res) => {
        logger.info( "AP获取LoRa列表",req);
        const info = { data: [{name:"lakjsdliashdoashcoaishcapsca"}] }
        res.status(200).send(info);
    });

    // 不知道干啥的，ap要的
    app.get("/api/:model", (req, res) => {
        logger.info( "AP检查接口有效性",req);
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
                logger.info(`收到 Web 绘图请求\n使用模型：${wholemodel}\n分辨率：${config.width}x${config.height}\nprompt：\n${prompt}`,req);
                const result = await painter.draw(engine, prompt, config);
                if (result.code === 0) {
                    const png64 = await convertJPGToPNGBase64(result.base64);

                    // 保存图片到本地
                    const save = savePic(result.base64,engine,model)
                    if (save.error) {
                        logger.error("图片保存到本地失败" + save.error);
                    }else{
                        logger.info("图片保存到本地成功" + save.path);
                    }

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
                    res.status(500).send("Internal Server Error");
                }
            }
        } catch (error) {
            logger.wrong(error,req);
            res.status(500).send("Internal Server Error");
        }
    });

    // 启动服务器
    const port = 3080;
    app.listen(port, () => {
        console.log(`[${new Date().toISOString()}][INFO][服务开启，端口：${port}]`);
    });
}

