import http from "http";
import express from "express";
import { applyMiddleware, applyRoutes } from "./utils";
import routes from "./services/routes";
import middleware from "./middleware";
import errorHandlers from "./middleware/errorHandlers";
import { Database } from "./database";
import { schedule } from "node-cron";
import { importHouses } from "./cron/importHouses";
import { config } from "dotenv";

config();

process.on("uncaughtException", (e) => {
    console.log(e);
    process.exit(1);
});
process.on("unhandledRejection", (e) => {
    console.log(e);
    process.exit(1);
});

const router = express();
applyMiddleware(middleware, router);
applyRoutes(routes, router);
applyMiddleware(errorHandlers, router);

const { PORT = 3000 } = process.env;
const server = http.createServer(router);

(async () => {
    await Database.connect();

    const task = schedule("0 6,8,10,12,14,16,18,20,22 * * *", async () => {
        console.log("JOB: Running automatic hourly import");
        await importHouses();
        console.log("JOB: DONE");
    });

    server.listen(PORT, () => {
        task.start();
        console.log(`Server is running http://localhost:${PORT}...`);
    });

    process.on("exit", async () => {
        await Database.disconnect();
        task.stop();
        console.log("SERVER DISCONNECTED");
    });
})();
