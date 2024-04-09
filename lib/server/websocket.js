import { WebSocketServer } from "ws";
import WebUser from "./webuser.js";
import logger from "../logger.js";
import EventEmitter from "events";

export default class WsServer extends EventEmitter {
    constructor() {
        super();
        this.clients = [];
        this.initServer();
    }

    initServer() {
        // 创建WebSocket服务器实例
        this.wss = new WebSocketServer({
            noServer: true
        });

        logger.info("WebSocket服务器已启动");

        // 监听客户端连接事件
        this.wss.on("connection", (ws, request) => {
            // const clientId = this.generateId();
            // 检测客户端是否有fake-qq-id头部

            logger.info("收到websocket连接请求",request);

            if (!request.headers["fake-qq-id"]) {
                logger.error("客户端未提供fake-qq-id头部");
                ws.close();
                return;
            }

            const clientId = request.headers["fake-qq-id"];

            // 检测客户端是否已经登录
            const client = this.clients.find(client => client.id == clientId);
            if (client) {
                logger.error(`客户端${clientId}已经登录`);
                ws.close();
                return;
            }

            const webUser = new WebUser(clientId, ws);
            this.clients.push(webUser)

            logger.info(`客户端${clientId}已连接`);
            logger.info(`当前在线客户端数：${this.clients.length}`);

            // 监听客户端消息事件
            webUser.on("message", (data) => {
                this.emit("message",{id:clientId,data:data});
            });

            // 监听客户端离线事件
            webUser.on("close", (id) => {
                logger.info(`客户端${id}已断开连接`);
                this.clients = this.clients.filter(client => client !== webUser);
                logger.info(`当前在线客户端数：${this.clients.length}`);
            })
        });

    }

    async sendPrivate(id, data) {
        const client = this.clients.find(client => client.id == id);
        if (client) await client.send(data);
        else logger.warn(`客户端${id}不存在`);
    }


    broadcast(data) {
        logger.debug(`向所有客户端发送消息：${data}`);
        this.clients.forEach((client) => {
            client.send(data);
        });
    }

    generateId() {
        return Math.random().toString(36).slice(2, 11); // 生成一个长度为 9 的随机字符串作为ID
    }

}
