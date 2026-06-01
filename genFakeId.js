/**
 * 生成一个保证唯一的10位纯数字ID
 * 结合设备ID(this.id)、时间戳和随机数
 */
class IdGenerator {
  constructor(deviceId) {
    this.id = deviceId || 'default';
  }

  genFakeId() {
    // 获取当前时间戳（毫秒）
    const timestamp = Date.now();
    
    // 将设备ID转换为数字哈希值
    let deviceHash = 0;
    for (let i = 0; i < this.id.length; i++) {
      const char = this.id.charCodeAt(i);
      deviceHash = ((deviceHash << 5) - deviceHash) + char;
      deviceHash = deviceHash & deviceHash; // 转为32位整数
    }
    deviceHash = Math.abs(deviceHash);
    
    // 生成随机数
    const random = Math.floor(Math.random() * 1000);
    
    // 组合各部分：
    // - 时间戳后4位
    // - 设备哈希值的3位
    // - 随机数3位
    const timestampPart = String(timestamp).slice(-4);
    const devicePart = String(deviceHash).slice(-3).padStart(3, '0');
    const randomPart = String(random).padStart(3, '0');
    
    // 组合成10位ID
    let fakeId = timestampPart + devicePart + randomPart;
    
    // 确保是10位数字，如果不足10位则补0，超过则截取
    fakeId = fakeId.padStart(10, '0').slice(0, 10);
    
    // 确保第一位不是0（避免被当作8进制）
    if (fakeId[0] === '0') {
      fakeId = '1' + fakeId.slice(1);
    }
    
    return fakeId;
  }
}

// 测试代码
console.log('测试ID生成器：');
const generator1 = new IdGenerator('device123');
const generator2 = new IdGenerator('device456');

console.log('设备1生成的ID：');
for (let i = 0; i < 5; i++) {
  console.log(generator1.genFakeId());
}

console.log('\n设备2生成的ID：');
for (let i = 0; i < 5; i++) {
  console.log(generator2.genFakeId());
}

// 如果你想要在现有类中使用，可以这样：
const genFakeId = function() {
  // 获取当前时间戳（毫秒）
  const timestamp = Date.now();
  
  // 将设备ID转换为数字哈希值
  let deviceHash = 0;
  for (let i = 0; i < this.id.length; i++) {
    const char = this.id.charCodeAt(i);
    deviceHash = ((deviceHash << 5) - deviceHash) + char;
    deviceHash = deviceHash & deviceHash; // 转为32位整数
  }
  deviceHash = Math.abs(deviceHash);
  
  // 生成随机数
  const random = Math.floor(Math.random() * 1000);
  
  // 组合各部分：
  // - 时间戳后4位
  // - 设备哈希值的3位
  // - 随机数3位
  const timestampPart = String(timestamp).slice(-4);
  const devicePart = String(deviceHash).slice(-3).padStart(3, '0');
  const randomPart = String(random).padStart(3, '0');
  
  // 组合成10位ID
  let fakeId = timestampPart + devicePart + randomPart;
  
  // 确保是10位数字，如果不足10位则补0，超过则截取
  fakeId = fakeId.padStart(10, '0').slice(0, 10);
  
  // 确保第一位不是0（避免被当作8进制）
  if (fakeId[0] === '0') {
    fakeId = '1' + fakeId.slice(1);
  }
  
  return fakeId;
};

console.log('\n直接方法实现：');
console.log(genFakeId.call({id: 'testDevice'}));

