import { createContext, useContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  addCartItemFunction,
  clearAuthUser,
  getAuthUser,
  getCartFunction,
  getOrdersFunction,
  loginFunction,
  removeCartItemFunction,
  saveAuthSession,
  signupFunction,
  updateCartItemFunction,
  confirmOrderFunction,
  cancelOrderFunction,
  prepareOrderFunction,
} from "../serviceApi/servicesApi";
import { getSocket, reconnectSocket } from "../serviceApi/socketClient";

const ContextApi = createContext();

const emptyCart = {
  items: [],
  total: 0,
};

const PENDING_CART_ITEM_KEY = "ecommerce_pending_cart_item";

const ContextProvider = ({ children }) => {
  const [cart, setCart] = useState(emptyCart);
  const [orders, setOrders] = useState([]);
  const [realtimeStatus, setRealtimeStatus] = useState("connecting");
  const [authUser, setAuthUser] = useState(() => getAuthUser());

  const isAuthenticated = Boolean(authUser);

  const refreshCart = async () => {
    const result = await getCartFunction();
    setCart(result.data.cart);
  };

  const refreshOrders = async () => {
    const result = await getOrdersFunction();
    setOrders(result.data.orders);
  };

  const addToCart = async (product) => {
    const result = await addCartItemFunction(product.id, 1);
    setCart(result.data.cart);
    toast.success("Item added to cart");
  };

  const queueCartItemAfterAuth = (product) => {
    localStorage.setItem(
      PENDING_CART_ITEM_KEY,
      JSON.stringify({ productId: product.id }),
    );
  };

  const consumePendingCartItem = async () => {
    const rawItem = localStorage.getItem(PENDING_CART_ITEM_KEY);
    if (!rawItem) return;

    localStorage.removeItem(PENDING_CART_ITEM_KEY);

    try {
      const pendingItem = JSON.parse(rawItem);
      if (!pendingItem?.productId) return;
      const result = await addCartItemFunction(pendingItem.productId, 1);
      setCart(result.data.cart);
      toast.success("Item added to cart");
    } catch (err) {
      toast.error("Unable to add pending cart item");
    }
  };

  const loginOrSignup = async ({ email, password, mode }) => {
    const result =
      mode === "signup"
        ? await signupFunction(email, password)
        : await loginFunction(email, password);
    const user = saveAuthSession(result.data);
    setAuthUser(user);
    reconnectSocket();
    await refreshCart();
    await refreshOrders();
    await consumePendingCartItem();
    return user;
  };

  const logout = () => {
    clearAuthUser();
    setAuthUser(null);
    setCart(emptyCart);
    setOrders([]);
    reconnectSocket();
  };

  const updateCartItem = async (productId, quantity) => {
    const result = await updateCartItemFunction(productId, quantity);
    setCart(result.data.cart);
  };

  const removeCartItem = async (productId) => {
    const result = await removeCartItemFunction(productId);
    setCart(result.data.cart);
  };

  const placeOrder = async (checkoutPayload) => {
    const { idempotencyKey, ...payload } = checkoutPayload;
    const result = await confirmOrderFunction(payload, idempotencyKey);
    setOrders((currentOrders) => [result.data.order, ...currentOrders]);
    setCart(emptyCart);
    return result.data.order;
  };

  const prepareCheckout = async (checkoutPayload, idempotencyKey) => {
    const result = await prepareOrderFunction(checkoutPayload, idempotencyKey);
    return result.data;
  };

  const cancelCheckout = async (idempotencyKey) => {
    const result = await cancelOrderFunction(idempotencyKey);
    return result.data.order;
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setRealtimeStatus("disconnected");
      return undefined;
    }

    refreshCart();
    refreshOrders();

    const socket = getSocket();
    socket.on("connect", () => {
      setRealtimeStatus("connected");
      console.log("Socket connected:", socket.id);
    });
    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
    });
    socket.on("gateway:connected", (data) => {
      console.log("Realtime gateway ready:", data);
    });

    socket.on("disconnect", () => setRealtimeStatus("disconnected"));
    socket.on("cart:updated", (payload) => {
      setCart(payload.cart);
      console.log("Cart updated:", payload);
    });
    
    socket.on("order:created", (payload) =>
      setOrders((currentOrders) => {
        const exists = currentOrders.some(
          (order) => order.id === payload.order.id,
        );
        return exists ? currentOrders : [payload.order, ...currentOrders];
      }),
    );
    socket.on("payment:completed", () => toast.success("Payment captured"));

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("cart:updated");
      socket.off("order:created");
      socket.off("payment:completed");
    };
  }, [isAuthenticated]);

  const value = {
    cart,
    orders,
    authUser,
    isAuthenticated,
    realtimeStatus,
    cartCount: cart.items.reduce((total, item) => total + item.quantity, 0),
    refreshCart,
    refreshOrders,
    addToCart,
    queueCartItemAfterAuth,
    loginOrSignup,
    logout,
    updateCartItem,
    removeCartItem,
    prepareCheckout,
    cancelCheckout,
    placeOrder,
  };

  return <ContextApi.Provider value={value}>{children}</ContextApi.Provider>;
};

const useGlobalData = () => useContext(ContextApi);

export { ContextProvider, useGlobalData };
