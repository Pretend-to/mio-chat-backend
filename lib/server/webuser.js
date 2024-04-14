/* eslint-disable camelcase */
import EventEmitter from "events";
import logger from "../logger.js";
import config from "../config.js"

export default class WebUser extends EventEmitter {
    constructor(info, socket) {
        super();
        this.id = info.id;
        this.socket = socket;
        this.isAdmin = info.isAdmin;

        this.socket.on("close", () => {
            this.emit("close", this.id);
        });

        this.socket.on("message", (message) => {
            let e;
            try {
                e = JSON.parse(message);
                // 校验消息合法性
                logger.debug(e);
                if (!e.request_id || !e.protocol || !e.data) {
                    throw new Error("消息格式错误");
                }
            } catch (error) {
                logger.error("客户端 " + this.id + " 传入非法消息" + message);
                logger.error(error);
                return;
            }

            if (e.protocol === "onebot") {
                logger.debug(e.data);
                const text = e.data.filter(c => c.type === "text")[0].data.text;
                if (text) {
                    e.sender = {
                        id: this.id,
                        isAdmin: this.isAdmin
                    };
                }
                const message_id = this.sendResponse(e.request_id);
                e.message_id = message_id;

                logger.debug(e);
                this.emit("message", e);
                logger.info(`收到来自 ${this.id} 的消息：${text}`);
            }else if(e.protocol === "system"){
                // if(e.type == "login"){
                //     this.socket.emit("login",e)
                // }
                console.log(e.data)
            }else if(e.protocol === "openai"){
                this.emit("openai", e);
            }else{
                logger.error("客户端 " + this.id + " 传入非法协议" + e.protocol);
            }
        });
    }
    async send(message) {
        this.socket.send(JSON.stringify(message));
        try {
            throw new Error("测试错误");
        }catch (error) {
            logger.error(error);
        }
    }

    async sendMessage(protocol, data) {
        const message = {
            request_id: this.genMessageID(),
            protocol: protocol,
            data: {
                id:data.user_id,
                type:"message",
                content: data.message
            }
        }
        this.send(message);
    }

    sendResponse(id) {
        const message = {
            request_id: id,
            code: 0,
            message: "ok",
            data: {
                message_id: this.genMessageID()
            }
        }

        this.send(message);
        return message.data.message_id;
    }

    genMessageID() {
        const time = new Date().getTime()
        let subTime = time % 10000000000
        return subTime
    }

    login(info) {
        const message = {
            // eslint-disable-next-line camelcase
            request_id: info.requestID,
            code: 0,
            message: "登录成功",
            data: {
                is_admin: this.isAdmin,
                admin_qq: config.onebot.admin_qq,
                bot_qq: config.onebot.bot_qq,
            }
        };
        this.send(message);
        logger.debug(message);
    }

}