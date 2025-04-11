import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import { pathToFileURL } from 'url'; // 引入 pathToFileURL

const PACKAGE_JSON = 'package.json';
const CONFIG_DIR = 'config/plugins';
const TOOLS_DIR = 'tools';

export default class Plugin {
  constructor(info, settings = {}) {
    if (this.constructor === Plugin) {
      throw new Error('抽象类不能直接实例化');
    }
    const requiredMethods = ['getFilePath', 'getInitialConfig']; // 必须实现的方法
    for (const method of requiredMethods) {
      if (typeof this[method] !== 'function') {
        throw new Error(`插件必须实现 ${method} 方法`);
      }
    }
    this.metaData = info || {};
    this.tools = new Map(); // 初始化 tools Map
    this.pluginPath = this.getFilePath(); // 由子类实现，获取插件目录路径
    this.configDir = path.join(process.cwd(), CONFIG_DIR); // 全局配置目录路径 (Changed name slightly for clarity)

    if (settings.toolsPath) {
      this.toolsPath = settings.toolsPath;
    } else {
      this.toolsPath = path.join(this.pluginPath, TOOLS_DIR); // 工具目录路径
    }

    this._loadMetadata(); // 加载 package.json 信息 (Sets this.name)

    // --- Calculate config path after name is set ---
    this.configPath = path.join(this.configDir, `${this.name}.json`); // Specific config file path

    this.loadConfig(); // 加载插件配置

    this.toolWatcher = null; // 初始化 tool watcher 为 null
    this.configWatcher = null; // 初始化 config watcher 为 null
    this.isInitialScanComplete = false; // 添加一个标志来标识初始扫描是否完成
    this.isReloading = false; // Add a flag to prevent recursive reload
    this.debouncedLoadConfig = this.debounce(this.loadTools.bind(this), 500);  // Debounced config loader
    this.debouncedLoadTools = this.debounce(this.loadTools.bind(this), 500); // Debounced tool loader
  }

  async initialize() {
    await this.loadTools(); // 首次加载工具
    this._setupWatchers(); // 启动文件监听
  }

  _loadMetadata() {
    const packageJsonPath = path.join(this.pluginPath, PACKAGE_JSON);
    try {
      if (fs.existsSync(packageJsonPath)) {
        const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');
        const packageJson = JSON.parse(packageJsonContent);
        const { name, description, version, author } = packageJson;
        // Use package.json name first if available
        this.name = name || path.basename(this.pluginPath);
        const metaData = {
          name: this.name, // Ensure name is consistent
          description,
          version,
          author,
        };
        this.metaData = { ...this.metaData, ...metaData }; // Merge, constructor info takes precedence if keys conflict? Or package.json? Let's prioritize package.json
      } else {
         // Ensure name is set even without package.json
         if (!this.metaData.name) {
             this.name = path.basename(this.pluginPath); // 从目录名获取插件名
             this.metaData.name = this.name;
         } else {
             this.name = this.metaData.name;
         }
      }
       // Defensive check if name is still somehow undefined
       if (!this.name) {
           throw new Error("Plugin name could not be determined.");
       }
    } catch (error) {
      logger.error(`[插件元数据加载失败] ${packageJsonPath}:`, error);
      throw error; // Re-throw or handle appropriately
    }
  }

