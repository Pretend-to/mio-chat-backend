/* eslint-disable camelcase */
/* eslint-disable no-undef */
import fs from "fs";
import logger from "./logger.js";
import wsServer from "./server/websocket.js";
import Onebot from "./chat/onebot.js";


export default class Middleware {
    constructor() {
        this.onebot = null;
        this.wsServer = new wsServer();

        // TODO: support openai api
        // this.onenai = null;

        this.initWsServer();
    }

    initOnebot() {
        // 收到服务端上线消息
        this.onebot.on("online", () => {
            logger.info("OneBot 协议连接成功！");
        })

        // 收到服务端信息
        this.onebot.on("event", async (e) => {

            const data = e;
            let errorEvent = null;
            let resData = {};

            const messageListHandle = (messageList) => {
                for (let message of messageList) {
                    if (message.type === "reply") {
                        logger.debug(`此消息引用了${message.data.id}`)
                    } else if (message.type === "text") {
                        logger.info(`向${data.params.user_id}发送私聊消息：` + message.data.text);

                    } else if (message.type === "image") {
                        const base64Data = message.data.file.replace(/^base64:\/\//, "");
                        // 保存图片base64数据到本地
                        fs.writeFile("imageBase64.txt", base64Data, "utf8", function (err) {
                            if (err) {
                                console.error(err);
                            } else {
                                logger.info(`向${data.params.user_id}发送私聊图片，已保存Base64数据到本地`);
                            }
                        })

                        const buffer = Buffer.from(base64Data, "base64");

                        fs.writeFile("image.jpg", buffer, "base64", function (err) {
                            if (err) {
                                console.error(err);
                            } else {
                                logger.info(`向${data.params.user_id}发送私聊图片，已保存到本地`);
                            }
                        });
                    } else if (message.type === "record") {
                        const url = message.data.file;
                        // 保存wav音频文件到本地
                        fetch(url)
                            .then(response => response.arrayBuffer())
                            .then(arrayBuffer => {
                                const buffer = Buffer.from(arrayBuffer);
                                fs.writeFile("record.wav", buffer, "binary", function (err) {
                                    if (err) {
                                        console.error(err);
                                    } else {
                                        logger.debug(`收到${data.params.user_id}私聊语音，已保存到本地`);
                                    }
                                });
                            })
                            .catch(error => console.error(error));
                    } else {
                        logger.debug(`收到${data.params.user_id}私聊消息，但不支持的消息类型: ${message.type}`);
                        logger.debug(data.params.message);
                    }
                }
            }

            try {
                if (data.action.startsWith("get_")) {
                    resData = getFakeData(data.action, this.onebot)
                } else {
                    logger.debug(data);
                    logger.debug(data.params.message);
                    switch (data.action) {
                    case "send_private_msg": {
                        const messageList = data.params.message;
                        messageListHandle(messageList);
                        resData = {
                            message_id: this.onebot.generateMessageID()
                        }

                        this.wsServer.sendPrivate(data.params.user_id, messageList);

                        break;
                    }
                    case "send_private_forward_msg": {
                        logger.debug(`收到${data.params.user_id}私聊转发消息`);
                        const nodes = data.params.messages;
                        const messages = [];
                        for (let node of nodes) {
                            messages.push(node.data.content);
                        }
                        messageListHandle(messages);
                        resData = {
                            message_id: this.onebot.generateMessageID()
                        }
                        break;
                    }
                    case "delete_msg":
                        logger.debug(`收到撤回消息${data.params.message_id}`);
                        break;
                    default:
                        logger.debug(data);
                        throw new Error(`未知的事件类型: ${data.action}`);
                    }
                }

            } catch (e) {
                console.error("处理事件失败", e);
                errorEvent = e;
            }

            const response = {
                status: errorEvent ? "failed" : "ok",
                retcode: errorEvent ? 1 : 0,
                msg: errorEvent ? errorEvent.message : "",
                wording: errorEvent ? errorEvent.message : "",
                data: errorEvent ? {} : resData,
                echo: data.echo
            }
            this.onebot.sendObject(response);
        });
    }

    initWsServer() {
        // 收到客户端消息
        this.wsServer.on("message", (e) => {
            this.sendServer(e);           
        })
    }

    startOnebot(config) {
        this.onebot = new Onebot(config);

        this.initOnebot();
    }

    // 向服务端发送消息
    sendServer(e) {
        try {
            logger.debug("收到客户端" + e.id + "的消息");
            
            const data = e.data.data;
            logger.debug(data);
            switch (data.type) {
            case "message":{
                logger.debug("收到私聊消息");
                const warpedMessage = this.onebot.messageWarrper(data.content, e.id);
                logger.debug(warpedMessage);
                this.onebot.sendObject(warpedMessage)

                break;
            }
            default:
                logger.warn("收到未知消息类型");
            }
        }catch(e){
            console.error("处理客户端消息失败", e);
        }
    }

    // 向客户端发送消息
    sendClient() {

    }
}

function getFakeData(type, onebot) {
    switch (type) {
    case "get_login_info":
        return {
            user_id: onebot.qq,
            nickname: "mio"
        }
    case "get_friend_list":
        return [
            {
                user_id: onebot.master,
                nickname: "master",
                remark: "",
            },
            {
                user_id: onebot.qq,
                nickname: "self",
                remark: "",
            }

        ]
    case "get_group_list":
        return [];
    case "get_group_member_list":
        return [];
    case "get_cookies":
        return {
            cookies: "666"
        };
    default:
        throw new Error(`未知的获取数据类型: ${type}`);
    }

}

