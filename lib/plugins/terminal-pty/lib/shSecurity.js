/**
 * sh 命令行安全校验模块
 */

/**
 * 校验命令是否命中白名单规则
 * 
 * @param {string} command 待执行命令
 * @param {string} whitelistStr 白名单规则字符串（逗号或换行分隔）
 * @returns {boolean} 是否命中白名单
 */
/**
 * 健壮地将 Shell 命令行切分为多个独立的子命令（避开引号内的运算符）
 * 
 * @param {string} command 原始命令行
 * @returns {string[]} 切分后的子命令数组
 */
export function splitShellCommands(command) {
  const subCommands = [];
  let current = '';
  let inDoubleQuotes = false;
  let inSingleQuotes = false;
  let escape = false;

  for (let i = 0; i < command.length; i++) {
    const char = command[i];

    if (escape) {
      current += char;
      escape = false;
      continue;
    }

    if (char === '\\') {
      if (!inSingleQuotes) {
        escape = true;
      }
      current += char;
      continue;
    }

    if (char === '"' && !inSingleQuotes) {
      inDoubleQuotes = !inDoubleQuotes;
      current += char;
      continue;
    }

    if (char === "'" && !inDoubleQuotes) {
      inSingleQuotes = !inSingleQuotes;
      current += char;
      continue;
    }

    // 只有在引号外部，才识别运算符并进行切分
    if (!inDoubleQuotes && !inSingleQuotes) {
      if (char === ';') {
        if (current.trim()) subCommands.push(current.trim());
        current = '';
        continue;
      }
      if (char === '|' && command[i + 1] === '|') {
        if (current.trim()) subCommands.push(current.trim());
        current = '';
        i++; // 跳过下一个 '|'
        continue;
      }
      if (char === '|' && command[i + 1] !== '|') {
        if (current.trim()) subCommands.push(current.trim());
        current = '';
        continue;
      }
      if (char === '&' && command[i + 1] === '&') {
        if (current.trim()) subCommands.push(current.trim());
        current = '';
        i++; // 跳过下一个 '&'
        continue;
      }
    }

    current += char;
  }

  if (current.trim()) {
    subCommands.push(current.trim());
  }

  return subCommands;
}

/**
 * 校验命令是否命中白名单规则
 * 
 * @param {string} command 待执行命令
 * @param {string} whitelistStr 白名单规则字符串（逗号或换行分隔）
 * @returns {boolean} 是否命中白名单
 */
export function isCommandWhitelisted(command, whitelistStr) {
  if (!command || !whitelistStr || !whitelistStr.trim()) {
    return false;
  }

  const rules = whitelistStr.split(/[\n,]+/).map(r => r.trim()).filter(Boolean);
  const subCommands = splitShellCommands(command);

  // 每一个子命令都必须通过白名单校验
  for (const subCmd of subCommands) {
    const cmdTrimmed = subCmd.trim();
    let matched = false;

    for (const rule of rules) {
      if (rule.startsWith('/') && rule.endsWith('/')) {
        try {
          const regex = new RegExp(rule.slice(1, -1));
          if (regex.test(cmdTrimmed)) {
            matched = true;
            break;
          }
        } catch (err) {
          if (global.logger) {
            global.logger.error(`[shSecurity] 无效的白名单正则表达式: ${rule}`, err.message);
          } else {
            console.error(`[shSecurity] 无效的白名单正则表达式: ${rule}`, err.message);
          }
        }
      } else {
        // 全等匹配，或者规则作为前缀后接空格/制表符（防止 git 匹配 github）
        if (
          cmdTrimmed === rule || 
          cmdTrimmed.startsWith(rule + ' ') || 
          cmdTrimmed.startsWith(rule + '\t')
        ) {
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      return false; // 任何一个子命令不通过，则整行不通过
    }
  }

  return true;
}

