# Grow For Me - Input Acquisition System

This system comprises a modern web environment focused specifically on the "Inputs Acquisition" aspect, aggregating demand organically for seeds, fertilizers, and equipment.

## Technical Architecture
- **Framework**: Next.js 14 App Router (Fuses Frontend and Backend internally for optimized performance).
- **Styling Paradigm**: Vanilla CSS infused dynamically aligning perfectly with GrowForMe branding guidelines.
- **Persistence Layer**: Prisma ORM with local SQLite support representing decoupled scalable logic.
- **Auth Strategy**: Embedded bcrypt TDD-tested verification bridging explicit API endpoints.

## Operations and Running (Local)
1. Install Node modules: `npm install`
2. Sync Prisma structures: `npx prisma db push`
3. Launch environment: `npm run dev`

Visit: `http://localhost:3000`

## Containerization
To ensure consistent execution without environment disparities, the entire stack (both frontend UI and foundational backend APIs natively combined via Next.js standalone tracing) is Dockerized.
```bash
docker-compose up --build -d
```
The application reliably surfaces via `http://localhost:3000` executing securely inside the container.

## Quality Assurance & TDD
Verified utilizing `vitest` assertions specifically bridging local logic to secure endpoints efficiently. Run validations using:
```bash
npm run test
```
