/* eslint-disable no-undef */
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const savePic = async (pic, engine, model) => {
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

const getPNGBase64 = async (url) => {
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64String = "data:image/png;base64," + buffer.toString("base64");

        return base64String;
    } catch (error) {
        console.log(error);
        return null;
    }
};

export { getPNGBase64, savePic };
