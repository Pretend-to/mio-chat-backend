import { prodia } from "gpti";
import fs from "fs";

prodia.stablediffusion({
    prompt: "Friends gathered around a bonfire in an ancient forest. Laughter, stories, and a starry sky paint an unforgettable moment of connection beneath the shadows of the mountains.",
    data: {
        prompt_negative: "",
        model: "anythingv3_0-pruned.ckpt [2700c435]",
        sampling_method: "DPM++ 2M Karras",
        sampling_steps: 25,
        width: 512,
        height: 512,
        cfg_scale: 7
    }
}, (err, data) => {
    if (err != null) {
        console.log(err);
    } else {
        // 保存生成的图像数据为jpg文件
        fs.writeFile('./result.jpg', data, 'base64', (err) => {
            if (err) {
                console.error(err);
            } else {
                console.log('图像已成功保存为result.jpg');
            }
        });
    }
});
