import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API || "";
const CUSTOMER_KEY = "ecommerce_customer_id";
const AUTH_USER_KEY = "ecommerce_auth_user";
const AUTH_TOKEN_KEY = "ecommerce_auth_token";

const getCustomerId = () => {
  const authUser = getAuthUser();
  if (authUser?.id) return authUser.id;

  return localStorage.getItem(CUSTOMER_KEY);
};

const getAuthToken = () => localStorage.getItem(AUTH_TOKEN_KEY);

const getAuthUser = () => {
  const rawUser = localStorage.getItem(AUTH_USER_KEY);
  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser);
  } catch {
    localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
};

const saveAuthSession = ({ user, token }) => {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(CUSTOMER_KEY, user.id);
  return user;
};

const clearAuthUser = () => {
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(CUSTOMER_KEY);
};

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});

apiClient.interceptors.request.use((config) => {
  const customerId = getCustomerId();
  const token = getAuthToken();

  return {
    ...config,
    headers: {
      ...config.headers,
      ...(customerId ? { "x-customer-id": customerId } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  };
});

const loginFunction = (email, password) => apiClient.post("/auth/login", { email, password });
const signupFunction = (email, password) => apiClient.post("/auth/signup", { email, password });
const getProductsFunction = () => apiClient.get("/products");
const getCartFunction = () => apiClient.get("/cart");
const addCartItemFunction = (productId, quantity = 1) =>
  apiClient.post("/cart/items", { productId, quantity });
const updateCartItemFunction = (productId, quantity) =>
  apiClient.patch(`/cart/items/${productId}`, { quantity });
const removeCartItemFunction = (productId) => apiClient.delete(`/cart/items/${productId}`);
const clearCartFunction = () => apiClient.delete("/cart");
const createOrderFunction = (payload) => apiClient.post("/orders", payload);
const prepareOrderFunction = (payload, idempotencyKey) =>
  apiClient.post("/orders/prepare", payload, {
    headers: { "Idempotency-Key": idempotencyKey },
  });
const confirmOrderFunction = (payload, idempotencyKey) =>
  apiClient.post("/orders/confirm", payload, {
    headers: { "Idempotency-Key": idempotencyKey },
  });
const cancelOrderFunction = (idempotencyKey) =>
  apiClient.post("/orders/cancel", null, {
    headers: { "Idempotency-Key": idempotencyKey },
  });
const getOrdersFunction = () => apiClient.get("/orders");
const getRazorpayKeyFunction = () => apiClient.get("/payments/razorpay/key");
const createRazorpayOrderFunction = (amount) =>
  apiClient.post("/payments/razorpay/order", { amount });

export {
  API_BASE_URL,
  clearAuthUser,
  getAuthUser,
  getAuthToken,
  getCustomerId,
  saveAuthSession,
  loginFunction,
  signupFunction,
  getProductsFunction,
  getCartFunction,
  addCartItemFunction,
  updateCartItemFunction,
  removeCartItemFunction,
  clearCartFunction,
  createOrderFunction,
  prepareOrderFunction,
  confirmOrderFunction,
  cancelOrderFunction,
  getOrdersFunction,
  getRazorpayKeyFunction,
  createRazorpayOrderFunction,
};
