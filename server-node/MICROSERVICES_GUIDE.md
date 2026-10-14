# Microservices Implementation Guide

## ✅ Completed Components

### 1. Architecture Overview
The eCommerce project has been successfully converted into a **distributed microservices architecture** with clear separation of concerns:

```
Client (React App) 
        ↓
API Gateway (Port 8080) - Central routing hub
        ↓
    ├── Product Service (8081)
    ├── Cart Service (8082)
    ├── Order Service (8083)
    └── Payment Service (8084)
```

### 2. Microservices Created

#### **API Gateway** (services/gateway/)
- **Port**: 8080
- **Responsibility**: Route all client requests to appropriate services
- **Files**:
  - `gateway.js` - Entry point
  - `gateway-app.js` - Express app with routing logic
- **Key Routes**:
  - `/api/products/*` → Product Service
  - `/api/cart/*` → Cart Service
  - `/api/orders/*` → Order Service
  - `/api/payments/*` → Payment Service

#### **Product Service** (services/product/)
- **Port**: 8081
- **Responsibility**: Manage product catalog
- **Structure**:
  - `controllers/ProductController.js` - Request handlers
  - `services/ProductService.js` - Business logic
  - `repositories/ProductRepository.js` - Data access
  - `routes/productRoutes.js` - Express routes
  - `data/products.js` - Mock data
- **Endpoints**:
  - `GET /api/products` - List all products
  - `GET /api/products/:productId` - Get single product

#### **Cart Service** (services/cart/)
- **Port**: 8082
- **Responsibility**: Manage shopping carts and items
- **Structure**:
  - `controllers/CartController.js` - Request handlers
  - `services/CartService.js` - Business logic with inter-service calls
  - `repositories/CartRepository.js` - In-memory cart storage
  - `routes/cartRoutes.js` - Express routes
- **Endpoints**:
  - `GET /api/cart` - Get user's cart
  - `POST /api/cart/items` - Add item (calls Product Service)
  - `PATCH /api/cart/items/:productId` - Update quantity
  - `DELETE /api/cart/items/:productId` - Remove item
  - `DELETE /api/cart` - Clear cart
- **Special Features**:
  - Validates products with Product Service before adding
  - Automatically calculates totals

#### **Order Service** (services/order/)
- **Port**: 8083
- **Responsibility**: Handle order creation and management
- **Structure**:
  - `controllers/OrderController.js` - Request handlers
  - `services/OrderService.js` - Order business logic
  - `repositories/OrderRepository.js` - In-memory order storage
  - `routes/orderRoutes.js` - Express routes
- **Endpoints**:
  - `GET /api/orders` - List user's orders
  - `POST /api/orders` - Create new order
- **Special Features**:
  - Fetches cart from Cart Service
  - Processes payment via Payment Service
  - Clears cart after successful order
  - Validates checkout data

#### **Payment Service** (services/payment/)
- **Port**: 8084
- **Responsibility**: Create and verify Razorpay payments
- **Structure**:
  - `routes/paymentRoutes.js` - Express routes
- **Endpoints**:
  - `GET /api/payments/razorpay/key` - Get Razorpay public key
  - `POST /api/payments/razorpay/order` - Create Razorpay order
  - `POST /api/payments/razorpay/verify` - Verify Razorpay payment signature
  - `GET /api/payments/provider` - Get provider info
- **Special Features**:
  - HMAC signature verification
  - Razorpay order amount validation

### 3. Shared Utilities (services/shared/)

#### Config
- `config/env.js` - Centralized environment variables and service URLs

#### Middleware
- `middleware/errorHandler.js` - Consistent error handling
- `middleware/customerContext.js` - Extract customer ID from headers

#### Utils
- `utils/asyncHandler.js` - Wrap async controllers to catch errors
- `utils/createServiceApp.js` - Factory function to create Express apps
- `utils/rabbitmq.js` - RabbitMQ publisher and consumer helpers for async events
- `utils/realtimePublisher.js` - Publishes cart, order, and payment events to RabbitMQ
- `utils/makeServiceRequest.js` - HTTP client for inter-service communication

### 4. Configuration

