/* eslint-disable camelcase */
import Drawer from "../lib/draw.js";
import yaml from "js-yaml";
import fs from "fs";

const painter = new Drawer();

// const info = painter.getEngineInfo("prodia.stablediffusion");

const list_2 = [
    "3Guofeng3_v34.safetensors [50f420de]",
    "absolutereality_V16.safetensors [37db0fc3]",
    "anythingv3_0-pruned.ckpt [2700c435]",
    "anything-v4.5-pruned.ckpt [65745d25]",
    "anythingV5_PrtRE.safetensors [893e49b9]",
    "AOM3A3_orangemixs.safetensors [9600da17]",
    "blazing_drive_v10g.safetensors [ca1c1eab]",
    "cetusMix_Version35.safetensors [de2f2560]",
    "childrensStories_v1SemiReal.safetensors [a1c56dbb]",
    "Counterfeit_v30.safetensors [9e2a8f19]",
    "cuteyukimixAdorable_midchapter3.safetensors [04bdffe6]",
    "dalcefo_v4.safetensors [425952fe]",
    "pastelMixStylizedAnime_pruned_fp16.safetensors [793a26e8]",
    "dreamshaper_6BakedVae.safetensors [114c8abb]",
    "EimisAnimeDiffusion_V1.ckpt [4f828a15]",
    "elldreths-vivid-mix.safetensors [342d9d26]",
    "lyriel_v16.safetensors [68fceea2]",
    "mechamix_v10.safetensors [ee685731]",
    "meinamix_meinaV9.safetensors [2ec66ab0]",
    "meinamix_meinaV11.safetensors [b56ce717]"
]

const list_22 = list_2.map(item => {
    item = item.split(".")[0];
    return {
        url: `http://127.0.0.1:3080/api/${item}`,
        remark: "[二次元][" + item + "]",
        account_id: "",
        account_password: "",
        token: ""
    }
})

const list_25 = [
    "neverendingDream_v122.safetensors [f964ceeb]",
    "dreamshaper_7.safetensors [5cf5ae06]",
    "dreamshaper_8.safetensors [9d40847d]",
    "edgeOfRealism_eorV20.safetensors [3ed5de15]",
    "revAnimated_v122.safetensors [3f4fefd9]",
    "rundiffusionFX25D_v10.safetensors [cd12b0ee]",
    "rundiffusionFX_v10.safetensors [cd4e694d]",
    "shoninsBeautiful_v10.safetensors [25d8c546]",
    "toonyou_beta6.safetensors [980f6b15]",
    "absolutereality_v181.safetensors [3d9d4d2b]",
    "childrensStories_v13D.safetensors [9dfaabcb]",
    "childrensStories_v1ToonAnime.safetensors [2ec7b88b]",
    "deliberate_v2.safetensors [10ec4b29]",
    "deliberate_v3.safetensors [afd9d2d4]",
    "dreamlike-anime-1.0.safetensors [4520e090]",
]

const list_255 = list_25.map(item => {
    item = item.split(".")[0];
    return {
        url: `http://127.0.0.1:3080/api/${item}`,
        remark: "[坤次元][" + item + "]",
        account_id: "",
        account_password: "",
        token: ""
    }
})

const list_3 = [
    "epicrealism_naturalSinRC1VAE.safetensors [90a4c676]",
    "ICantBelieveItsNotPhotography_seco.safetensors [4e7a3dfd]",
    "juggernaut_aftermath.safetensors [5e20c455]",
    "amIReal_V41.safetensors [0a8a2e61]",
    "majicmixRealistic_v4.safetensors [29d0de58]",
    "cyberrealistic_v33.safetensors [82b0d085]",
]

const list_33 = list_3.map(item => {
    item = item.split(".")[0];
    return {
        url: `http://127.0.0.1:3080/api/${item}`,
        remark: "[三次元][" + item + "]",
        account_id: "",
        account_password: "",
        token: ""
    }
})






// const list =  info.models.map(item => {
//     item = item.split(" [")[0];
//     return {
//         url: `http://127.0.0.1:3080/api/${item}`,
//         remark: item,
//         account_id: "",
//         account_password: "",
//         token: ""
//     }
// });

const mjInfo = painter.getEngineInfo("pixart.a");

const mjlist = mjInfo.models.map(item => {
    item = item.split(" ")[0];
    if (item === "(No") item = "Default";
    item = "mj" + item;
    return {
        url: `http://127.0.0.1:3080/api/${item}`,
        remark: "[PixArt][" + item + "]",
        account_id: "",
        account_password: "",
        token: ""
    }
});

const result = {
    APIList: mjlist.concat(list_22, list_255, list_33)
}

//write result to ./config.yaml
const config = yaml.dump(result);

// creat the config.yaml file
fs.writeFileSync("./scripts/config.yaml", config, "utf8");

console.log("已将所有模型导出至 ./scripts/config.yaml , 复制此文件的内容粘贴到ap插件的配置文件对应部分以快捷导入。");

