# Online Marketplace (E-commerce)

A multi-vendor marketplace API built with ASP.NET Core 10 and EF Core (Code-First), developed as the capstone project for **Spark to Code 2026** (Codeline bootcamp). Vendors list products under categories, customers build a cart, place orders, pay, and review purchased products.

## Tech Stack

**Backend**
- **ASP.NET Core 10** Web API (controllers + EF Core, no service/repository layer)
- **Entity Framework Core 10** (Code-First) on **SQL Server**
- **JWT Bearer Authentication** (`Microsoft.AspNetCore.Authentication.JwtBearer`)
- **MailKit** for transactional email
- **Swashbuckle / Swagger** for interactive API docs (pinned to 6.9.0 — see note below)

**Frontend**
- **React 18** + **TypeScript**, built with **Vite**
- **Tailwind CSS** for styling (custom "Organic" design system — see `client/src/index.css` / `tailwind.config.js`)
- **React Router** for client-side routing, **Axios**/`fetch` for API calls, **Zustand** available for state
- Talks to the backend via the shared `apiFetch()` helper in `client/src/api.ts`, which attaches the JWT to every request

> Note: the original project brief called for a plain HTML/CSS/JavaScript + Bootstrap frontend. The team instead built a React + TypeScript + Tailwind single-page app. It's fully functional and exercises every controller, but if the capstone is graded literally against "uses Bootstrap consistently," flag this as a known deviation.

## Project Structure

```
backend/
└── Online Marketplace (E-commerce)/     <- .csproj lives here
    ├── Controllers/                     <- one controller per model, 8+ cases each
    ├── Models/                          <- EF entities + request DTOs
    ├── DTOs/                            <- Create/Update/Read DTOs per model
    ├── Helpers/                         <- PasswordHasher, JwtTokenGenerator, EmailService, SeedData
    ├── Migrations/                      <- EF Core migrations
    ├── ERD &Mapping/                    <- ERD + table-mapping diagram exports (.png)
    ├── ProjectContext.cs                <- DbContext + all relationship config (Fluent API)
    ├── Program.cs                       <- DI, JWT/Swagger setup, seeding
    └── appsettings.json                 <- connection string, Jwt, Smtp settings

client/
└── src/
    ├── pages/                           <- one page per major flow (Shop, Cart, Orders, Admin, Login/Register, Vendor pages...)
    ├── components/                      <- shared UI + the Admin* management panels (Orders, Coupons, Payments, Shipping, OrderItems)
    └── api.ts                           <- fetch wrapper: base URL + JWT attachment

Online Marketplace (E-commerce).postman_collection.json   <- Postman collection: all 12 controllers x 8+ cases
```

## Getting Started

### Prerequisites

- .NET 10 SDK
- SQL Server (LocalDB, Express, or full) — the default connection string targets `localhost\SQLEXPRESS`

### 1. Configure `appsettings.json`

Open `backend/Online Marketplace (E-commerce)/appsettings.json` and set:

