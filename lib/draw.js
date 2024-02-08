/* eslint-disable camelcase */
import { prodia, pixart } from "../uils/ti.js";
import fs from "fs";
import path from "path";
// 获取当前模块的路径
const currentModulePath = new URL(import.meta.url).pathname;
const currentDirectory = path.dirname(currentModulePath);

const baseNega = "EasyNegative, lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, lowquality, normal quality, jpeg artifacts, signature, watermark, username, blurry";

// read & parse data from file ../config/draw.json
const data = JSON.parse(fs.readFileSync("config/draw.json", "utf8"));

export default class Drawer {
    constructor() {
        this.engines = data.engines.map((engine) => engine.name);
    }

    getEngineInfo(name) {
        if (this.engines.includes(name)) {
            const info = {
                models: data.engines.find((engine) => engine.name === name).models,
                methods: data.engines.find((engine) => engine.name === name).methods,
            }
            return info;
        } else {
            return null;
        }
    }

    async draw(engine, prompt, config) {
        let resultBase64 = null;
        let msg = "";
        switch (engine) {
        case "prodia.v1":
            try {
                const data = await new Promise((resolve, reject) => {
                    prodia.v1({
                        prompt: prompt,
                        data: {
                            model: config.model ? config.model : "absolutereality_V16.safetensors [37db0fc3]",
                            steps: config.steps ? config.steps : 25,
                            cfg_scale: config.scale ? config.scale : 7,
                            sampler: config.sampler ? config.sampler : "DPM++ 2M Karras",
                            negative_prompt: config.negative_prompt ? config.negative_prompt : baseNega,
                        }
                    }, (err, data) => {
                        if (err != null) {
                            reject(err);
                        } else {
                            resolve(data);
                        }
                    });
                });

                // console.log(data); // 可以在这里处理返回的数据
                console.log("使用" + engine + "完成了绘画！"); // 可以在这里处理返回的数据


                // 将data结果赋值给resultBase64
                resultBase64 = data.images[0];
            } catch (error) {
                console.log(error);
                msg = error

            }
            break;
        case "prodia.stablediffusion":
            try {
                const data = await new Promise((resolve, reject) => {
                    prodia.stablediffusion({
                        prompt: prompt,
                        data: {
                            model: config.model ? config.model : "absolutereality_V16.safetensors [37db0fc3]",
                            sampling_steps: config.steps ? config.steps : 25,
                            cfg_scale: config.scale ? config.scale : 7,
                            sampling_method: config.sampler ? config.sampler : "DPM++ 2M Karras",
                            prompt_negative: config.negative_prompt ? config.negative_prompt : baseNega,
                            width: config.width ? config.width : 768,
                            height: config.height ? config.height : 1024,
                        }
                    }, (err, data) => {
                        if (err != null) {
                            reject(err);
                        } else {
                            resolve(data);
                        }
                    });
                });

                // console.log(data); // 可以在这里处理返回的数据
                console.log("使用" + engine + "完成了绘画！"); // 可以在这里处理返回的数据


                // 将data结果赋值给resultBase64
                resultBase64 = data.images[0];
            } catch (error) {
                console.log(error);
                msg = error

            }
            break;
        case "prodia.stablediffusion_xl":
            try {
                const data = await new Promise((resolve, reject) => {
                    prodia.stablediffusion_xl({
                        prompt: prompt,
                        data: {
                            model: config.model ? config.model : "sd_xl_base_1.0.safetensors [be9edd61]",
                            sampling_steps: config.steps ? config.steps : 25,
                            cfg_scale: config.scale ? config.scale : 7,
                            sampling_method: config.sampler ? config.sampler : "DPM++ 2M Karras",
                            prompt_negative: config.negative_prompt ? config.negative_prompt : baseNega,
                            width: config.width ? config.width : 1024,
                            height: config.height ? config.height : 1024,
                        }
                    }, (err, data) => {
                        if (err != null) {
                            reject(err);
                        } else {
                            resolve(data);
                        }
                    });
                });

                // console.log(data); // 可以在这里处理返回的数据
                console.log("使用" + engine + "完成了绘画！"); // 可以在这里处理返回的数据


                // 将data结果赋值给resultBase64
                resultBase64 = data.images[0];
            } catch (error) {
                console.log(error);
                msg = error

            }
            break;
        case "pixart.a":
            try {
                const data = await new Promise((resolve, reject) => {
                    pixart.a({
                        prompt: prompt,
                        data: {
                            image_style: config.model ? config.model : "Anime",
                            sampler: config.sampler ? config.sampler : "DPM-Solver",
                            prompt_negative: config.negative_prompt ? config.negative_prompt : baseNega,
                            width: config.width ? config.width : 1024,
                            height: config.height ? config.height : 1024,
                            dpm_guidance_scale: config.dpm_guidance_scale ? config.dpm_guidance_scale : 4.5,
                            dpm_inference_steps: config.dpm_inference_steps ? config.dpm_inference_steps : 14,
                            sa_guidance_scale: config.sa_guidance_scale ? config.sa_guidance_scale : 3,
                            sa_inference_steps: config.sa_inference_steps ? config.sa_inference_steps : 25
                        }
                    }, (err, data) => {
                        if (err != null) {
                            reject(err);
                        } else {
                            resolve(data);
                        }
                    });
                });

                // console.log(data); // 可以在这里处理返回的数据
                console.log("使用" + engine + "完成了绘画！"); // 可以在这里处理返回的数据

                // 将data结果赋值给resultBase64
                resultBase64 = data.images[0];
            } catch (error) {
                console.log(error);
                msg = error

            }
            break;
        case "pixart.lcm":
            try {
                const data = await new Promise((resolve, reject) => {
                    pixart.lcm({
                        prompt: prompt,
                        data: {
                            image_style: config.model ? config.model : "Fantasy art",
                            prompt_negative: config.negative_prompt ? config.negative_prompt : baseNega,
                            width: config.width ? config.width : 1024,
                            height: config.height ? config.height : 1024,
                            lcm_inference_steps: config.lcm_inference_steps ? config.lcm_inference_steps : 9,
                        }
                    }, (err, data) => {
                        if (err != null) {
                            reject(err);
                        } else {
                            resolve(data);
                        }
                    });
                });

                console.log("使用" + engine + "完成了绘画！"); // 可以在这里处理返回的数据

                // 将data结果赋值给resultBase64
                resultBase64 = data.images[0];
            } catch (error) {
                console.log(error);
                msg = error
            }
            break;
        default:
            // 当 engine 不匹配任何 case 时执行的代码块
            return {
                code: 1,
                msg: "Invalid engine specified."
            }
        }
        const timestamp = new Date().getTime();
        const newFilename = `${timestamp}.jpg`;

        const fullPath = path.join(currentDirectory, "resources", "pics", newFilename);

        // 确保文件夹存在，如果不存在则创建
        const folderPath = path.dirname(fullPath);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }



        if (resultBase64 !== null) {
            // eslint-disable-next-line no-undef
            const bufferData = Buffer.from(resultBase64.split(",")[1], "base64");
            // rename the pic by timestamp & save in in ../resources/pics

            fs.writeFile(fullPath, bufferData, "base64", function (err) {
                if (err) {
                    console.error(err);
                } else {
                    console.log("图片已保存至" + `resources/pics/${newFilename}`);
                }
            });
        }

       
        return {
            code: resultBase64 == null ? 1 : 0,
            //path:获取当前目录，与`resources/pics/${newFilename}`拼接完整路径
            path: fullPath,
            base64: resultBase64,
            msg:msg
        }
    }
}