# Grow For Me - Input Acquisition Platform

A robust Next.js e-commerce and administrative platform designed to connect smallholder farmers with vital agricultural inputs like seeds and fertilizer. It features a responsive, dynamic storefront with cart management, a secure checkout pipeline, and a comprehensive CMS for granular inventory control.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or 20+ installed
- NPM, Yarn, or PNPM package manager

### Installation
1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Setup the internal Database natively (via Prisma):
   ```bash
   npx prisma db push
   npx prisma generate
   ```

3. Run the development environment:
   ```bash
   npm run dev
   ```

## 🛒 Accessing the Storefront Endpoints
Navigate to **`http://localhost:3000`** to view the main landing page and interactive portal.
- **Store & Product Catalog**: `http://localhost:3000/shop` — This dashboard allows farmers to filter, sort, dynamically input raw quantities, and add items natively to their cart.
- **Cart & Secured Checkout**: `http://localhost:3000/cart`

## ⚙️ Accessing the Admin Dashboard CMS
The Admin CMS acts as the strict moderator portal empowering team accounts to execute complete CRUD operations explicitly across all public inventory metrics.
- **Admin Dashboard**: `http://localhost:3000/admin`
- *Note: During local development iterations, the admin dashboard leverages a mock header intercept granting immediate execution capabilities securely eliminating the heavy JWT provider necessity.*

## 🛠 Tech Stack Details
- Next.js 15+ (App Router specifically)
- React 19 Native Integration
- Prisma ORM (SQLite binding natively)
- High-Performance UI Automations utilizing `Vitest` and `React Testing Library`.
