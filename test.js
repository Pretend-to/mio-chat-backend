/* eslint-disable camelcase */
import { prodia } from "gpti";
import fs from "fs";

prodia.stablediffusion({
    prompt: "(((best quality))),((masterpiece)),(((illustration))),(((an extremely delicate and beautiful girl))),(((1 girl))),((beautiful detailed eyes)),long hair,(((pink hair))),(high_ponytail),blue eyes,(black thighhighs),(((large breasts))),((business_suit)),((nsfw))",
    data: {
        model: "cuteyukimixAdorable_midchapter3.safetensors [04bdffe6]",
        sampling_steps: 30,
        cfg_scale: 7,
        width: 768,
        height: 1024,
        sampling_method: "DPM++ 2M Karras",
        prompt_negative: "EasyNegative, nsfw, lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, lowquality, normal quality, jpeg artifacts, signature, watermark, username, blurry"
    }
}, (err, data) => {
    if (err != null) {
        console.log(err);
    } else {
        // 保存生成的图像数据为jpg文件
        fs.writeFile("./result.jpg", data, "base64", (err) => {
            if (err) {
                console.error(err);
            } else {
                console.log("图像已成功保存为result.jpg");
            }
        });
    }
});
