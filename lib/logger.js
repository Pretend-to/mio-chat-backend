const logger = {
    info(msg, req = null) {
        const ip = req ? this.getIP(req) : null;
        console.log(`[Mio画图][${this.getTime()}][INFO]${ip ? `[${ip}]` : ""} ${msg}`);
    },
    warn(msg, req = null) {
        const ip = req ? this.getIP(req) : null;
        console.log(`[Mio画图][${this.getTime()}][WARN]${ip ? `[${ip}]` : ""} ${msg}`);
    },
    wrong(msg, req = null) {
        const ip = req ? this.getIP(req) : null;
        console.log(`[Mio画图][${this.getTime()}][ERROR]${ip ? `[${ip}]` : ""} ${msg}`);
    },
    getIP(req) {
        return req?.headers["x-real-ip"] || req?.connection.remoteAddress || null;
    },
    getTime() {
        // return tile like 18:11:03.874
        return new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit", millisecond: "3-digit" });
    }
};

export default logger;
