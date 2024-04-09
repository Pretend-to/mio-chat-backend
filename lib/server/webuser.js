import EventEmitter from "events";
import logger from "../logger.js";


export default class WebUser extends EventEmitter  {
    constructor(id,socket) {
        super();
        this.id = id;
        this.socket = socket;

        this.socket.on("close", () => {
            this.emit("close", this.id);
        });
        
        this.socket.on("message", (message) => {
            let e;
            try {
                e = JSON.parse(message);
                // 校验消息合法性
                if (!e.request_id ||!e.protocol ||!e.data) {
                    throw new Error("消息格式错误");
                }
            }catch (error) {
                logger.error("客户端 " + this.id + " 传入非法消息" + message);
                return;
            }
            
            if (e.protocol === "onebot") {
                logger.debug(e.data.content);
                const text = e.data.content.filter(c => c.type === "text")[0].data.text;
                if (text) {
                    this.emit("message", e);
                    logger.info(`收到来自 ${this.id} 的消息：${text}`);
                }else {
                    logger.info(`收到来自 ${this.id} 的图片`);
                }
            }
        });

    }
    async send(message) {
        // TODO: 发送消息到客户端
        // logger.debug(message);
        this.socket.send(JSON.stringify(message));
    }
    
    

    // 一个用户发送的消息
    // {
    //     request_id: 1234567890,
    //     protocol: "onebot",
    //     data：{
    //         type: "message"，
    //         content: [
    //             {
    //                 type: "text",
    //                 data: {
    //                     text: "Hello, world!"
    //                 }
    //             },
    //             {
    //                 type: "image",
    //                 data: {
    //                     image: "https://example.com/image.jpg"
    //                 }
    //             }
    //         ]
    //     }
    // }

    
}