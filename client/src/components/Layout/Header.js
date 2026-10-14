import React from "react";
import { NavLink } from "react-router-dom";
import { FiLogIn, FiLogOut, FiShoppingBag, FiShoppingCart } from "react-icons/fi";
import { useGlobalData } from "../../context/contextApiProvider";

const Header = () => {
  const { authUser, cartCount, isAuthenticated, logout } = useGlobalData();

  return (
    <nav className="app-nav">
      <NavLink to="/" className="brand-link">
        <FiShoppingBag aria-hidden="true" />
        <span>Commerce Mesh</span>
      </NavLink>
      <div className="nav-actions">
        <NavLink to="/" className="nav-link">
          Products
        </NavLink>
        <NavLink to="/cart" className="nav-link cart-link">
          <FiShoppingCart aria-hidden="true" />
          <span>Cart</span>
          <strong>{cartCount}</strong>
        </NavLink>
        {isAuthenticated ? (
          <button type="button" className="nav-link nav-button" onClick={logout}>
            <FiLogOut aria-hidden="true" />
            <span>{authUser.email}</span>
          </button>
        ) : (
          <NavLink to="/auth" className="nav-link cart-link">
            <FiLogIn aria-hidden="true" />
            <span>Login</span>
          </NavLink>
        )}
      </div>
    </nav>
  );
};

export default Header;