#### .env File
```env
PORT=8080
DEV_MODE=development
CLIENT_ORIGIN=http://localhost:3000
GATEWAY_URL=http://localhost:8080
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_EXCHANGE=ecommerce.events

PRODUCT_SERVICE_URL=http://localhost:8081
PRODUCT_SERVICE_PORT=8081
CART_SERVICE_URL=http://localhost:8082
CART_SERVICE_PORT=8082
ORDER_SERVICE_URL=http://localhost:8083
ORDER_SERVICE_PORT=8083
PAYMENT_SERVICE_URL=http://localhost:8084
PAYMENT_SERVICE_PORT=8084
```

#### Updated package.json Scripts
```json
{
  "scripts": {
    "start": "node services/gateway/gateway.js",
    "gateway": "nodemon services/gateway/gateway.js",
    "product-service": "nodemon services/product/product-service.js",
    "cart-service": "nodemon services/cart/cart-service.js",
    "order-service": "nodemon services/order/order-service.js",
    "payment-service": "nodemon services/payment/payment-service.js",
    "client": "npm start --prefix ../client",
    "dev": "concurrently \"npm run gateway\" \"npm run product-service\" \"npm run cart-service\" \"npm run order-service\" \"npm run payment-service\" \"npm run client\""
  }
}
```

### 5. Docker Support

Created Docker configuration for containerized deployment:

- `Dockerfile.gateway` - Gateway container
- `Dockerfile.product` - Product service container
- `Dockerfile.cart` - Cart service container
- `Dockerfile.order` - Order service container
- `Dockerfile.payment` - Payment service container
- `docker-compose.yml` - Multi-container orchestration

## 🚀 How to Run

### Development Mode (All Services)
```bash
cd server
npm install
npm run dev
```

This starts:
- Gateway on http://localhost:8080
- Product Service on http://localhost:8081
- Cart Service on http://localhost:8082
- Order Service on http://localhost:8083
- Payment Service on http://localhost:8084
- Client on http://localhost:3000

### Individual Service (Development)
```bash
# Terminal 1
npm run gateway

# Terminal 2
npm run product-service

# Terminal 3
npm run cart-service

# Terminal 4
npm run order-service

# Terminal 5
npm run payment-service

# Terminal 6 (from client directory)
npm start
```

### Production Mode
```bash
npm start
# Only starts the Gateway. Other services should be started separately.
```

### Docker Mode
```bash
docker-compose up --build
```

In Docker mode, nginx listens on http://localhost and proxies to the API Gateway. RabbitMQ is available on AMQP port 5672 and the management UI on http://localhost:15672.

## 📊 Data Flow Examples

### Example 1: Fetch Products
```
Client GET /api/products
  ↓
Gateway (Port 8080)
  ↓
Product Service (Port 8081) - Returns product list
  ↓
Client receives: { success: true, products: [...] }
```

### Example 2: Add Item to Cart
```
Client POST /api/cart/items { productId, quantity }
  ↓
Gateway (Port 8080)
  ↓
Cart Service (Port 8082)
  ├─ Calls Product Service to validate product
  ├─ Updates in-memory cart
  └─ Returns updated cart
  ↓
Client receives: { success: true, cart: {...} }
```

### Example 3: Create Order
```
Client POST /api/orders { firstName, lastName, address, razorpay }
  ↓
Gateway (Port 8080)
  ↓
Order Service (Port 8083)
  ├─ Calls Cart Service to get cart
  ├─ Calls Payment Service to verify Razorpay payment
  ├─ Creates order in repository
  ├─ Calls Cart Service to clear cart
  └─ Returns order confirmation
  ↓
Client receives: { success: true, order: {...} }
```

## 🔌 Inter-Service Communication

Services communicate using HTTP with the `makeServiceRequest` utility:

```javascript
const { makeServiceRequest } = require("../../shared/utils/makeServiceRequest");

// Example: Call another service
const result = await makeServiceRequest(
  "http://localhost:8081",  // Service URL
  "GET",                     // HTTP method
  "/api/products/1",         // Path
  null,                      // Request body (null for GET)
  customerId                 // Customer context header
);
```

Services publish async events through RabbitMQ:

```javascript
const { publishRealtimeEvent } = require("../../shared/utils/realtimePublisher");

await publishRealtimeEvent("cart.updated", { customerId, cart });
```