  async loadTools() {
    if (this.isReloading) {
        return; // Prevent recursive calls
    }
    this.isReloading = true;

    if (!fs.existsSync(this.toolsPath)) {
      logger.warn(`[${this.name}] [工具目录未找到] ${this.toolsPath}`);
      this.tools.clear(); // Clear existing tools if directory disappears
      this.isReloading = false;
      return;
    }

    try {
      const toolFiles = await fs.promises.readdir(this.toolsPath);
      const previousToolNames = new Set(this.tools.keys());
      const currentToolNames = new Set();

      for (const toolFile of toolFiles) {
        // 非 js 文件跳过
        if (!toolFile.endsWith('.js') && !toolFile.endsWith('.mjs')) { // Allow .mjs too
          continue;
        }
        const toolPath = path.join(this.toolsPath, toolFile);
        try {
          const cacheBuster = Date.now(); // Add timestamp as query parameter
          const fileUrl = `${pathToFileURL(toolPath).toString()}?t=${cacheBuster}`;
          const toolModule = await import(fileUrl);

          // Check if default export is a class constructor
          if (typeof toolModule.default === 'function' && toolModule.default.prototype) {
              const ToolClass = toolModule.default;
              // Assume constructor takes no arguments or handles missing ones
              const tool = new ToolClass();
              // Assume tool instance has a 'name' property
              if (tool.name) {
                  this.tools.set(tool.name, tool);
                  currentToolNames.add(tool.name);
              } else {
                  logger.error(`[${this.name}] [工具加载失败] ${toolPath}: Tool instance missing 'name' property.`);
              }
          } else {
             logger.error(`[${this.name}] [工具加载失败] ${toolPath}: Default export is not a valid class.`);
          }
        } catch (error) {
          logger.error(`[${this.name}] [工具加载失败] ${toolPath}:`);
          logger.error(error);
        }
      }

      // Remove tools that are no longer present
      for (const toolName of previousToolNames) {
          if (!currentToolNames.has(toolName)) {
              this.tools.delete(toolName);
              logger.info(`[${this.name}] Unloaded tool: ${toolName}`);
          }
      }

    } catch (error) {
      logger.error(`[${this.name}] Error reading tools directory (${this.toolsPath}):`, error);
       this.tools.clear(); // Clear tools on error reading directory
    }

    this.isReloading = false;
  }

  loadConfig() {
    // configPath is now calculated in constructor and stored in this.configPath
    let configData = this.getInitialConfig(); // Start with default
    try {
      if (fs.existsSync(this.configPath)) {
        const configContent = fs.readFileSync(this.configPath, 'utf-8');
        try {
          configData = JSON.parse(configContent); // Load existing config
        } catch (parseError) {
          logger.error(`[${this.name}] [配置文件解析失败] ${this.configPath}. 使用默认配置.`, parseError);
          // configData already holds the default config here
        }
      } else {
        logger.info(`[${this.name}] [配置文件未找到] ${this.configPath}. 创建默认配置文件.`);
        // configData already holds the default config here
        try {
            // Ensure directory exists before writing
            const dir = path.dirname(this.configPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                logger.info(`[${this.name}] Created config directory: ${dir}`);
            }
            fs.writeFileSync(this.configPath, JSON.stringify(configData, null, 2), 'utf-8'); // Write default config
        } catch (writeError) {
             logger.error(`[${this.name}] [无法写入默认配置文件] ${this.configPath}:`, writeError);
             // Keep default config in memory, but log the failure to persist it
        }
      }
    } catch (error) {
      logger.error(`[${this.name}] [配置文件加载/检查错误] ${this.configPath}. 使用默认配置.`, error);
       // configData already holds the default config here
    }
    this.config = configData; // Assign the loaded or default config
  }

