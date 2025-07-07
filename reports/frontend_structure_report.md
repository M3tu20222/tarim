# Frontend Structure Report

This report details the frontend architecture and key components of the application.

## 1. Project Overview

Based on `package.json`:

*   **Name:** `my-v0-project`
*   **Version:** `0.1.0`
*   **Private:** `true`
*   **Scripts:**
    *   `dev`: `next dev`
    *   `build`: `next build`
    *   `start`: `next start`
    *   `lint`: `next lint`
    *   `eslint`: `eslint . --ext .js,.jsx,.ts,.tsx`
*   **Prisma:** Seed script configured.

### Dependencies (Key ones)

*   **Framework:** `next` (Next.js)
*   **UI Components:** `@radix-ui/*` (Radix UI), `react-day-picker`, `recharts` (for charts), `sonner` (toasts)
*   **Styling:** `tailwindcss`, `tailwindcss-animate`, `autoprefixer`, `postcss`
*   **Form Management:** `react-hook-form`, `@hookform/resolvers`, `zod` (schema validation)
*   **Authentication/Authorization:** `jose`, `jsonwebtoken`, `bcrypt`, `cookies-next`, `js-cookie`
*   **Database ORM (Client):** `@prisma/client`
*   **Utilities:** `clsx`, `tailwind-merge`, `date-fns`

### Development Dependencies (Key ones)

*   `typescript`
*   `eslint`, `@next/eslint-plugin-next`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`
*   `prettier`
*   `prisma` (CLI/toolkit)
*   `ts-node`

## 2. Framework & Configuration

### Next.js Configuration (`next.config.mjs`)

*   **TypeScript:** `ignoreBuildErrors: true` (Note: This should ideally be `false` in production for strict type checking)
*   **ESLint:** `ignoreDuringBuilds: true` (Note: Similar to TypeScript, this should be `false` for strict linting)
*   **Server External Packages:** `bcrypt` (explicitly externalized for server components)
*   **Output:** `standalone` (optimized for Vercel deployment)

### Tailwind CSS Configuration (`tailwind.config.ts`)

*   **Dark Mode:** Enabled (`class`)
*   **Content Paths:** Configured to scan `pages`, `components`, `app` directories, and root-level files for Tailwind classes.
*   **Theme Extension:**
    *   Custom color palette defined using CSS variables (e.g., `--border`, `--primary`, `--neon-cyan`).
    *   Custom border radius values.
    *   Keyframes and animations for `accordion-down` and `accordion-up`.
    *   Custom width and spacing variables (`--sidebar-width`, `--sidebar-width-icon`).
*   **Plugins:** `tailwindcss-animate`

### PostCSS Configuration (`postcss.config.mjs`)

*   Uses `tailwindcss` and `autoprefixer` plugins.

### TypeScript Configuration (`tsconfig.json`)

*   **Target:** `es6`
*   **Libraries:** `dom`, `dom.iterable`, `esnext`
*   **Strictness:** `strict: true`, `strictNullChecks: true`
*   **Module Resolution:** `node`
*   **JSX:** `preserve`
*   **Base URL:** `.` with path alias `@/*` mapping to `./*`
*   **Includes:** `**/*.ts`, `**/*.tsx`, `next-env.d.ts`, `.next/types/**/*.ts`
*   **Excludes:** `node_modules`

## 3. Directory Structure & Key Files

### `app/` (Next.js App Router)

This directory contains the core application pages, layouts, and API routes, leveraging Next.js 13+ App Router features.

*   **`app/api/`**: Contains API routes, organized by domain (e.g., `auth`, `billing`, `users`, `fields`, `inventory`, `irrigation`, `notifications`, `payments`, `processes`, `purchases`, `seasons`, `session`, `wells`, `worker`). Each subdirectory likely contains `route.ts` files for handling API requests.
*   **`app/auth/`**: Authentication-related pages and layouts (e.g., `layout.tsx`, `page.tsx` for login/logout).
*   **`app/dashboard/`**: Main application dashboard, likely with nested layouts and pages for different user roles (admin, owner, worker) and features (inventory, purchases, debts, equipment, fields, irrigation, processes, seasons, wells, notifications, users).
    *   `DashboardLayoutClient.tsx`: A client component for the dashboard layout.
    *   `layout.tsx`, `loading.tsx`: Common layout and loading states for the dashboard.
*   **`app/doc/`**: Documentation pages.
*   **`app/login/`**: Login page.
*   **`app/protected/`**: Pages requiring authentication.
*   **`app/` (root)**:
    *   `layout.tsx`: Root layout for the entire application.
    *   `page.tsx`: Home page.
    *   `globals.css`: Global CSS styles.
    *   `favicon.ico`: Favicon.

### `components/`

This directory houses reusable React components, often categorized by their domain or purpose.

*   **General UI:** `app-sidebar.tsx`, `dashboard-header.tsx`, `dashboard-layout.tsx`, `dashboard-nav.tsx`, `date-range-picker.tsx`, `login-form.tsx`, `main-sidebar.tsx`, `mobile-nav.tsx`, `protected-page.tsx`, `session-provider.tsx`, `theme-provider.tsx`, `theme-toggle.tsx`, `user-nav.tsx`, `user-table.tsx`.
*   **Admin:** `admin-activity-chart.tsx`, `admin-overview-stats.tsx`, `admin-recent-users.tsx`.
*   **Billing:** `billing/billing-period-form.tsx`, `billing/well-bill-form.tsx`.
*   **Dashboard:** `dashboard/dashboard-stats.tsx`, `dashboard/overview.tsx`, `dashboard/recent-activity.tsx`, `dashboard/recent-sales.tsx`, `dashboard/weather-widget.tsx`.
*   **Debts:** `debts/debt-form.tsx`, `debts/debt-list.tsx`, `debts/debt-payment-form.tsx`, `debts/debt-reminder.tsx`.
*   **Equipment:** `equipment/equipment-form.tsx`, `equipment/equipment-table.tsx`.
*   **Fields:** `fields-list.tsx`, `fields/field-form.tsx`, `fields/field-ownership-form.tsx`, `fields/fields-list.tsx`, `fields/new-field-form.tsx`, `fields/processing-form.tsx`.
*   **Inventory:** `inventory/inventory-actions.tsx`, `inventory/inventory-category-update.tsx`, `inventory/inventory-form.tsx`, `inventory/inventory-report.tsx`, `inventory/inventory-selector.tsx`, `inventory/inventory-table-skeleton.tsx`, `inventory/inventory-table.tsx`, `inventory/new-inventory-form.tsx`.
*   **Irrigation:** `irrigation/irrigation-form.tsx`, `irrigation/irrigation-list-skeleton.tsx`, `irrigation/irrigation-list.tsx`, `irrigation/irrigation-stats.tsx`.
*   **Notifications:** `notifications/notification-counter.tsx`, `notifications/notification-dropdown.tsx`, `notifications/notification-list.tsx`, `notifications/notification-send-form.tsx`.
*   **Owner Specific:** `owner-irrigation-chart.tsx`, `owner-overview-stats.tsx`, `owner-recent-fields.tsx`.
*   **Payments:** `payments/payment-form.tsx`.
*   **Processes:** `processes/inventory-group.tsx`, `processes/process-actions.tsx`, `processes/process-details.tsx`, `processes/process-form.tsx`, `processes/process-table.tsx`.
*   **Purchases:** `purchases/edit-purchase-form.tsx`, `purchases/enhanced-purchase-form.tsx`, `purchases/new-purchase-form.tsx`, `purchases/purchase-actions.tsx`, `purchases/purchase-approval.tsx`, `purchases/purchase-details.tsx`, `purchases/purchase-template-list.tsx`, `purchases/purchases-table-skeleton.tsx`, `purchases/purchases-table.tsx`, `purchases/related-records-panel.tsx`.
*   **Seasons:** `seasons/season-form.tsx`, `seasons/season-list.tsx`.
*   **UI (Shadcn/Radix UI components):** A dedicated `ui/` subdirectory containing various UI primitives built on top of Radix UI and styled with Tailwind CSS (e.g., `accordion.tsx`, `alert-dialog.tsx`, `button.tsx`, `calendar.tsx`, `card.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `form.tsx`, `input.tsx`, `label.tsx`, `select.tsx`, `table.tsx`, `toast.tsx`).
*   **Users:** `users/add-user-dialog.tsx`, `users/delete-user-dialog.tsx`, `users/edit-user-dialog.tsx`, `users/user-management.tsx`, `users/user-table.tsx`.
*   **Wells:** `wells/well-form.tsx`, `wells/well-list.tsx`.
*   **Worker Specific:** `worker-fields-list.tsx`, `worker-overview-stats.tsx`, `worker-recent-tasks.tsx`, `worker-tasks-chart.tsx`, `worker/process-update-form.tsx`, `worker/worker-field-detail.tsx`, `worker/worker-fields-list.tsx`, `worker/worker-irrigation-form.tsx`, `worker/worker-irrigation-list.tsx`, `worker/worker-overview.tsx`, `worker/worker-process-form.tsx`, `worker/worker-process-list.tsx`, `worker/worker-settings.tsx`.