## 🔐 Customer Context

- All services expect `x-customer-id` header
- Frontend passes it via API client
- Gateway forwards it to all downstream services
- Services use it to scope data per customer

## ✅ Health Checks

Each service exposes a health check endpoint:

```bash
# Gateway
curl http://localhost:8080/health

# Product Service
curl http://localhost:8081/health 

# Cart Service
curl http://localhost:8082/health

# Order Service
curl http://localhost:8083/health

# Payment Service
curl http://localhost:8084/health
```

Response:
```json
{
  "success": true,
  "service": "Product Service",
  "status": "up"
}
```

## 📁 Final Directory Structure

```
server/
│   ├── gateway/
│   │   ├── gateway.js
│   │   └── gateway-app.js
│   ├── product/
│   │   ├── product-service.js
│   │   ├── controllers/
│   │   ├── repositories/
│   │   ├── routes/
│   │   └── data/
│   ├── cart/
│   │   ├── cart-service.js
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   └── routes/
│   ├── order/
│   │   ├── order-service.js
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   └── routes/
│   ├── payment/
│   │   ├── payment-service.js
│   │   └── routes/
│   ├── shared/
│   │   ├── config/
│   │   ├── middleware/
│   │   └── utils/
│   └── README.md
├── controllers/          (Legacy - can be removed)
├── routes/             (Legacy - can be removed)
├── src/                (Legacy - can be removed)
├── package.json        (Updated with new scripts)
├── .env                (Updated with service URLs)
├── .env.example        (Template for configuration)
├── docker-compose.yml
├── Dockerfile.gateway
├── Dockerfile.product
├── Dockerfile.cart
├── Dockerfile.order
├── Dockerfile.payment
└── README.md
```

## 🔄 Service Dependencies

```
Product Service
  └─ No dependencies

Cart Service
  └─ Product Service

Order Service
  ├─ Cart Service
  └─ Payment Service

Payment Service
  └─ No dependencies

Gateway
  └─ All services
```

## 🚀 Next Steps (Future Enhancements)

### 1. Database Integration
Replace in-memory storage with MongoDB:
```javascript
// CartRepository using MongoDB
async findByCustomerId(customerId) {
  return Cart.findOne({ customerId });
}
```

### 2. Message Queue Consumers
RabbitMQ is configured for async events. Add consumers for inventory, email, analytics, or fulfillment workflows.

### 3. Service Discovery
Use Consul, Eureka, or built-in Docker DNS:
- Services register themselves
- Gateway dynamically discovers service URLs

### 4. Load Balancing
Nginx is configured as the reverse proxy. Add service replicas and upstream health checks for load balancing and failover.

### 5. Real-time Features
RabbitMQ is the internal event backbone. The API Gateway consumes those events and uses Socket.io only for browser-facing notifications:
- Live cart updates
- Order status notifications
- Real-time payment confirmations

### 6. API Documentation
Add Swagger/OpenAPI:
- Auto-generated API docs
- Interactive testing interface

### 7. Monitoring & Logging
Add Prometheus + Grafana:
- Service metrics collection
- Performance monitoring
- Alert setup

### 8. Authentication
Implement JWT validation:
- Centralized auth service
- Token validation middleware
- Role-based access control

## 📝 Testing Checklist

- [ ] All services start without errors
- [ ] Gateway routes requests correctly
- [ ] Products can be fetched
- [ ] Items can be added to cart
- [ ] Cart items can be updated/removed
- [ ] Orders can be created with payment
- [ ] Cart clears after order
- [ ] All health checks respond
- [ ] Error handling works correctly
- [ ] Customer context is maintained

## 🎯 Key Achievements

✅ Separated monolith into 5 independent microservices
✅ Implemented service-to-service communication
✅ Created API Gateway for unified entry point
✅ Added shared utilities for code reuse
✅ Configured environment management
✅ Created Docker configuration
✅ Maintained customer context throughout flow
✅ Proper error handling in all services
✅ Health check endpoints for monitoring
✅ Ready for database integration

## 📚 References

- [Microservices Architecture](https://martinfowler.com/microservices/)
- [Service-to-Service Communication](https://www.nginx.com/blog/microservices-communication/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
