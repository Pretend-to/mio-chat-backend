/* eslint-disable no-unused-vars */
import cron from "node-cron";
import { exec } from "child_process";
import logger from "./logger.js";

export default class taskScheduler {
    constructor() {
        this.scheduledTasks = [
            {
                cronExpression: "*/5 * * * *",
                task: this.bakPics
            },
        ];
    }

    async  initSupportChecks() {
        logger.info("开始检查zip和rm命令是否可用...");
        const zipAvailable = await this.checkCommand("zip --version");
        const rmAvailable = await this.checkCommand("rm --version");
        logger.info(`zip命令可用: ${zipAvailable}, rm命令可用: ${rmAvailable}`);
    
        if (zipAvailable && rmAvailable) {
            return true;
        }else{
            
            logger.error("zip或rm命令不可用，请安装zip和rm命令");
            return false;
        }
    }

    async checkCommand(command) {
        return new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    resolve(false);
                } else {
                    resolve(stdout.includes("Copyright"));
                }
            });
        });
    }


    async init() {
        logger.info("初始化Cron任务...");


        this.scheduledTasks.forEach(({ cronExpression, task }) => {
            cron.schedule(cronExpression, async () => {
                logger.info("Cron任务开始执行...");
                await task();
                logger.info("Cron执行结束");
            });
        });
        logger.info("初始化Cron任务成功");

    }

    makeSchedule(cronExpression, task) {
        logger.info(`创建Cron任务: ${cronExpression}`);
        this.scheduledTasks.push({ cronExpression, task });
        this.init();
    }

    bakPics = async () => {
        if (!await this.initSupportChecks()) {
            logger.error("zip或rm命令不可用，请安装zip和rm命令");
            return;
        }

        const readCommand = "du  -sh ./output"
        const { stdout:readResult, stderr:readErr } = await this.execCommand(readCommand);
        const du = readResult.split(/\s+/)[0];
        if(du.endsWith("K") || Number(du.split("M")) < 512){
            logger.info("输出目录大小为" + du + ",跳过备份")
            return;
        }else {
            logger.info("输出目录超过半个G了，开始备份")
        }
        
        try {
            // Execute compression command
            const command = "zip ./backup/ai-paint-$(date +%Y%m%d).zip ./output/*"
            const { stdout: zipStdout, stderr: zipStderr } = await this.execCommand(command);
            logger.info(`压缩成功: ${zipStdout}`);
    
            // Execute file deletion command
            const { stdout: rmStdout, stderr: rmStderr } = await this.execCommand("rm -rf ./output/*");
            logger.info(`删除成功: ${rmStdout}`);
        } catch (error) {
            logger.error("cron任务执行失败:", error);
        }
    }

    async execCommand(command) {
        return new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve({ stdout, stderr });
                }
            });
        });
    }
}

