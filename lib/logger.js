const logger = {
    info(msg, req = null) {
        const ip = req ? this.getIP(req) : null;
        console.log(`[Mio-Chat][${this.getTime()}][INFO]${ip ? `[${ip}]` : ""} ${msg}`);
    },
    warn(msg, req = null) {
        const ip = req ? this.getIP(req) : null;
        console.log(`[Mio-Chat][${this.getTime()}][WARN]${ip ? `[${ip}]` : ""} ${msg}`);
    },
    error(msg, req = null) {
        const ip = req ? this.getIP(req) : null;
        console.log(`[Mio-Chat][${this.getTime()}][ERROR]${ip ? `[${ip}]` : ""} ${msg}`);
    },
    getIP(req) {
        return req?.headers["x-real-ip"] || req?.connection.remoteAddress || null;
    },
    getTime() {
        const currentDate = new Date();
        const hours = currentDate.getHours().toString().padStart(2, "0");
        const minutes = currentDate.getMinutes().toString().padStart(2, "0");
        const seconds = currentDate.getSeconds().toString().padStart(2, "0");
        const milliseconds = currentDate.getMilliseconds().toString().padStart(3, "0");
    
        return `${hours}:${minutes}:${seconds}.${milliseconds}`;
    }
    
};

export default logger;
