/* eslint-disable camelcase */
import { pixart } from "../uils/ti.js";
import fs from "fs";
import logger from "./logger.js";
import Prodia from "./draw/prodia.js";

const baseNega = "EasyNegative, lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, lowquality, normal quality, jpeg artifacts, signature, watermark, username, blurry";

// read & parse data from file ../config/draw.json
const data = JSON.parse(fs.readFileSync("config/draw.json", "utf8"));

export default class Drawer {
    constructor() {
        this.engines = data.engines.map((engine) => engine.name);
        this.prodia = new Prodia();
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

    getEngineMethod(name) {
        if (this.engines.includes(name)) {
            const list = data.engines.find((engine) => engine.name === name).methods
            const info = Object.values(list).map(item => ({ name: item }));
            return info;
        } else {
            return null;
        }
    }

    async draw(engine, prompt, config) {

        // 获取一个5位的的随机数作为画图标识
        const random = Math.floor(Math.random() * 100000) + 1;
        const id = "draw_" + random;

        const beginTime = new Date().getTime(); // 开始时间
        logger.info("[" + id + "] 开始使用" + engine + "-" + config.model + "进行绘画...");

        let result = {
            type: null,
            data: null,
            config: null,
        };
        switch (engine) {
        case "prodia.v1":
            try {
                const data = {
                    ...config,
                    prompt: prompt ? prompt : "highquality, 4k",
                    sampler: config.sampler_index ? config.sampler_index : "DPM++ 2M Karras",
                }

                const imgUrl = await this.prodia.getText2Img(data);

                logger.info("[" + id + "] 使用" + engine + "-" + config.model + "完成了文生图！"); // 可以在这里处理返回的数据

                // 将data结果赋值给resultBase64
                result.data = imgUrl;
                result.type = "url";
                result.config = data;
            } catch (error) {
                logger.error(error);
            }
            break;
        case "prodia.xl":
            try {
                const resolution = [config.width, config.height];
                const closestResolution = this.findClosestResolution(resolution);

                const data = {
                    prompt: prompt ? prompt : "highquality, 4k",
                    model: config.model ? config.model : "animagineXLV3_v30.safetensors [75f2f05b]",
                    negative_prompt: config.negative_prompt ? config.negative_prompt : baseNega,
                    steps: config.steps ? config.steps : 25,
                    cfg_scale: config.scale ? config.scale : 7,
                    sampler: config.sampler_index ? config.sampler_index : "DPM++ 2M Karras",
                    width: closestResolution[0],
                    height: closestResolution[1],
                    seed: config.seed ? config.seed : -1,
                }

                const imgUrl = await this.prodia.getText2Img(data, "xl");

                logger.info("[" + id + "] 使用" + engine + "-" + config.model + "完成了文生图！"); // 可以在这里处理返回的数据

                // 将data结果赋值给resultBase64
                result.data = imgUrl;
                result.type = "url";
                result.config = data;
            } catch (error) {
                logger.error(error);
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
                logger.info("使用" + engine + "-" + config.model + "完成了绘画！"); // 可以在这里处理返回的数据

                result.data = data.images[0];
                result.type = "base64";
                result.config = {
                    prompt: prompt,
                    sampler_index: config.sampler_index,
                    prompt_negative: config.negative_prompt,
                    width: config.width,
                    height: config.height
                }
            } catch (error) {
                logger.error(error);
            }
            break;
        case "prodia.upscale.img2img":
            try {
                // 如果prompt不是2或4，变成2
                const resize = prompt === "2" || prompt === "4" ? prompt : "2";

                const data = {
                    resize: Number(resize),
                    imageData: config.base64 ? config.base64 : null,
                }

                const imgUrl = await this.getUpscaleImg(data);
                logger.info("使用" + engine + "-" + config.model + "完成了图片放大！"); // 可以在这里处理返回的数据

                // 将data结果赋值给resultBase64
                result.data = imgUrl;
                result.type = "url";
                result.config = {
                    prompt: `图片放大 ${resize}x`,
                    negative_prompt: "114514",
                    steps: "114514",
                    cfg_scale: "114514",
                    sampler: "114514",
                    width: "114514",
                    height: "114514",
                    seed: "114514",
                }
            } catch (error) {
                logger.error(error);
            }
            break;
        case "prodia.v1.img2img":
            try {
                const data = {
                    prompt: prompt ? prompt : "highquality, 4k",
                    imageData: config.base64 ? config.base64 : null,
                    model: config.model ? config.model : "meinamix_meinaV11.safetensors [b56ce717]",
                    negative_prompt: config.negative_prompt ? config.negative_prompt : baseNega,
                    steps: config.steps ? config.steps : 25,
                    cfg_scale: config.scale ? config.scale : 7,
                    sampler: config.sampler ? config.sampler : "DPM++ 2M Karras",
                    width: config.width ? config.width : 576,
                    height: config.height ? config.height : 1024,
                    denoising_strength : 0.55,
                    seed: config.seed ? config.seed : -1,
                }

                const imgUrl = await this.prodia.getImg2Img(data);

                logger.info("[" + id + "] 使用" + engine + "-" + config.model + "完成了图生图！"); // 可以在这里处理返回的数据

                // 将data结果赋值给resultBase64
                result.data = imgUrl;
                result.type = "url";
                result.config = data;
            } catch (error) {
                logger.error(error);
            }
            break;
        case "prodia.xl.img2img":
            try {
                const resolution = [config.width, config.height];
                const closestResolution = this.findClosestResolution(resolution);

                const data = {
                    prompt: prompt ? prompt : "highquality, 4k",
                    imageData: config.base64 ? config.base64 : null,
                    model: config.model ? config.model : "meinamix_meinaV11.safetensors [b56ce717]",
                    negative_prompt: config.negative_prompt ? config.negative_prompt : baseNega,
                    steps: config.steps ? config.steps : 25,
                    cfg_scale: config.scale ? config.scale : 7,
                    sampler: config.sampler ? config.sampler : "DPM++ 2M Karras",
                    width: closestResolution[0],
                    height: closestResolution[1],
                    denoising_strength: config.denoising_strength ? config.denoising_strength : 0.55,
                    seed: config.seed ? config.seed : -1,
                }

                const imgUrl = await this.prodia.getImg2Img(data, "xl");

                logger.info("[" + id + "] 使用" + engine + "-" + config.model + "完成了图生图！"); // 可以在这里处理返回的数据

                // 将data结果赋值给resultBase64
                result.data = imgUrl;
                result.type = "url";
                result.config = data;
            } catch (error) {
                logger.error(error);
            }
            break;
        default:
            logger.error("无效的引擎请求");
            // 当 engine 不匹配任何 case 时执行的代码块
            return {
                code: 1,
                msg: "Invalid engine specified."
            }
        }

        const endTime = new Date().getTime(); // 结束时间
        const time = endTime - beginTime; // 绘画耗时
        logger.info("[" + id + "] 绘画耗时：" + time + "ms");

        return {
            code: result.data !== null ? 0 : 1, // 表示绘画成功或失败
            id: id,
            result: {
                ...result
            },
        }
    }

    findClosestResolution(resolution) {
        const targetAspectRatio = resolution[0] / resolution[1];
        const resolutions = [
            [1024, 1024],
            [1152, 896],
            [1216, 832],
            [1344, 768],
            [1536, 640],
            [640, 1536],
            [768, 1344],
            [832, 1216]
        ];
    
        let minDiff = Number.MAX_VALUE;
        let closestResolution = resolutions[0];
    
        for (let i = 0; i < resolutions.length; i++) {
            const currentResolution = resolutions[i];
            const currentAspectRatio = currentResolution[0] / currentResolution[1];
            const diff = Math.abs(currentAspectRatio - targetAspectRatio);
    
            if (diff < minDiff) {
                minDiff = diff;
                closestResolution = currentResolution;
            }
        }
    
        return closestResolution;
    }
    
}