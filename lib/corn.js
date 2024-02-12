/* eslint-disable no-unused-vars */
import cron from "node-cron";
import { exec } from "child_process";
import logger from "./logger.js";
import { promisify } from "util";

export default class taskScheduler {
    constructor() {
        this.scheduledTasks = [
            {
                cronExpression: "30 21 * * *",
                task: this.bakPics
            },
        ];
        this.initSupportChecks();
    }

    async checkZipSupport() {
        return new Promise((resolve, reject) => {
            exec("zip --version", (error, stdout, stderr) => {
                if (error) {
                    resolve(false);
                    return;
                }
                
                resolve(stdout.includes("Copyright"));
            });
        });
    }

    async checkRmSupport() {
        return new Promise((resolve, reject) => {
            exec("rm --version", (error, stdout, stderr) => {
                if (error) {
                    resolve(false);
                    return;
                }
                
                resolve(stdout.includes("Copyright"));
            });
        });
    }

    init() {
        logger.info("初始化Cron任务...");
        logger.info("检查zip和rm命令是否可用...");


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

    async bakPics() {
        if (!this.supportZip ||!this.supportRm) {
            logger.warn("压缩或删除功能不可用，请检查zip和rm命令是否可用");
            return;
        }


        const currentDate = new Date().toLocaleDateString();
        const zipFilename = `ai-paint-${currentDate}.zip`;
        const execPromise = promisify(exec);
        try {
            // Execute compression command
            const { stdout: zipStdout, stderr: zipStderr } = await execPromise(`zip ./backup/${zipFilename} ./output/*`);
            logger.info(`压缩成功: ${zipStdout}`);

            // Execute file deletion command
            const { stdout: rmStdout, stderr: rmStderr } = await execPromise("rm -rf ./output/*");
            logger.info(`删除成功: ${rmStdout}`);
        } catch (error) {
            console.error("cron任务执行失败:", error);
        }
    }

    async initSupportChecks() {
        this.supportZip = await this.checkZipSupport();
        this.supportRm = await this.checkRmSupport();

        logger.info(`zip命令可用: ${this.supportZip}`);
        logger.info(`rm命令可用: ${this.supportRm}`);
        
        if (!this.supportZip || !this.supportRm) {
            logger.warn("压缩或删除功能不可用，图片备份将失效...");
        } 
    }
}
