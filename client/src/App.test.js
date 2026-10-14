import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ContextProvider } from "./context/contextApiProvider";

jest.mock("./serviceApi/servicesApi", () => ({
  API_BASE_URL: "http://localhost:8080",
  clearAuthUser: jest.fn(),
  getAuthUser: () => null,
  getAuthToken: () => null,
  getCustomerId: () => "test-customer",
  saveAuthSession: jest.fn(),
  loginFunction: jest.fn(),
  signupFunction: jest.fn(),
  getProductsFunction: () =>
    Promise.resolve({
      data: {
        products: [],
      },
    }),
  addCartItemFunction: jest.fn(),
  updateCartItemFunction: jest.fn(),
  removeCartItemFunction: jest.fn(),
  createOrderFunction: jest.fn(),
  getCartFunction: () =>
    Promise.resolve({
      data: {
        cart: {
          items: [],
          total: 0,
        },
      },
    }),
  getOrdersFunction: () =>
    Promise.resolve({
      data: {
        orders: [],
      },
    }),
  getRazorpayKeyFunction: jest.fn(),
  createRazorpayOrderFunction: jest.fn(),
}));

jest.mock("./serviceApi/socketClient", () => ({
  getSocket: () => ({
    on: jest.fn(),
    off: jest.fn(),
  }),
  reconnectSocket: jest.fn(),
}));

test("renders product catalog route", async () => {
  render(
    <ContextProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ContextProvider>
  );

  await waitFor(() =>
    expect(screen.getByRole("heading", { name: /products/i })).toBeInTheDocument()
  );
});
