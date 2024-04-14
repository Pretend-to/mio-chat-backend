import { startServer } from "./lib/server/http.js";
import taskScheduler from "./lib/corn.js";
import { statusCheck } from "./lib/check.js";


await statusCheck();
startServer();

const scheduler = new taskScheduler();
scheduler.init();