  _setupWatchers() { // 私有方法，监听插件变化
    // --- Tool Watcher ---
    if (!this.toolWatcher && fs.existsSync(this.toolsPath)) { // Only watch if directory exists
        this.toolWatcher = chokidar.watch(this.toolsPath, {
            ignored: /(^|[/\\])\../, // 忽略点文件
            persistent: true, // 保持监听状态
            depth: 0, // 只监听 tools 目录下的文件变化
            ignoreInitial: true, // Important: Ignore initial scan events for tools
            awaitWriteFinish: { // 等待文件写入完成
                stabilityThreshold: 2000, // 稳定时间
                pollInterval: 100 // 轮询间隔
            }
        });

        this.toolWatcher
            .on('add', (filePath) => {
            // We now use ignoreInitial, so this should only be for new files after startup
            //if (!this.isInitialScanComplete) { // No longer needed with ignoreInitial
            //  return;
            //}
            logger.info(`[${this.name}] [新增工具文件] ${path.basename(filePath)}`);
            this.debouncedLoadTools(); // Use the debounced function
            })
            .on('change', (filePath) => {
            logger.info(`[${this.name}] [更改工具文件] ${path.basename(filePath)}`);
            this.debouncedLoadTools(); // Use the debounced function
            })
            .on('unlink', (filePath) => {
            logger.info(`[${this.name}] [移除工具文件] ${path.basename(filePath)}`);
            this.debouncedLoadTools(); // Use the debounced function
            })
            .on('error', error => logger.error(`[${this.name}] [工具文件监听错误] ${this.toolsPath}:`, error))
            // .on('ready', () => { // No longer needed with ignoreInitial
            //  this.isInitialScanComplete = true; // 标记初始扫描完成
            //  logger.debug(`[${this.name}] Tool watcher initial scan complete.`);
            // });
    } else if (!fs.existsSync(this.toolsPath)) {
         logger.warn(`[${this.name}] Tools directory ${this.toolsPath} not found. Tool watcher not started.`);
    } else {
         logger.debug(`[${this.name}] Tool watcher already exists.`);
    }

    // --- Config Watcher ---
    if (!this.configWatcher) {
        // Watch the specific config file. Chokidar handles if it doesn't exist yet.
        this.configWatcher = chokidar.watch(this.configPath, {
            persistent: true,
            ignoreInitial: true, // Don't trigger loadConfig just for starting the watch
            awaitWriteFinish: {
                stabilityThreshold: 500, // Shorter delay for config changes
                pollInterval: 100
            }
        });

        this.configWatcher
            .on('add', (filePath) => {
                // File was created (likely after being deleted, or manually)
                logger.info(`[${this.name}] [配置文件已创建/添加] ${path.basename(filePath)}. Reloading config.`);
                this.debouncedLoadConfig(); // Reload the newly created config
            })
            .on('change', (filePath) => {
                logger.info(`[${this.name}] [配置文件已更改] ${path.basename(filePath)}. Reloading config.`);
                this.debouncedLoadConfig(); // Reload the changed config
            })
            .on('unlink', (filePath) => {
                // Config file was deleted
                logger.warn(`[${this.name}] [配置文件已删除] ${path.basename(filePath)}. Reloading default config.`);
                // Calling loadConfig will now load defaults and recreate the file
                this.debouncedLoadConfig();
            })
            .on('error', error => logger.error(`[${this.name}] [配置文件监听错误] ${this.configPath}:`, error));
            // .on('ready', () => { // Not very relevant for single file watch with ignoreInitial
            //     logger.debug(`[${this.name}] Config watcher ready for: ${this.configPath}`);
            // });

    } else {
         logger.debug(`[${this.name}] Config watcher already exists.`);
    }
  }

  // Debounce function
  debounce(func, wait) {
    let timeout;
    return function (...args) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  }

  getTools() {
    const toolsArray = [];
    for (const tool of this.tools.values()) {
        // Check if tool has a json method, otherwise provide basic info
        if (typeof tool.json === 'function') {
             toolsArray.push(tool.json());
        } else {
             logger.warn(`[${this.name}] Tool "${tool.name || 'unknown'}" missing json() method.`);
             toolsArray.push({ name: tool.name || 'unknown', description: tool.description || 'No description' }); // Fallback
        }
    }
    return toolsArray;
  }

  getConfig() {
    this.loadConfig();
    return this.config;
  }

  getMetaData() {
    return this.metaData;
  }

   // --- Optional Cleanup Method ---
   async destroy() {
       logger.info(`[${this.name}] Destroying plugin...`);
       if (this.toolWatcher) {
           logger.debug(`[${this.name}] Closing tool watcher.`);
           await this.toolWatcher.close();
           this.toolWatcher = null;
       }
       if (this.configWatcher) {
           logger.debug(`[${this.name}] Closing config watcher.`);
           await this.configWatcher.close();
           this.configWatcher = null;
       }
       this.tools.clear();
       // Clear timeouts if necessary (though debounce should handle this)
       logger.info(`[${this.name}] Plugin destroyed.`);
   }
}


// --- Example Child Class (Unchanged) ---
export class singleTools extends Plugin {
  constructor() {
    super({
      name: 'custom',
    }, {
      toolsPath: path.join(process.cwd(), 'plugins', 'custom')
    })
  }
  getFilePath() {
    return path.dirname(pathToFileURL(import.meta.url).toString())
  }
  getInitialConfig() {
    return {}
  }
}