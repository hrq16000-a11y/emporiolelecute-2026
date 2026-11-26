# Empório LeleCute - Technology Stack

## Core Stack

### Frontend Framework
- **React 19.3.1** with TypeScript 6.0.3
- **Vite 8.3.8** with integrated Rolldown
- **React Router DOM 7.18.7** for routing
- **Oxc React transform** via `@vitejs/plugin-react` 6.3.0

### UI Library
- **shadcn/ui** - Component library built on Radix UI primitives
- **Tailwind CSS 3.4** for styling with custom design system
- **Lucide React 0.577.0** for iconography
- **class-variance-authority** for component variant management
- **clsx** and **tailwind-merge** for conditional class names

### State Management
- **React Context API** - `CartContext` for cart state
- **TanStack Query (React Query) 5.108.4** for server state management
- **localStorage** for cart persistence

### Form Handling
- **React Hook Form 7.92** with Zod validation
- **@hookform/resolvers** for Zod integration

### Rich Text Editing
- **Tiptap 3.35** with Image and Link extensions

### Data Visualization
- **Recharts 2.15.4** for charts and graphs

### PDF Generation
- **jsPDF 4.2** and **jsPDF-AutoTable 5.0** for reports

### Drag & Drop
- **dnd-kit** for sortable lists and drag interactions

### Date Handling
- **date-fns 4.4** for date formatting and manipulation
- **react-day-picker 8.10** for calendar components

### Other Key Libraries
- **next-themes** for dark mode support
- **sonner** for toast notifications
- **vaul** for drawer components
- **embla-carousel-react** for carousels
- **cmdk** for command menus
- **input-otp** for one-time password inputs

## Build & Development

- Package manager: Bun 1.4.5 (canonical lockfile: bun.lock)
- Runtime used for validation: Node.js 24.22.3

### Development Server
```bash
bun run dev
```
- Runs on port 8080
- Auto-reload enabled
- Component tagging in development mode

### Production Build
```bash
# Production build
bun run build

# Development mode build (for testing)
bun run build:dev

# Preview production build
bun run preview
```

### Code Quality
```bash
# Linting
bun run lint
```

## Build Configuration

### Vite Configuration
- **Port**: 8080
- **Alias**: `@` → `./src`
- **Output**: Hashed filenames for cache busting
- **Plugins**: React (Oxc), Component tagger (development only)

### TypeScript Configuration
- **Strict mode**: Partially enabled (`strictNullChecks: false`)
- **Path aliases**: `@/*` → `./src/*`
- **Skip lib check**: Enabled

### Tailwind Configuration
- **Base color**: Slate
- **CSS variables**: Enabled
- **Design system**: Custom coral/salmon color palette
- **Typography**: Quicksand (display), DM Sans (body)
- **Plugins**: tailwindcss-animate

## Infrastructure & Integrations

### Backend Services
- **Supabase JS 2.119.2** for database and authentication
- **Cloudflare Workers** for edge functions and SEO optimization

### Deployment
- **Vercel** for Preview and Production deployments
- Deployments are managed through GitHub branches/PRs and Vercel

## Project Structure Conventions

### Component Organization
- **`/src/components`** - Reusable UI components
- **`/src/components/ui`** - shadcn/ui components
- **`/src/components/admin`** - Admin-specific components
- **`/src/pages`** - Page-level components (routes)
- **`/src/contexts`** - React Context providers
- **`/src/hooks`** - Custom hooks
- **`/src/lib`** - Utility functions
- **`/src/data`** - Static data and constants

### Naming Conventions
- Components: PascalCase (e.g., `ProductCard.tsx`)
- Pages: PascalCase (e.g., `ProductPage.tsx`)
- Hooks: `useXxx` pattern (e.g., `useCart`)
- Contexts: `XxxContext.tsx` with `useXxx` hook
- Types: PascalCase (e.g., `CartItem`)

### Styling Approach
- Use Tailwind utility classes
- Custom CSS variables for design tokens
- CSS-in-JS via `@layer` directives in `index.css`
- Component-specific animations defined in `index.css`

## Environment Variables

- `.env` file for secrets (not committed to git)
- Supabase configuration
- Tracking pixel IDs
- Cloudflare worker configuration