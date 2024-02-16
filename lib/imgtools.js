import { createCanvas, loadImage } from "canvas";

// 载入JPG图片并转换为PNG的base64格式
async function getPNGBase64(sourceImagePath) {
    // 使用loadImage读取JPG图片
    const image = await loadImage(sourceImagePath);

    // 创建一个和图片相同大小的canvas
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d");

    // 将图片绘制到canvas上
    ctx.drawImage(image, 0, 0, image.width, image.height);

    // 将canvas转换为PNG的base64格式
    return canvas.toDataURL("image/png");
}

export { getPNGBase64 };
