import { Routes, Route } from "react-router-dom";
import ProductPage from "./screens/ProductHomePage";
import ProductCartPage from "./screens/ProductCartPage";
import AuthPage from "./screens/AuthPage";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<ProductPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/cart" element={<ProductCartPage />} />
      </Routes>
    </>
  );
}

export default App;
