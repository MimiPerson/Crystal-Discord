import dotenv from "dotenv";
dotenv.config();

const config = {
  token: process.env.BOT_TOKEN || "rawr",
  clientId: "1352274077372383232",
  prefix: "!",
};

export default config;
