import crypto from 'crypto';

export function generateHash(input) {
    const hash = crypto.createHash('md5'); // 可以将'md5'替换为其他哈希算法，如'sha256'
    hash.update(input);
    return hash.digest('hex').slice(0, 6); // 返回前6位哈希值
}

// 示例用法
console.log(generateHash('exampleString'));
