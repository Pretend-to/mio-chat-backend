const logger = {
    info(msg, req = null) {
        const ip = req ? this.getIP(req) : null;
        console.log(`[Mio画图][${new Date().toISOString()}][INFO]${ip ? `[${ip}]` : ""} ${msg}`);
    },
    warn(msg, req = null) {
        const ip = req ? this.getIP(req) : null;
        console.log(`[Mio画图][${new Date().toISOString()}][WARN]${ip ? `[${ip}]` : ""} ${msg}`);
    },
    wrong(msg, req = null) {
        const ip = req ? this.getIP(req) : null;
        console.log(`[Mio画图][${new Date().toISOString()}][ERROR]${ip ? `[${ip}]` : ""} ${msg}`);
    },
    getIP(req) {
        return req?.headers["x-real-ip"] || req?.connection.remoteAddress || null;
    }
};

export default logger;
