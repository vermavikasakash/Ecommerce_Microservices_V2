const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/UserModel");
const { env } = require("../../shared/config/env");

const SALT_ROUNDS = 10;

class AuthService {
  validateCredentials(email, password) {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const error = new Error("Valid email is required");
      error.statusCode = 400;
      throw error;
    }

    if (!password || password.length < 6) {
      const error = new Error("Password must be at least 6 characters");
      error.statusCode = 400;
      throw error;
    }
  }

  createToken(user) {
    return jwt.sign(
      {
        sub: user._id.toString(),
        email: user.email,
      },
      env.jwtSecret,
      { expiresIn: "7d" }
    );
  }

  formatUser(user) {
    return {
      id: user._id.toString(),
      email: user.email,
    };
  }

  async signup(email, password) {
    const normalizedEmail = email.trim().toLowerCase();
    this.validateCredentials(normalizedEmail, password);

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      const error = new Error("Email is already registered");
      error.statusCode = 409;
      throw error;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({ email: normalizedEmail, passwordHash });

    return {
      user: this.formatUser(user),
      token: this.createToken(user),
    };
  }

  async login(email, password) {
    const normalizedEmail = email.trim().toLowerCase();
    this.validateCredentials(normalizedEmail, password);

    const user = await User.findOne({ email: normalizedEmail });
    const passwordMatches = user && (await bcrypt.compare(password, user.passwordHash));

    if (!passwordMatches) {
      const error = new Error("Invalid email or password");
      error.statusCode = 401;
      throw error;
    }

    return {
      user: this.formatUser(user),
      token: this.createToken(user),
    };
  }
}

module.exports = { AuthService };
