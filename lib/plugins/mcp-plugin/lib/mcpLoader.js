import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import process from "process";
import { execSync } from 'child_process'
import { MioFunction } from '../../../functions.js'
export async function loadMcpPlugins(mcpConfig) {

    // 验证配置文件格式
    let veryfiedConfig;
    try {
        veryfiedConfig = veryfyMcpConfig(mcpConfig)
    } catch (error) {
        logger.error(`mcp 配置文件验证失败: ${error.message}`);
        return []; // 或者抛出异常，取决于你的错误处理策略
    }

    const allTools = []
    for (const [name, param] of Object.entries(veryfiedConfig)) {
        allTools.push(...await loadMcpService(name, param))
    }
    logger.info('Mcp 插件加载完成, 共加载了 ' + allTools.length + ' 个工具')
    return allTools
}
function veryfyMcpConfig(config) {

    // 检查有没有 mcpServers 和 mcpOriginServers 字段
    if (!config.mcpServers && !config.mcpOriginServers) {
        throw new Error('Mcp 配置文件缺少 mcpServers 或 mcpOriginServers 字段');
    }

    // 为空的话直接返回
    if (Object.keys(config.mcpServers).length === 0 && Object.keys(config.mcpOriginServers).length === 0) {
        return {};
    }


    // 首先检查本地运行环境有没有基础运行命令
    const basicCommands = [
        {
            command: 'node',
            testCommand: 'node --version',
            isAvaliable: false, // 不能用 node 那很逆天了
        },
        {
            command: 'uv',
            testCommand: 'uv --version',
            isAvaliable: false,
        },
        {
            command: 'npx',
            testCommand: 'npm --version',
            isAvaliable: false,
        },
        {
            command: 'pip',
            testCommand: 'pip --version',
            isAvaliable: false,
        },
        {
            command: 'docker',
            testCommand: 'docker --version',
            isAvaliable: false,
        },
        {
            command: 'python',
            testCommand: 'python --version',
            isAvaliable: false,
        }
    ];

    for (const command of basicCommands) {
        // 检查命令是否存在
        const { command: cmd, testCommand } = command;
        try {
            execSync(testCommand); // 直接执行，如果出错会抛异常
            logger.info(`[${cmd}] 命令可用`);
            command.isAvaliable = true;
        } catch (error) {
            logger.error(`[${cmd}] 命令不可用: ${error.message}`);
            logger.error(`[${cmd}] 退出码: ${error.status}`);
            logger.error(`[${cmd}] 错误输出: ${error.stderr?.toString() || 'N/A'}`); // 安全地访问 stderr
        }
    }

    const result = {};
    const serverList = config.mcpServers || {};
    // 检查每个 mcpServer 的字段是否存在和类型是否正确
    for (const server of Object.keys(serverList)) {
        // 检查 server.command 是否可用
        const { command } = serverList[server];
        const matchCommand = basicCommands.find((cmd) => {
            return command.includes(cmd.command) && cmd.isAvaliable;
        });
        if (!matchCommand) {
            logger.error(`Mcp 插件 ${server} 的命令 ${command} 不可用`);
            continue;
        }
        result[server] = serverList[server];
    }

    const originServers = config.mcpOriginServers || {};
    // 检查每个 mcpServer 的字段是否存在和类型是否正确
    for (const server of Object.keys(originServers)) {
        const { url } = originServers[server];
        // 少字段就跳
        if (!url) {
            logger.error(`Mcp 插件 ${server} 的 url 字段不存在`);
            continue;
        } else {
            result[server] = originServers[server];
        }
    }

    return result;
}
async function loadMcpService(name, param) {
    const tools = []
    const client = new Client(
        {
            name: name,
            version: '1.0.0',
        }, {
        capabilities: {
            prompts: {},
            resources: {},
            tools: {},
        },
    })
    let transport;

    // 如果有 url 就用 sse 连接，否则用 stdio 连接
    if (param.url) {
        const url = new URL(param.url);
        const opts = getSSEOptions(param.env);
        transport = new SSEClientTransport(url, opts);
    } else {
        transport = new StdioClientTransport({
            ...param,
            env: getMergedEnv(param.env),
        });
    }

    try {
        logger.info(`开始加载 Mcp 插件 ${name}`);
        await client.connect(transport);
        const mcpTools = await client.listTools();
        for (const tool of mcpTools.tools) {
            const mcpTool = new mcpFunction(tool, client)
            tools.push(mcpTool)
        }
        logger.mark(`Mcp 插件 ${name} 加载成功, 共加载了${mcpTools.tools.length}个工具`);
    } catch (error) {
        logger.error(`Mcp 插件 ${name} 加载失败: ${error.message}`);
        if (error.code === -32000 && param.command === "npx") { // ENOENT 的 errno 值 (不同系统可能不同)
            logger.warn('这大概率是一个已知问题，您可以通过手动安装 mcp 中的插件来解决。')
            logger.warn('原命令为：' + param.command + ' ' + param.args.join(' '))
        }
    }
    return tools
}
class mcpFunction extends MioFunction {
    constructor(tool, client) {
        super({
            name: tool.name,
            description: tool.description,
            parameters: getValidParameters(tool.inputSchema),
        })
        this.client = client
        this.name = tool.name
    }
    async run(e) {
        const { params } = e;
        return await this.client.callTool({
            name: this.name,
            arguments: params,
        });
    }
}
function getValidParameters(parameters) {
    logger.json(parameters)
    // 检查 parameters 是否为对象
    if (typeof parameters !== 'object' || parameters === null) {
        throw new Error('parameters 必须是一个对象');
    }

    const validKeys = ['type', 'properties', 'required'];
    const validPropertiesKeys = ['type', 'description', 'enum', 'items', 'properties', 'oneOf'];

    // 检查每个参数的键是否有效
    for (const key of Object.keys(parameters)) {
        if (!validKeys.includes(key)) {
            // 删一下
            delete parameters[key];
        }
        if (key === 'properties') {
            for (const propertie of Object.keys(parameters[key])) {
                for (const subKey of Object.keys(parameters[key][propertie])) {
                    if (!validPropertiesKeys.includes(subKey)) {
                        // 删一下
                        delete parameters[key][propertie][subKey];
                        logger.warn(`删除不兼容的key：${subKey}`)
                    }
                }
            }
        }
    }
    logger.json(parameters)



    return parameters;
}

function getMergedEnv(env = {}) {
    // 合并环境变量
    return { ...process.env, ...env };
}
function getSSEOptions(env = {}) {
    // 暂时先空返回
    return undefined;
}