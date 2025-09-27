# Frontend Details Guide for Tarım Yönetim Sistemi

This guide synthesizes information from various documentation files to provide a comprehensive understanding of the frontend architecture, its interaction with the backend, and key development patterns.

## 1. Core Technologies and Setup

As detailed in `reports/frontend_structure_report.md` and `memory-bank/techContext.md`:

*   **Framework:** Next.js (App Router)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS, Shadcn/ui (built on Radix UI)
*   **Form Management:** React Hook Form with Zod for validation
*   **Authentication:** NextAuth.js, `jose`, `jsonwebtoken`, `bcrypt`
*   **Data Visualization:** Recharts
*   **Database Interaction (Client-side):** `@prisma/client` (primarily for API routes, not direct client-side interaction)

**Development Setup:**

1.  Node.js and npm/Yarn are required.
2.  PostgreSQL database setup with `DATABASE_URL` in `.env.local`.
3.  Prisma setup: `npm install prisma --save-dev`, `npx prisma generate`, `npx prisma migrate dev`, `npx prisma db seed`.
4.  Install dependencies: `npm install`.
5.  Environment variables: `NEXTAUTH_SECRET`, `DATABASE_URL` in `.env.local`.

**Key Configurations:**

*   `next.config.mjs`: Ignores TypeScript and ESLint build errors (should be `false` for production), externalizes `bcrypt` for server components, and sets output to `standalone` for Vercel.
*   `tailwind.config.ts`: Configures Tailwind CSS, including dark mode, content paths, custom theme extensions (colors, borderRadius, keyframes, animations), and custom width/spacing variables.
*   `postcss.config.mjs`: Uses `tailwindcss` and `autoprefixer`.
*   `tsconfig.json`: Strict TypeScript configuration with path aliases (`@/*`).

## 2. Application Structure and Navigation

The application follows a modular structure, primarily driven by the Next.js App Router (`app/` directory).

*   **`app/`**: Contains pages, layouts, and API routes.
    *   **`app/api/`**: Backend API routes (Next.js API Routes) for various domains (e.g., `auth`, `billing`, `users`, `fields`, `inventory`, `irrigation`, `notifications`, `payments`, `processes`, `purchases`, `seasons`, `session`, `wells`, `worker`). These are the primary interaction points for frontend components to fetch and send data.
    *   **`app/dashboard/`**: The main authenticated area, likely with nested layouts and pages for different user roles (`admin`, `owner`, `worker`) and features. This is where most of the application's functionality resides.
    *   **`app/auth/`, `app/login/`**: Authentication-related pages.
    *   **`app/protected/`**: Pages requiring authentication.
    *   **`app/layout.tsx`**: Root layout for the entire application.

*   **`components/`**: Reusable React components, categorized by domain or purpose.
    *   **`components/ui/`**: Generic UI primitives built with Shadcn/ui (e.g., `button.tsx`, `input.tsx`, `dialog.tsx`). These are the building blocks for the application's visual elements.
    *   **`components/[feature]/`**: Feature-specific components (e.g., `components/inventory/inventory-form.tsx`, `components/processes/process-form.tsx`). These components often encapsulate business logic and interact with the API routes.
    *   **General UI components**: `app-sidebar.tsx`, `dashboard-header.tsx`, `main-sidebar.tsx`, `user-nav.tsx`, etc., which form the overall layout and navigation.

*   **`hooks/`**: Custom React hooks for reusable logic (e.g., `use-mobile.tsx`, `use-toast.ts`).

*   **`lib/`**: Utility functions and core logic.
    *   `auth.ts`, `jwt.ts`, `session.ts`: Authentication and session management.
    *   `prisma.ts`: Prisma client setup for database interactions (used by API routes).
    *   `utils.ts`: General utility functions.

*   **`types/`**: TypeScript type definitions for various data structures (e.g., `billing-types.ts`, `prisma-types.ts`). These are crucial for maintaining type safety across the frontend and backend.

## 3. Frontend-Backend Interaction Patterns

The frontend interacts with the backend primarily through Next.js API Routes (`app/api/`). The `reports/api-schemas.md` and `reports/database-interactions.md` provide detailed insights into these interactions.

**Key Interaction Principles:**

