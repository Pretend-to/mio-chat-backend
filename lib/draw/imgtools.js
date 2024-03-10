import fetch from "node-fetch";

async function getPNGBase64(url) {
    // 获取图片数据
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();

    // 将 ArrayBuffer 转换为 Buffer
    // eslint-disable-next-line no-undef
    const buffer = Buffer.from(arrayBuffer);

    // 转换为base64字符串，并添加MIME类型
    const base64String = "data:image/png;base64," + buffer.toString("base64");

    return base64String;
}

export { getPNGBase64 };
