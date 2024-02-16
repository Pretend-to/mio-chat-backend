/* eslint-disable camelcase */
import express from "express";
import Drawer from "./draw.js";
import { getPNGBase64 } from "./imgtools.js";
import logger from "./logger.js";
import { savePic } from "./stroge.js";
import rateLimit from "express-rate-limit";


const painter = new Drawer();
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 requests per windowMs
    message: "此IP请求过多，请稍后再试"
});

function checkModel(engine, name) {
    const model = name.startsWith("mj")? name.substring(2) : name;
    const info = painter.getEngineInfo(engine);
    const models = info.models;
    return models.find(item => item.includes(model));
}

export function startServer() {
    const app = express();
    app.set("trust proxy", true);
    app.use(express.json({ limit: "1000kb" }));

    app.use((req, res, next) => {
        const ip = logger.getIP(req);
        if (ip !== "127.0.0.1") {
            limiter(req, res, () => {
                const remainingRequests = res.getHeader("X-RateLimit-Remaining");
                logger.info(`本分钟请求次数: ${10 - remainingRequests}, 剩余次数: ${remainingRequests}`,req);
                next();
            });
        } else {
            next();
        }
    });

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
        let model = req.params.model;
        let engine
        if (model.startsWith("mj"))
        {
            engine = "pixart.a"
            if (model === "mjDefault") model = "(No style)"
        }else{
            engine = "prodia.stablediffusion"
        }
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
                    const png64 = await getPNGBase64(result.base64);

                    // 保存图片到本地
                    const save = await savePic(result.base64,engine,model)
                    if (save.error) {
                        logger.wrong("图片保存到本地失败" + save.error);
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

    app.post("/api/:model/sdapi/v1/img2img", async (req, res) => {
        let model = req.params.model;
        let engine = "prodia.stablediffusion";
        let config
        const wholemodel = checkModel("prodia.stablediffusion", model);
        if (model == "upscale")
        {
            engine = "prodia.biggerimg"
        }
        const data = req.body;
        const prompt = data.prompt;
        const imgdata = data.init_images[0];

        if (prompt == "2" || prompt == "4"){
            config = {
                base64: imgdata.split(",")[1],
                prompt: prompt,
                width: data.width,
                height: data.height,
                steps: data.steps,
                negative_prompt: data.negative_prompt,
                cfg_scale: data.cfg_scale,
                model: wholemodel,
                method: data.sampler_index,
                seed: data.seed
            }
        }
        else{
            config = {
                base64: imgdata.split(",")[1],
                width: data.width,
                height: data.height,
                steps: data.steps,
                negative_prompt: data.negative_prompt,
                cfg_scale: data.cfg_scale,
                model: wholemodel,
                method: data.sampler_index,
                seed: data.seed
            }
        }
        

        try {
            if (!wholemodel && model !== "upscale") {
                throw new Error("Invalid model");
            } else {
                logger.info(`收到 Web 图生图请求\n使用模型：${wholemodel ? wholemodel : model}\n分辨率：${data.width}x${data.height}\nprompt：\n${prompt}`,req);
                const result = await painter.draw(engine, prompt, config);
                if (result.code === 0) {
                    const png64 = await getPNGBase64(result.base64);

                    // 保存图片到本地
                    const save = await savePic(result.base64,engine,model)
                    if (save.error) {
                        logger.wrong("图片保存到本地失败" + save.error);
                    }else{
                        logger.info("图片保存到本地成功" + save.path);
                    }

                    const responseData = {
                        images: [png64],
                        parameters: {
                            seed: data.seed,
                            sampler_index: config.method,
                            width: model === "upscale" ? prompt === "2" ? config.width * 2 : config.width * 4 : config.width, 
                            height: model === "upscale" ? prompt === "2" ? config.height * 2 : config.height * 4 : config.height,
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
        logger.info(`服务开启，端口：${port}`);
    });
}

