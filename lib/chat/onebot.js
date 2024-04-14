/* eslint-disable no-undef */
/* eslint-disable camelcase */
import { WebSocket } from "ws";
import EventEmitter from "events";
import logger from "../logger.js";

/**
 * Onebot 协议实现
 * @param {Object} config 配置项
 */
export default class Onebot extends EventEmitter {
    constructor(config) {
        super();
        this.ws = null;
        this.url = config.url;
        this.qq = config.qq;
        this.master = config.master;
        this.userAgent = config.userAgent;
        this.avaliable = false;
        this.connect(this.url);
        this.enableStdin();
        this.lastTimestamp = 0;
        this.counter = 0;
    }
    
    /**
     * 连接 Onebot 服务
     * @param {string} url 
     */
    connect(url) {
        logger.info("正在连接 Onebot 服务" + url);
        this.ws = new WebSocket(url, {
            headers: {
                "User-Agent": this.userAgent,
                "X-Client-Role": "Universal",
                "X-Impl": "Mio-Chat",
                "X-Onebot-Version": "11",
                "X-QQ-Version": "android 9.0.17",
                "X-Self-ID": this.qq
            }
        });

        const lifecycle = {
            time: null,
            self_id: this.qq,
            post_type: "meta_event",
            meta_event_type: "lifecycle",
            sub_type: "connect",
            status: {
                self: { platform: "qq", user_id: this.qq },
                online: true,
                good: true,
                "qq.status": "正常"
            },
            interval: 15000
        }

        this.ws.on("open", async () => {
            this.avaliable = true;
            this.emit("online");
            setTimeout(() => {
                const currentTimestamp = Date.now()  // 获取当前时间的时间戳（单位：ms）
                lifecycle.time = currentTimestamp;
                this.ws.send(JSON.stringify(lifecycle));
            }, 1000);
            setInterval(() => {
                // 检测链接是否正常
                if (this.ws.readyState === WebSocket.OPEN) {
                    const currentTimestamp = Date.now()  // 获取当前时间的时间戳（单位：ms）
                    lifecycle.time = currentTimestamp;
                    lifecycle.meta_event_type = "heartbeat";
                    this.ws.send(JSON.stringify(lifecycle));
                }
            }, 15000);

        });

        this.ws.on("message", (message) => {
            try {
                const data = JSON.parse(message);
                this.emit("event", data);
                // logger.debug(data);
                // this.eventHandler(data);
            } catch (e) {
                console.error("解析数据失败", e);
                // logger.debug(`${message}`);
            }
        });

        this.ws.on("close", () => {
            logger.warn("链接断开，5秒后重试");
            this.avaliable = false;
            setTimeout(() => { this.connect(this.url); }, 5000);
        });

        this.ws.on("error", (err) => {
            console.error("WebSocket error:", err); // 打印错误日志
        });


    }

    /**
     * 发送数据到 Onebot 服务
     * @param {Object} data 
     */
    sendObject(data) {
        this.ws.send(JSON.stringify(data));
    }

    /**
     * 生成 Onebot 消息 ID
     */
    generateMessageID() {
        let timestamp = Date.now();

        if (timestamp === this.lastTimestamp) {
            this.counter++;
        } else {
            this.counter = 0;
            this.lastTimestamp = timestamp;
        }

        let randomPart = Math.floor(Math.random() * 1000); // 生成一个三位数的随机数

        let messageID = timestamp.toString().slice(-9) + this.counter.toString().padStart(1, "0") + randomPart.toString().padStart(3, "0");

        return messageID;
    }

    /**
     * 以特定ID发送消息,如果传递id，则以指定id的身份发送消息
     * @param {Array} message 
     * @param {number} id 
     * @returns 
     */
    messageWarrper = (message = null, sender, message_id = null) => {
        return {
            time: Date.now(),
            self_id: this.qq,
            post_type: "message",
            message_type: "private",
            sub_type: "friend",
            message_id: message_id ?? this.generateMessageID(),
            target_id: this.qq,
            peer_id: this.qq,
            user_id: sender.isAdmin ? this.master : sender.id,
            message: message,
            raw_message: JSON.stringify(message),
            font: 0,
            sender: {
                user_id: sender.id ?? this.master,
                nickname: "taffy",
                card: "",
                role: "member",
                title: "",
                level: ""
            }
        }
    }

    /**
     * 监听标准输入,并将输入的消息发送到WebSocket连接
     */
    enableStdin() {
        // 监听标准输入
        logger.info("正在监听标准输入");
        process.stdin.on("data", (data) => {
            const text = data.toString().trim();
            const message = [
                {
                    type: "text",
                    data: {
                        text: text
                    }
                }
            ];
            const warpedMessage = this.messageWarrper(message,{isAdmin: true});

            // 将输入的消息发送到WebSocket连接
            this.sendObject(warpedMessage);

            logger.debug("已发送消息:" + data.toString().trim());
        });
    }
}
