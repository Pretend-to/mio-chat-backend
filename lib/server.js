/* eslint-disable camelcase */
import express from "express";
import Drawer from "./draw.js";
import morgan from "morgan";
import { convertJPGToPNGBase64 } from "./jpg2png.js";


const painter = new Drawer();

function getModel(engine, name) {
    const models = painter.getEngineInfo(engine).models;
    for (let model of models) {
        if (model.includes(name)) {
            return model;
        }
    }

    return null;

}


export function startServer() {
    const app = express();

    app.use(morgan("combined"));
    app.use(express.json({ limit: "1000kb" }));

    app.get("/api/:model/sdapi/v1/samplers", async (req, res) => {
        console.log("获取模型方法");
        const info = painter.getEngineInfo("prodia.stablediffusion");
        res.status(200).send(info.methods);
    });
    

    // GET 请求处理
    app.get("/api/:model", (req, res) => {
        res.status(405).json({ data: { detail: "Method Not Allowed" } });
    });


    //定义路由
    app.post("/api/:model/sdapi/v1/txt2img", async (req, res) => {
        const engine = "prodia.stablediffusion";
        const model = req.params.model;
        const wholeModel = getModel(engine, model);
        const data = req.body;
        const prompt = data.prompt;
        const config = {
            width: data.width,
            height: data.height,
            steps: data.sampling_steps,
            negative_prompt: data.negative_prompt,
            cfg_scale: data.cfg_scale,
            model: wholeModel,
        }

        if (!data.prompt) {
            res.status(400).send("Invalid prompt");
            return;
        }

        if (!wholeModel) {
            res.status(400).send("Invalid model");
            return;
        } else {
            const result = await painter.draw(engine, prompt, config)
            if (result.code === 0) {

                const png64 = await convertJPGToPNGBase64(result.path);

                const data = {
                    images: [png64],
                    parameters: {
                        seed: "mio"
                    }
                }
                // console.log(data)
                res.status(200).send(data);
            } else {
                res.status(500).send(result.msg);
            }
        }

    });

    // 启动服务器
    const port = 3080;
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}