*   **RESTful APIs:** API routes generally follow RESTful principles for CRUD operations.
*   **Authentication & Authorization:** `getServerSideSession` is used for authentication. Authorization rules (ADMIN, OWNER, WORKER) are enforced on the backend, often by checking `x-user-role` HTTP headers. (See `reports/authorization-rules.md` for detailed rules).
*   **Data Fetching:** Frontend components make HTTP requests (e.g., using `fetch` or a library like SWR/React Query if integrated) to the API routes.
*   **Data Validation:** Input data is validated on the backend (and often on the frontend using Zod) to ensure data integrity.
*   **Complex Operations (Wizard Forms & Partial APIs):** For complex operations involving multiple database interactions (e.g., creating a `Process` or `IrrigationLog`), a multi-step form (wizard) approach is used on the frontend, coupled with partial API endpoints on the backend. This is crucial for performance and user experience.
    *   **Initiate Endpoint (`POST /api/[module]`):** Creates a draft record and returns an ID.
    *   **Intermediate Update Endpoint (`PUT /api/[module]/details/[id]`):** Updates specific parts of the draft record in subsequent steps.
    *   **Finalize Endpoint (`POST /api/[module]/finalize/[id]`):** Marks the record as complete and triggers asynchronous background tasks (e.g., cost calculations, notifications).
    *   **Examples:** This pattern is explicitly applied to `Process` (see `process_envanter.md`) and planned for `Irrigation` (see `irrigation_change.md`).

**Example Data Flow (Process Creation):**

1.  **Frontend (`components/processes/process-form.tsx`):** User fills in basic process details.
2.  **API Call:** `POST /api/processes` (Initiate) sends basic data. Backend creates a `Process` draft and returns `processId`.
3.  **Frontend:** Stores `processId` in state, moves to next step (e.g., inventory/equipment selection).
4.  **Frontend:** User selects inventory/equipment.
5.  **API Call:** `PUT /api/processes/[processId]` (Update) sends inventory/equipment data. Backend updates `Inventory` and `EquipmentUsage` records.
6.  **Frontend:** Moves to final step (summary/confirmation).
7.  **API Call:** `POST /api/processes/finalize/[processId]` (Finalize) sends final confirmation. Backend updates `Process` status to `COMPLETED` and triggers background tasks.

## 4. Key Data Models and Their Frontend Relevance

Based on `erDiagram.md` and `reports/api-schemas.md`:

*   **`User`**: Represents users with roles (ADMIN, OWNER, WORKER). Frontend components like `user-table.tsx` and authentication forms interact with this model.
*   **`Season`**: Defines agricultural seasons. Used in forms and lists related to fields, irrigation, and purchases.
*   **`Field`**: Represents agricultural fields. Frontend components like `fields-list.tsx` and `field-form.tsx` manage these.
*   **`FieldOwnership`**: Links users to fields with ownership percentages. Crucial for displaying relevant data to owners and for calculations (e.g., in `ProcessCost`, `FieldOwnerExpense`).
*   **`Well`**: Represents water wells. Managed by `well-form.tsx` and `well-list.tsx`.
*   **`IrrigationLog`**: Records irrigation events. `irrigation-form.tsx` and `irrigation-list.tsx` are key components. The multi-step form approach is being implemented here.
*   **`Inventory`**: Manages agricultural inputs (seeds, fertilizers). `inventory-form.tsx` and `inventory-table.tsx` are used for management. `InventoryOwnership` tracks who owns what share of inventory.
*   **`Process`**: Represents agricultural activities (planting, harvesting). `process-form.tsx` is a central component, utilizing the multi-step API pattern.
*   **`Purchase`**: Records purchases. `purchases-table.tsx` and `new-purchase-form.tsx` are used. `PurchaseContributor` tracks who contributed to a purchase.
*   **`Debt`**: Manages financial debts. `debt-form.tsx` and `debt-list.tsx` are relevant.
*   **`PaymentHistory`**: Records payment transactions.
*   **`Notification`**: System notifications. `notification-dropdown.tsx` and `notification-list.tsx` display these.
*   **`Equipment`**: Manages farm equipment. `equipment-form.tsx` and `equipment-table.tsx` are used.

## 5. Frontend Component Design Principles

*   **Modularity:** Components are designed to be independent and reusable.
*   **Component-Based Architecture:** UI is broken down into small, manageable React components.
*   **Type Safety:** Extensive use of TypeScript ensures type consistency from data models to UI props.
*   **Form Management:** `react-hook-form` simplifies form state management, validation, and submission.
*   **Styling Consistency:** Tailwind CSS and Shadcn/ui provide a consistent visual language and accelerate UI development.
*   **User Experience:** Emphasis on user-friendly interfaces, mobile responsiveness (`use-mobile.tsx`), and clear feedback (toast notifications via `use-toast.ts`). The wizard form pattern for complex operations is a prime example of UX focus.

This guide should serve as a comprehensive reference for understanding the frontend of the Tarım Yönetim Sistemi, its underlying technologies, and its interaction patterns with the backend.