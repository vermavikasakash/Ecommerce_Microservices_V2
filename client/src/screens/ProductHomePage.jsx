import React, { useEffect, useState } from "react";
import { Button, Spinner } from "react-bootstrap";
import { FiShoppingCart } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Layout from "../components/Layout/Layout";
import { useGlobalData } from "../context/contextApiProvider";
import { getProductsFunction } from "../serviceApi/servicesApi";

const ProductHomePage = () => {
  const [loader, setLoader] = useState(false);
  const [products, setProducts] = useState([]);
  const navigate = useNavigate();
  const { addToCart, isAuthenticated, queueCartItemAfterAuth } = useGlobalData();

  const getProducts = async () => {
    try {
      setLoader(true);
      const result = await getProductsFunction();
      setProducts(result.data.products);
    } catch (error) {
      toast.error("Unable to fetch products");
    } finally {
      setLoader(false);
    }
  };

  useEffect(() => {
    getProducts();
  }, []);

  const handleAddToCart = async (product) => {
    if (!isAuthenticated) {
      queueCartItemAfterAuth(product);
      navigate("/auth", { state: { from: "/", intent: "add-to-cart" } });
      return;
    }

    await addToCart(product);
  };

  return (
    <Layout>
      <section className="page-shell">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Microservice catalog</p>
            <h1>Products</h1>
          </div>
          <span className="status-pill">Live inventory</span>
        </div>

        {loader ? (
          <div className="empty-state">
            <Spinner animation="border" />
          </div>
        ) : (
          <div className="product-grid">
            {products.map((product) => (
              <article className="product-card" key={product.id}>
                <div className="product-image-wrap">
                  <img src={product.image} alt={product.name} className="product-image" />
                </div>
                <div className="product-content">
                  <div>
                    <h3>{product.name}</h3>
                    <p>{product.description}</p>
                  </div>
                  <div className="product-footer">
                    <div>
                      <strong>&#8377;{product.price}</strong>
                      <span>{product.stock} in stock</span>
                    </div>
                    <Button onClick={() => handleAddToCart(product)} title="Add to cart">
                      <FiShoppingCart aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
};

export default ProductHomePage;
