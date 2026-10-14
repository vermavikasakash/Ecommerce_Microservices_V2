const { publishEvent } = require("./rabbitmq");

const publishRealtimeEvent = async (eventName, payload) => {
  try {
    await publishEvent(eventName, payload);
  } catch (err) {
    console.warn(`Unable to publish RabbitMQ event ${eventName}: ${err.message}`);
  }
};

module.exports = { publishRealtimeEvent };
