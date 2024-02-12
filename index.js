import { startServer } from "./lib/server.js";
import taskScheduler from "./lib/corn.js";

startServer();

const scheduler = new taskScheduler();
scheduler.init();