- **`ConnectionStrings:DefaultConnection`** — point it at your SQL Server instance.
- **`Jwt:Key`** — replace the placeholder with your own long random secret (keep it out of source control for a real deployment).
- **`Smtp`** — replace `Username`/`Password`/`FromEmail` with a real account (e.g. a [Gmail App Password](https://myaccount.google.com/apppasswords)) to actually send emails. Without valid credentials, email sending fails silently and is logged to the console — it never blocks checkout or shipping updates.

### 2. Apply migrations

From `backend/Online Marketplace (E-commerce)/`:

```bash
dotnet ef database update
```

This creates the database and all 12 tables from the current model.

### 3. Run

```bash
dotnet run
```

The API starts on `http://localhost:5190` (see `Properties/launchSettings.json`). Swagger UI is at `http://localhost:5190/swagger`.

On first run, demo data is seeded automatically (see below) — no manual setup needed to start exercising the API.

### 4. Run the frontend

From `client/`:

```bash
npm install
npm run dev
```

Vite starts the dev server (default `http://localhost:5173`). The frontend's API base URL is hard-coded in `client/src/api.ts` (`http://localhost:5190/api`) — update it there if the backend runs on a different port. Log in with any seeded account below (see Demo / Seed Data) to reach the customer, vendor, or admin views.

## Demo / Seed Data

`Helpers/SeedData.cs` runs on every startup but only inserts data once (it checks whether `khaled@marketplace.com` already exists), so restarting the app never duplicates data.

**Password for every seeded account:** `Passw0rd!23`

| Role | Username | Email |
|---|---|---|
| Admin | khalid | `khaild.alhadi2021@marketplace.com` |
| Admin | Mutaz | `mutaz@marketplace.com` |
| Vendor | Hanin (Hanin's Boutique) | `hanin@marketplace.com` |
| Vendor | Nawal (Nawal Electronics) | `nawal@marketplace.com` |
| Vendor | Ali (Ali Bookstore) | `ali@marketplace.com` |
| Customer | Layla | `layla@marketplace.com` |
| Customer | Yousef | `yousef@marketplace.com` |

Also seeded: 3 categories, 5 products, 2 coupons (`WELCOME10`, `SUMMER20`), a completed order with payment/shipping/reviews for Layla, a pending order for Yousef, and an active cart for each customer.

## Authentication

- `POST /api/User/register` and `POST /api/User/login` are public; login returns a JWT.
- Every other endpoint requires `Authorization: Bearer <token>`.
- Admin-only endpoints (`ChangeUserRole`, `Deactivate/ReactivateUser`, `GetAllUsers`, `GetUsersByRole`) require the `Admin` role.
- Read-only catalog browsing (`Category`, `Product`, `Review` — list/get/filter/aggregate endpoints) is public; everything else needs a logged-in user.
- In Swagger UI, click **Authorize** and paste the token from `/login` (no `Bearer ` prefix needed) to call protected endpoints from the browser.

> **Note on Swagger version:** the project pins `Swashbuckle.AspNetCore` to `6.9.0`. Newer 10.x releases pull in `Microsoft.OpenApi` 2.x, which has an unresolved breaking change to the JWT security-scheme API as of writing (see open issues on the Swashbuckle.AspNetCore and dotnet/aspnetcore repos) — don't upgrade without checking that's fixed upstream first.

## Email Notifications

`Helpers/EmailService.cs` sends transactional email via SMTP (MailKit):

- **Order confirmation** — sent from `OrderController.Checkout` once an order is placed.
- **Shipping update** — sent from `ShippingController.UpdateShippingStatus` on every status change.

Send failures are caught and logged, never surfaced as an error to the caller — a broken mail server must never break a checkout.

## Data Model (12 required entities)

| Entity | Key relationships |
|---|---|
| **User** | 1–1 with `VendorProfile`, 1–1 with `Cart`; basis for JWT (Id, Email, PasswordHash, Role) |
| **VendorProfile** | 1–1 with `User`; 1–many with `Product` |
| **Category** | 1–many with `Product` |
| **Product** | many–1 with `Category` and `VendorProfile` |
| **Cart** | 1–1 with `User`; 1–many with `CartItem` |
| **CartItem** | many–1 with `Cart` and `Product` |
| **Order** | many–1 with `User` and (optional) `Coupon`; 1–many with `OrderItem`; 1–1 with `Payment`/`Shipping` |
| **OrderItem** | many–1 with `Order` and `Product`; freezes `unitPrice` at purchase time |
| **Payment** | 1–1 with `Order` |
| **Shipping** | 1–1 with `Order` |
| **Review** | many–1 with `User` and `Product` |
| **Coupon** | 1–many with `Order` |

All relationship mapping (FK targets, inverse navigations, delete behavior) is centralized in `ProjectContext.OnModelCreating` using Fluent API — model classes carry no `[ForeignKey]`/`[InverseProperty]` attributes. Several FKs to `Product` are `DeleteBehavior.Restrict` rather than the EF default `Cascade`, both to preserve order/cart/review history and because SQL Server rejects the schema outright ("multiple cascade paths") otherwise, since `User → VendorProfile → Product` and `User → Order/Cart → …` both reach it.

## API Documentation

Every one of the 12 models has its own controller with at least 8 cases (create, two distinct updates, delete, list-with-`Include()`, get-by-id, filter, sort/aggregate). Full request/response shapes are in Swagger UI at `/swagger` once the app is running.

A ready-to-import **Postman collection** — `Online Marketplace (E-commerce).postman_collection.json` (repo root) — covers all 98 requests (register/login + all 12 controllers x 8 cases). Import it, run **Auth > Login** once (it auto-saves the JWT as a collection variable for every other request), then update the `*Id` collection variables to match real records before exercising the rest.

## Contributors

- **Mutaz Albalushi** — initial project setup, ERD & database mapping, `User` and `VendorProfile` models/controllers.
- **Ali** (alijah3099) — `Order` and `Coupon` models; early prototype pages for checkout/orders (since rebuilt in React).
- **Nawal** (nawalsuliman199) — early cart page prototype (since rebuilt in React).
- **Khaild Alhadi** — DbContext/migrations/Swagger bootstrap; `Category`, `Product`, `OrderItem`, `Cart`, `CartItem`, `Payment`, `Shipping` models; completed `Review`; all 12 controllers to the 8-case spec; JWT authentication; email service; seed data; the full React/TypeScript/Tailwind frontend (all pages, admin dashboards, cart/checkout flow); the Postman collection.

## Status

- ✅ Backend complete: 12 models, 12 controllers (8+ cases each, live-tested), JWT auth with role-based authorization, email notifications, Swagger, seed data.
- ✅ Frontend complete: React + TypeScript + Tailwind SPA covering customer shopping/cart/checkout, vendor product management, and an admin dashboard (products, orders, coupons, payments, shipping, order items). Built with React/Tailwind rather than the originally planned Bootstrap + plain HTML/CSS/JS — see the Tech Stack note above.
- ✅ Postman collection covering all 12 controllers.
- ⬜ Known frontend gaps: no dedicated admin UI yet for Category CRUD, full User management (role/activate/deactivate), VendorProfile delete, Review edit, or a plain Coupon edit (discount/expiry) separate from "expire now". All of these are verified working on the backend (via Swagger/Postman); only the UI coverage for them is pending.
