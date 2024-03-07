import fetch from "node-fetch";

// 载入JPG图片并转换为PNG的base64格式
async function getPNGBase64(url) {
    const response = await fetch(url);
    const buffer = await response.buffer();
    const base64String = buffer.toString("base64");
    return base64String;
}

export { getPNGBase64 };
