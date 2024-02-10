/* eslint-disable camelcase */
import express from "express";
import Drawer from "./draw.js";
import morgan from "morgan";
import { convertJPGToPNGBase64 } from "./jpg2png.js";

const painter = new Drawer();

function checkModel(engine, name) {
    const info = painter.getEngineInfo(engine)
    const models = info.models
    return models.filter(item => item.includes(name));
}


export function startServer() {
    const app = express();

    app.use(morgan("combined"));
    app.use(express.json({ limit: "1000kb" }));

    app.get("/api/:model/sdapi/v1/samplers", async (req, res) => {
        console.log("获取模型方法");
        const info = painter.getEngineMethod("prodia.stablediffusion");
        res.status(200).send(info);
    });


    // GET 请求处理
    app.get("/api/:model/sdapi/v1/upscalers", (req, res) => {
        const info = { data: [] }
        res.status(200).send(info);
    });


    // GET 请求处理
    app.get("/api/:model/sdapi/v1/loras", (req, res) => {
        const info = { data: [] }
        res.status(200).send(info);
    });

    // 不知道干啥的，ap要的
    app.get("/api/:model", (req, res) => {
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
            model: model,
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
                const result = await painter.draw(engine, prompt, config);
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
            console.error(error);
            res.status(500).send("Internal Server Error");
        }
    });

    // 启动服务器
    const port = 3080;
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}

