/* eslint-disable no-undef */
import fs from "fs";
import path from "path";

export const savePic = async (pic, engine, model) => {
    try {
        const shortModel = model.includes("[") ? model.split(" [")[0] : model;
        let buffer;

        if (pic.startsWith("http")) {
            const response = await fetch(pic);
            const arrayBuffer = await response.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
        } else {
            buffer = Buffer.from(pic.split(",")[1], "base64");
        }

        const outputDir = path.join("./output", engine, shortModel);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const timestamp = new Date().getTime();
        const outPath = path.join(outputDir, timestamp + ".jpg");
        fs.writeFileSync(outPath, buffer);
        
        return { error: false, path: outPath };
    } catch (error) {
        console.log(error);
        return { error: error, path: null };
    }
};