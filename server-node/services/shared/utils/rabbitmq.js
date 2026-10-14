const amqp = require("amqplib");
const { env } = require("../config/env");

let connectionPromise;
let channelPromise;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const connect = async () => {
  if (!connectionPromise) {
    connectionPromise = amqp.connect(env.rabbitmq.url).catch((err) => {
      connectionPromise = null;
      throw err;
    });
  }

  return connectionPromise;
};

const getChannel = async () => {
  if (!channelPromise) {
    channelPromise = connect()
      .then((connection) => {
        connection.on("close", () => {
          connectionPromise = null;
          channelPromise = null;
        });
        connection.on("error", () => {
          connectionPromise = null;
          channelPromise = null;
        });
        return connection.createChannel();
      })
      .then(async (channel) => {
        await channel.assertExchange(env.rabbitmq.exchange, "fanout", { durable: true });
        return channel;
      })
      .catch((err) => {
        channelPromise = null;
        throw err;
      });
  }

  return channelPromise;
};

const publishEvent = async (eventName, payload = {}) => {
  const channel = await getChannel();
  const event = {
    eventName,
    payload,
    occurredAt: new Date().toISOString(),
  };

  return channel.publish(
    env.rabbitmq.exchange,
    "",
    Buffer.from(JSON.stringify(event)),
    {
      contentType: "application/json",
      persistent: true,
      timestamp: Date.now(),
    }
  );
};

const subscribeToEvents = async (queueName, handler, options = {}) => {
  const retryDelayMs = options.retryDelayMs || 5000;

  for (;;) {
    try {
      const channel = await getChannel();
      const assertedQueue = await channel.assertQueue(queueName, { durable: true });
      await channel.bindQueue(assertedQueue.queue, env.rabbitmq.exchange, "");

      await channel.consume(assertedQueue.queue, async (message) => {
        if (!message) return;

        try {
          const event = JSON.parse(message.content.toString());
          await handler(event);
          channel.ack(message);
        } catch (err) {
          console.error(`RabbitMQ event handling failed: ${err.message}`);
          channel.nack(message, false, false);
        }
      });

      console.log(`RabbitMQ consumer connected to ${assertedQueue.queue}`);
      return;
    } catch (err) {
      console.warn(`RabbitMQ unavailable (${err.message}). Retrying in ${retryDelayMs}ms`);
      await wait(retryDelayMs);
    }
  }
};

module.exports = { publishEvent, subscribeToEvents };
