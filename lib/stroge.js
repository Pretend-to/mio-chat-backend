/* eslint-disable no-undef */
import fs from "fs";
import path from "path";

export const savePic = (pic, engine, model) => {
    try {
        const shortModel = model.includes("[") ? model.split(" [")[0] : model;
        const buffer = Buffer.from(pic.split(",")[1], "base64");

        const outputDir = path.join("./output", engine, shortModel)
        if(!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true })
        }
        const timestamp = new Date().getTime()
        const outPath = path.join(outputDir ,timestamp + ".jpg");
        fs.writeFileSync(outPath, buffer)
        return {error: false, path: outPath}
    }
    catch (error) {
        console.log(error);
        return {error: error, path: null};
    }

}