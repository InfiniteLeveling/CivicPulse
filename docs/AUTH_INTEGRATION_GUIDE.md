# CivicPulse Frontend Authentication Integration Guide · Phase 04

This document defines the exact contract for integrating frontend UI components (login, registration, logout, password recovery, session handling, and role-based views) with the CivicPulse backend on the `frontend` branch.

---

## 1. Overview & Architecture

CivicPulse uses Supabase Auth with SSR cookies.
- **Client Components** interact directly with the Supabase browser client for authentication actions (`signUp`, `signInWithPassword`, `signOut`, `resetPasswordForEmail`).
- **Server Components & Route Handlers** use cookie-based sessions refreshed automatically by Next.js 16 Proxy.
- **User Role Source**: Application role (`citizen` or `admin`) is stored in `public.profiles`. The frontend queries `GET /api/auth/me` to obtain the verified user and role.

---

## 2. Browser Client Usage

Import the client factory in Client Components:

```tsx
"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function useSupabase() {
  return createSupabaseBrowserClient();
}
```

> [!IMPORTANT]
> Never import or initialize service-role keys in frontend code. Use only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

---

## 3. Citizen Registration Contract

### Input Form
- `full_name`: Text, 1–120 characters, trimmed (no leading/trailing spaces).
- `email`: Valid email string.
- `password`: String, minimum 8 characters.

### Frontend Integration Code
```tsx
const supabase = createSupabaseBrowserClient();

const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      full_name: fullName.trim(),
    },
    emailRedirectTo: `${window.location.origin}/auth/confirm?next=/dashboard`,
  },
});

if (error) {
  // Display error message (e.g. "User already registered" or password policy failure)
  return;
}

if (data.session) {
  // Direct signup without email confirmation -> navigate to /dashboard
  router.push("/dashboard");
} else {
  // Email confirmation required -> display "Check your inbox" screen
}
```

> [!NOTE]
> Public registration automatically creates a `citizen` profile via database trigger. User metadata `role` is ignored.

---

## 4. Login Contract

### Input Form
- `email`: Valid email string.
- `password`: String.

### Frontend Integration Code
```tsx
const supabase = createSupabaseBrowserClient();

const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

if (error) {
  // Show error: "Invalid login credentials" or "Email not confirmed"
  return;
}

// Fetch verified role from backend
const response = await fetch("/api/auth/me");
const result = await response.json();

if (result.success) {
  const role = result.data.user.role;
  if (role === "admin") {
    router.push("/admin");
  } else {
    router.push("/dashboard");
  }
}
```

---

## 5. Logout Contract

### Frontend Integration Code
```tsx
const supabase = createSupabaseBrowserClient();

// 1. Sign out on client
await supabase.auth.signOut();

// 2. Also call backend endpoint to clear server cookies if needed
await fetch("/api/auth/logout", { method: "POST" });

// 3. Redirect to login
router.push("/login");
```

---

## 6. Current User API Contract (`GET /api/auth/me`)

- **Path**: `GET /api/auth/me`
- **Cache-Control**: `no-store`

### Success Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "e4f88e1e-2234-4b47-975a-063a56cf988f",
      "email": "citizen@example.com",
      "full_name": "Jane Citizen",
      "role": "citizen"
    }
  },
  "message": "Authenticated"
}
```

### Unauthenticated Response (HTTP 401)
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

---

## 7. Password Recovery Flow

### Step 1: Request Password Reset (`/forgot-password`)
```tsx
const supabase = createSupabaseBrowserClient();

const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
});
```

### Step 2: Set New Password (`/reset-password`)
When the user clicks the link in their email, `/auth/confirm` verifies the recovery token and redirects to `/reset-password`.
The frontend form then calls:
```tsx
const supabase = createSupabaseBrowserClient();

const { error } = await supabase.auth.updateUser({
  password: newPassword,
});

if (!error) {
  router.push("/dashboard");
}
```

---

## 8. Protected Routes & Navigation

Next.js 16 Proxy (`src/proxy.ts`) automatically guards protected paths:
- Unauthenticated access to `/dashboard`, `/admin`, `/report`, `/my-reports` redirects to `/login?redirectTo=<path>`.
- Authenticated users visiting `/login` or `/register` are automatically redirected to `/dashboard`.
- Return URLs are sanitized server-side: open redirect attempts are rejected and fallback to `/dashboard`.

---

## 9. Error Mapping Summary

| Error Condition | HTTP Status | Frontend Display / Action |
|---|---|---|
| `UNAUTHORIZED` | 401 | Redirect to `/login` or show login modal |
| `FORBIDDEN` | 403 | Show "Access Denied: Administrative privileges required" |
| `VALIDATION_ERROR` | 422 | Highlight invalid form fields |
| `NOT_FOUND` | 404 | Show "Resource or profile not found" |
| `RATE_LIMITED` | 429 | Show "Too many requests. Please wait a moment." |
| `INTERNAL_SERVER_ERROR`| 500 | Show "An unexpected error occurred. Please try again." |
