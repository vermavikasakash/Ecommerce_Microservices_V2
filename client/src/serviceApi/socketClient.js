
import { io } from "socket.io-client";
import { getCustomerId } from "./servicesApi";

const SOCKET_URL =
  process.env.REACT_APP_SOCKET_URL || "http://localhost:8086";

let socket;

const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      query: {
        customerId: getCustomerId(),
      },
      transports: ["websocket", "polling"],
    });
  }

  return socket;
};

const reconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  return getSocket();
};

export { getSocket, reconnectSocket };
