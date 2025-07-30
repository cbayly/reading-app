# Task List: Parent Sign-Up Flow Implementation

## Current Codebase Assessment

**Frontend:** Next.js 15.4.4 + React 19 + TypeScript + Tailwind CSS
- Single page app (page.tsx) with student list display
- Theme management (dark/light mode) implemented
- No authentication or routing system currently

**Backend:** Express.js + CORS + Prisma (already installed)
- Simple REST API (/api/students endpoint)
- Prisma ORM ready for database integration
- No authentication system

**Missing Infrastructure:** Custom JWT auth, database models, multi-page routing, form validation, user flow state management

## Relevant Files

- `frontend/lib/auth.ts` - Authentication utilities and hooks for JWT management
- `frontend/lib/auth.test.ts` - Unit tests for authentication utilities
- `frontend/lib/api.ts` - API client utilities for backend communication
- `frontend/contexts/AuthContext.tsx` - React context for authentication state management
- `frontend/contexts/AuthContext.test.tsx` - Unit tests for AuthContext
- `frontend/src/app/page.tsx` - Landing page component (modify existing)
- `frontend/src/app/signup/page.tsx` - Parent registration page
- `frontend/src/app/login/page.tsx` - Parent login page
- `frontend/src/app/setup/page.tsx` - Student setup page
- `frontend/src/app/assessment/intro/page.tsx` - Assessment introduction page
- `frontend/src/app/dashboard/page.tsx` - Parent dashboard (placeholder)
- `frontend/components/ui/FormInput.tsx` - Reusable form input component
- `frontend/components/ui/FormInput.test.tsx` - Unit tests for FormInput
- `frontend/components/ui/Button.tsx` - Reusable button component
- `frontend/components/ui/Button.test.tsx` - Unit tests for Button
- `frontend/components/forms/SignUpForm.tsx` - Parent registration form
- `frontend/components/forms/SignUpForm.test.tsx` - Unit tests for SignUpForm
- `frontend/components/forms/LoginForm.tsx` - Parent login form
- `frontend/components/forms/LoginForm.test.tsx` - Unit tests for LoginForm
- `frontend/components/forms/StudentForm.tsx` - Student setup form
- `frontend/components/forms/StudentForm.test.tsx` - Unit tests for StudentForm
- `frontend/components/layout/AuthLayout.tsx` - Layout for authentication pages
- `frontend/middleware.ts` - Next.js middleware for route protection
- `frontend/types/auth.ts` - TypeScript types for authentication
- `frontend/types/student.ts` - TypeScript types for student data
- `backend/middleware/auth.js` - JWT authentication middleware for API routes
- `backend/routes/auth.js` - Authentication API endpoints (signup, login, password reset)
- `backend/routes/students.js` - Student management API endpoints
- `backend/routes/assessments.js` - Assessment API endpoints
- `backend/lib/jwt.js` - JWT token generation and validation utilities
- `backend/lib/password.js` - Password hashing and validation utilities
- `prisma/schema.prisma` - Updated database schema with Parent, Student, Assessment models
- `prisma/migrations/` - Database migration files
- `prisma/seed.js` - Database seeding script

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `MyComponent.tsx` and `MyComponent.test.tsx` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.
- Prisma migrations should be run with `npx prisma migrate dev` for development.
- JWT tokens will be stored in httpOnly cookies for security.

## Tasks

- [x] 1.0 **Prisma Database Setup & Authentication Infrastructure**
  - [x] 1.1 Update Prisma schema with Parent, Student, Assessment models
  - [x] 1.2 Create and run database migration for new schema
  - [x] 1.3 Install JWT and password hashing dependencies (`jsonwebtoken`, `bcryptjs`)
  - [x] 1.4 Create JWT utilities for token generation and validation (`backend/lib/jwt.js`)
  - [x] 1.5 Create password hashing utilities (`backend/lib/password.js`)
  - [x] 1.6 Create authentication middleware for API routes (`backend/middleware/auth.js`)
  - [x] 1.7 Set up authentication API endpoints (`backend/routes/auth.js`)
  - [x] 1.8 Update backend to use new routes and middleware

- [ ] 2.0 **Frontend Authentication Integration**
  - [x] 2.1 Create API client utilities for backend communication (`frontend/lib/api.ts`)
  - [x] 2.2 Create authentication utilities and hooks (`frontend/lib/auth.ts`)
  - [x] 2.3 Set up AuthContext for global authentication state (`frontend/contexts/AuthContext.tsx`)
  - [x] 2.4 Configure Next.js middleware for route protection (`frontend/middleware.ts`)
  - [x] 2.5 Create TypeScript types for authentication and student data
  - [x] 2.6 Install required frontend dependencies (`js-cookie`, `@types/js-cookie`)
  - [x] 2.7 Write unit tests for authentication utilities
  - [x] 2.8 Set up cookie-based session management

- [x] 3.0 **Landing Page & Authentication UI**
  - [x] 3.1 Create reusable UI components (Button, FormInput) with TypeScript types
  - [x] 3.2 Transform current page.tsx into proper landing page with value proposition
  - [x] 3.3 Add "Sign Up" and "Log In" CTAs to landing page
  - [x] 3.4 Create signup page (`/signup`) with parent registration form
  - [x] 3.5 Create login page (`/login`) with authentication form
  - [x] 3.6 Implement form validation (email uniqueness, password requirements)
  - [x] 3.7 Add error handling and user feedback for authentication
  - [x] 3.8 Create AuthLayout component for consistent styling
  - [ ] 3.9 Add "Forgot Password" functionality with email reset (skipped for MVP)
  - [ ] 3.10 Write unit tests for authentication forms and components (skipped for MVP)

- [ ] 4.0 **Student Setup Flow & Forms**
  - [x] 4.1 Create student setup page (`/setup`) with progressive disclosure
  - [x] 4.2 Build StudentForm component with required fields (name, birthday, grade, interests)
  - [x] 4.3 Implement grade level dropdown (1-12 as updated in PRD)
  - [x] 4.4 Create interests input with AI-generated suggestions (OpenAI integration)
  - [x] 4.5 Add "Add Another Child" functionality for multiple students
  - [x] 4.6 Implement form validation and error handling
  - [x] 4.7 Create API endpoints for student creation and management
  - [x] 4.8 Add auto-grade population based on birthday with manual override
  - [x] 4.9 Implement route protection (block dashboard access until student added)
  - [ ] 4.10 Write unit tests for student forms and API endpoints (skipped for MVP)

- [ ] 5.0 **Assessment Preparation & Flow Integration**
  - [x] 5.1 Create assessment intro page (`/assessment/intro`) with explanation
  - [x] 5.2 Add "Start First Reading Check" CTA after student setup completion
  - [x] 5.3 Create Assessment record when user starts assessment flow
  - [x] 5.4 Implement flow state management to track progress through signup
  - [x] 5.5 Add assessment resumption logic for abandoned assessments
  - [x] 5.6 Create placeholder dashboard page for post-assessment redirect
  - [x] 5.7 Implement navigation between flow steps with progress indicators
  - [ ] 5.8 Add comprehensive error handling and network retry logic (skipped for MVP)
  - [x] 5.9 Create API endpoints for assessment management
  - [ ] 5.10 Write unit tests for assessment flow and state management (skipped for MVP) 