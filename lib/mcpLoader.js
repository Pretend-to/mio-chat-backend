import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from 'path'
import fs from 'fs'
import process from "process";
import { execSync } from 'child_process'
import { MioFunction } from './functions.js'
export async function loadMcpPlugins() {
    const mcpPluginsBasePath = path.join(process.cwd(), 'config', 'plugins')
    // 检查 mcp 配置文件是否存在 (mcp.json)
    const mcpConfigPath = path.join(mcpPluginsBasePath, 'mcp.json')
    if (!fs.existsSync(mcpConfigPath)) {
        logger.warn('mcp 配置文件不存在，跳过加载 mcp 插件')
        return []
    }
    // 读取 mcp 配置文件
    let mcpConfig;
    try {
        const configContent = fs.readFileSync(mcpConfigPath, 'utf-8');
        mcpConfig = JSON.parse(configContent);
    } catch (error) {
        logger.error(`读取或解析 mcp 配置文件失败: ${error.message}`);
        return []; // 或者抛出异常，取决于你的错误处理策略
    }

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
    // 首先检查本地运行环境有没有基础运行命令
    const basicCommands = [
        {
            command: 'uvx',
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

    // 检查有没有 mcpServers
    if (!config.mcpServers) {
        throw new Error('mcp.json 缺少 mcpServers 字段');
    }

    const result = {};
    const serverList = config.mcpServers;
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
    const transport = new StdioClientTransport({
        ...param,
       env: getMergedEnv(param.env),
    });
    try {
        await client.connect(transport);
        const mcpTools = await client.listTools();
        for (const tool of mcpTools.tools) {
            const mcpTool = new mcpFunction(tool, client)
            tools.push(mcpTool)
        }
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
            params: getParam(tool.inputSchema),
            required: tool.inputSchema.required,
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
function getParam(schema) {
    const params = []
    if (!schema || !schema.properties) {
        logger.warn('schema is null');
        return params;
    }
    for (const key of Object.keys(schema.properties)) {
        params.push({
            name: key,
            ...schema.properties[key]
        })
    }
    return params
}
function getMergedEnv(env = {}) {
    // 合并环境变量
    return { ...process.env, ...env };
}