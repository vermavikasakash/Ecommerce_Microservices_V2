import React, { useState } from "react";
import { Button, Form } from "react-bootstrap";
import { FiLogIn } from "react-icons/fi";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Layout from "../components/Layout/Layout";
import { useGlobalData } from "../context/contextApiProvider";

const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginOrSignup } = useGlobalData();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Enter a valid email address");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      await loginOrSignup({ email: normalizedEmail, password, mode });
      toast.success(mode === "login" ? "Logged in successfully" : "Account created");
      navigate(location.state?.from || "/cart", { replace: true });
    } catch (err) {
      setError("Invalid email or password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <section className="page-shell auth-shell">
        <Form className="auth-panel" onSubmit={handleSubmit}>
          <div className="auth-heading">
            <FiLogIn aria-hidden="true" />
            <div>
              <p className="eyebrow">Customer access</p>
              <h1>{mode === "login" ? "Login" : "Sign up"}</h1>
            </div>
          </div>

          <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => setMode("login")}
            >
              Login
            </button>
            <button
              type="button"
              className={mode === "signup" ? "active" : ""}
              onClick={() => setMode("signup")}
            >
              Sign up
            </button>
          </div>

          <Form.Group className="mb-3">
            <Form.Label>Email address</Form.Label>
            <Form.Control
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </Form.Group>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Continuing..." : "Continue"}
          </Button>
          {error && <p className="form-error">{error}</p>}
        </Form>
      </section>
    </Layout>
  );
};

export default AuthPage;