### `hooks/`

Contains custom React hooks for encapsulating reusable logic.

*   `use-mobile.tsx`: Likely for responsive design or mobile-specific logic.
*   `use-toast.ts`: For displaying toast notifications.

### `lib/`

Houses utility functions and core logic.

*   `auth.ts`: Authentication related utilities.
*   `jwt.ts`: JSON Web Token handling.
*   `notification-service.ts`: Service for managing notifications.
*   `prisma.ts`, `prismaClientExtension.ts`, `prismaMiddleware.ts`: Prisma client setup and extensions for database interactions.
*   `session.ts`: Session management.
*   `utils.ts`: General utility functions.

### `types/`

Dedicated to TypeScript type definitions.

*   `billing-types.ts`
*   `next-auth.d.ts`
*   `notification-types.ts`
*   `prisma-types.ts`
*   `user-form-data.ts`

### `public/`

Static assets served directly by Next.js.

*   `favicon.ico`
*   Various SVG and image files (e.g., `file.svg`, `globe.svg`, `next.svg`, `placeholder-logo.png`, `vercel.svg`).

## 4. Key Technologies/Libraries Summary

The frontend is built using:

*   **Next.js:** The React framework for building full-stack web applications, utilizing the App Router for routing and data fetching.
*   **React:** The core library for building user interfaces.
*   **TypeScript:** For type safety and improved developer experience.
*   **Tailwind CSS:** A utility-first CSS framework for rapid UI development, configured with custom themes and animations.
*   **Radix UI:** A collection of unstyled, accessible UI components used as a foundation for the custom UI components in `components/ui`.
*   **Zod:** For schema validation, likely used with `react-hook-form` for form validation.
*   **Prisma Client:** For interacting with the database from the API routes.
*   **Authentication Libraries:** `jose`, `jsonwebtoken`, `bcrypt` for secure authentication and authorization.
*   **Recharts:** For data visualization and charts.
*   **React Hook Form:** For efficient and flexible form management.

This structure indicates a well-organized Next.js application following modern best practices, with clear separation of concerns for UI, logic, and API interactions.
