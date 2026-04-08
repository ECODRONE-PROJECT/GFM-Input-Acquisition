# Grow For Me - Input Acquisition Platform

A Next.js e-commerce and administrative platform designed to connect smallholder farmers with vital agricultural inputs such as seeds and fertilizers. It features a responsive, modern storefront with cart management, a secure checkout pipeline, an active-section navigation bar, and a comprehensive CMS for inventory control.

## Getting Started

### Prerequisites
- Node.js 18+ or 20+ installed
- NPM package manager

### Installation

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Set up the internal database (via Prisma):
   ```bash
   npx prisma db push
   npx prisma generate
   ```

3. Run the development environment:
   ```bash
   npm run dev
   ```

## Accessing the Platform

Navigate to `http://localhost:3000` to view the main landing page.

### Storefront

| Page | URL | Description |
|------|-----|-------------|
| Landing Page | `http://localhost:3000` | Main homepage with navigation, hero, and sections |
| Shop / Catalog | `http://localhost:3000/shop` | Browse, filter, and sort agricultural inputs by category, price, and stock status |
| Cart | `http://localhost:3000/cart` | Review cart items and proceed to checkout |
| Checkout | `http://localhost:3000/checkout` | Secure order placement (requires authentication) |
| Register | `http://localhost:3000/register` | Create a new farmer account |
| Login | `http://localhost:3000/login` | Sign in to an existing account |

### Admin Dashboard

| Page | URL | Description |
|------|-----|-------------|
| Dashboard | `http://localhost:3000/admin` | View, filter, and sort all catalog items |
| Add Item | `http://localhost:3000/admin/inputs/new` | Create a new catalog entry with price, stock, brand, weight, size, and image |
| Edit Item | `http://localhost:3000/admin/inputs/[id]/edit` | Modify any existing catalog item |

> **Note:** During local development, the admin dashboard uses a mock request header (`x-admin-mock: true`) to bypass JWT authentication. This is not present in production builds.

## Tech Stack

| Technology | Purpose |
|---|---|
| Next.js 16+ (App Router) | Full-stack React framework |
| React 19 | UI component library |
| Prisma ORM (SQLite) | Database access layer |
| Vitest + React Testing Library | Unit testing |
| GitHub Actions | CI/CD pipeline |

## CI/CD

The GitHub Actions CI pipeline runs automatically on all pushes and pull requests to `main` and `develop`. It performs the following steps:

1. Install dependencies (`npm ci`)
2. Generate Prisma client (`npx prisma generate`)
3. Run the linter (`npm run lint`)
4. Run unit tests (`npm test`)
5. Verify the production build (`npm run build`)
