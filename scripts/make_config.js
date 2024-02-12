/* eslint-disable camelcase */
import Drawer from "../lib/draw.js";
import yaml from "js-yaml";
import fs from "fs";

const painter = new Drawer();

const info =  painter.getEngineInfo("prodia.stablediffusion");

const list =  info.models.map(item => {
    item = item.split(" [")[0];
    return {
        url: `http://127.0.0.1:3080/api/${item}`,
        remark: item,
        account_id: "",
        account_password: "",
        token: ""
    }
});

const result = {
    APIList: list,
}

//write result to ./config.yaml
const config = yaml.dump(result);

// creat the config.yaml file
fs.writeFileSync("./scripts/config.yaml", config, "utf8");

console.log("已将所有模型导出至 ./scripts/config.yaml , 复制此文件的内容粘贴到ap插件的配置文件对应部分以快捷导入。");

