import Drawer from "./lib/draw.js";

const painter = new Drawer();

const prompt = "general, (sensitive), questionable, explicit, (1girl: 1.2), (box: 1.2), (sweater: 1.1), (long_hair), (tail), (blue_sweater), (on_side), (solo), long_sleeves, animal_ears, closed_eyes, sleeves_past_wrists, off_shoulder, lying, in_box, in_container, cardboard_box, snowflakes, fur_trim, gift_box, white_hair, sleeping, bangs, off-shoulder_sweater, parted_lips, bare_shoulders, very_long_hair, blush, gift, bottomless, puffy_long_sleeves, puffy_sleeves, wolf_tail, snow, snowing, animal_ear_fluff, ahoge, hair_between_eyes, cable_knit, feet_out_of_frame, food, dog_tail,"

const config = {
    model: "anything-v4.5-pruned.ckpt [65745d25]",
    width:512,
    height:512,
}

const result = await painter.draw("prodia.stablediffusion",prompt,config);

// const info = painter.getEngineInfo("prodia.stablediffusion")


console.log(result);

































// /* eslint-disable camelcase */
// import { prodia } from "./uils/ti.js";
// import fs from "fs";

// await prodia.stablediffusion({
//     prompt: "Kasugano Sora (Yosuga no sora),,,Zero Two(DARLING in the FRANXX),,year_2023,naga_u,henreader,usashiro_mani,[wlop],wanke,ciloranko,o (jshn3457),[[tianliang duohe fangdongye]],[[rhasta]], (1girl: 1.2), (cum_in_mouth), (long_hair), (breasts),  (blush), (ichinose_shiki),  open_mouth, cum, heart-shaped_pupils, symbol-shaped_pupils, heart, tears, finger_in_another's_mouth, cleavage, solo_focus, looking_at_viewer, tongue, cum_on_tongue, saliva, medium_breasts, large_breasts, hetero, pov,",
//     data: {
//         model: "anything-v4.5-pruned.ckpt [65745d25]",
//         sampling_steps: 30,
//         cfg_scale: 7,
//         width: 768,
//         height: 1024,
//         sampling_method: "DPM++ 2M Karras",
//         prompt_negative: "EasyNegative, lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, lowquality, normal quality, jpeg artifacts, signature, watermark, username, blurry"
//     }
// }, (err, data) => {
//     if (err != null) {
//         console.log(err);
//     } else {
//         const imgBase64 = data.images[0];
//         // 将 base64 编码的数据转换为 Buffer
//         // eslint-disable-next-line no-undef
//         const bufferData = Buffer.from(imgBase64.split(",")[1], "base64");

//         // 将 Buffer 写入到本地文件
//         fs.writeFile("image.jpg", bufferData, "base64", function (err) {
//             if (err) {
//                 console.error(err);
//             } else {
//                 console.log("图像已成功保存到本地文件：image.jpg");
//             }
//         });
//     }
// });