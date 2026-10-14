const http = require("http");
require("colors");
const { createApp } = require("./gateway-app");
const { attachClientRealtimeGateway } = require("./realtime/clientRealtimeGateway");
const { env } = require("../shared/config/env");

const app = createApp();
const server = http.createServer(app);

attachClientRealtimeGateway(server);

server.listen(env.port, (err) => {
  if (err) console.log(err);
  console.log(`API Gateway running in ${env.mode} on port ${env.port}`.bgGreen);
});
