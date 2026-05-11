# Functional Requirements Specification
## Multi-Tenant Sales Till System

**Document Version:** 1.0  
**Last Updated:** May 9, 2026  
**Status:** Active  
**Classification:** Internal - Technical Documentation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Functional Requirements](#functional-requirements)
4. [Security & Authentication Requirements](#security--authentication-requirements)
5. [Multi-Tenant Architecture Requirements](#multi-tenant-architecture-requirements)
6. [Performance & Scalability Requirements](#performance--scalability-requirements)
7. [Data Management & Persistence](#data-management--persistence)
8. [User Roles & Permissions](#user-roles--permissions)
9. [Integration & API Requirements](#integration--api-requirements)
10. [Version History & Future Additions](#version-history--future-additions)

---

## Executive Summary

The Multi-Tenant Sales Till System is a comprehensive point-of-sale (POS) platform designed to support multiple independent retail stores with centralized management capabilities. The system enables store operators to manage inventory, process customer orders, handle payments, track transactions, and access business analytics—all while maintaining strict data isolation between tenants.

**Key Objectives:**
- Enable rapid store setup and operations
- Provide real-time order processing and kitchen coordination
- Maintain secure, isolated multi-tenant data storage
- Deliver comprehensive business analytics and reporting
- Support promotional advertising capabilities
- Ensure high availability and performance

---

## System Overview

### 1.1 System Architecture

The Sales Till System is a full-stack web application with the following components:

- **Frontend:** Next.js 16.2.4 with Turbopack (React-based client)
- **Backend:** Next.js API Routes (serverless functions)
- **Database:** PostgreSQL (Neon provider)
- **Authentication:** JWT (JSON Web Tokens) with 24-hour expiry
- **Deployment:** Vercel (serverless cloud hosting)
- **Real-time Updates:** Polling mechanism (10-30 second intervals)

### 1.2 System Users

1. **SuperAdmin** - System administrator managing all stores
2. **Store Admin** - Administrator for a specific store
3. **Till Operator (Staff)** - Cashier processing customer orders
4. **Kitchen Staff** - Staff preparing orders
5. **Customers** - End users purchasing products

### 1.3 Core Business Domains

- **Store Management** - Multi-tenant store creation and configuration
- **User Management** - Role-based access control and staff administration
- **Inventory Management** - Product catalog and stock tracking
- **Order Processing** - Customer order creation and fulfillment
- **Payment Processing** - Multiple payment method support
- **Kitchen Operations** - Order queue and status management
- **Reporting & Analytics** - Sales data, transaction history, performance metrics
- **Promotional Management** - Advertisement creation and display

---

## Functional Requirements

### 2.1 Authentication & Authorization

#### REQ-AUTH-001: User Login
**Description:** Users shall be able to log in using email and password credentials.

**Details:**
- Email and password are required fields
- Case-insensitive email matching
- Secure password hashing (bcrypt) is required
- User must exist in the system and be active
- Store approval check for non-superadmin users
- Upon success, return JWT token (24-hour expiry) and user profile
- Upon failure, return "Invalid credentials" error message

**API Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "storeId": "optional_store_id"
}
```

**Response (Success):**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "role": "STAFF|KITCHEN|ADMIN|SUPERADMIN",
    "storeId": "store_id_or_null"
  },
  "token": "jwt_token_with_24h_expiry",
  "store": { /* store object */ }
}
```

#### REQ-AUTH-002: JWT Token Validation
**Description:** All API endpoints shall validate JWT tokens for authenticated requests.

**Details:**
- Token must be present in Authorization header as "Bearer {token}"
- Token must be valid and not expired (24-hour expiry)
- Decode token to extract user information (userId, storeId, role, email)
- Return 401 Unauthorized if token is missing or invalid
- Return 403 Forbidden if user lacks permission for the resource

#### REQ-AUTH-003: Store Approval Gate
**Description:** Non-superadmin users from unapproved stores shall not be able to log in.

**Details:**
- During login, check if user's store has `isApproved = true`
- SuperAdmin users bypass this check (storeId is null)
- Return error message: "Your store is pending approval. Please wait for superadmin approval."
- Once store is approved, user can log in immediately

#### REQ-AUTH-004: Session Management
**Description:** User sessions shall be managed through JWT tokens.

**Details:**
- Tokens are stateless (no server-side session storage)
- Token expiry: 24 hours from creation
- Client stores token in localStorage
- Token is automatically included in all API requests
- Upon logout, client clears token from localStorage
- Server does not maintain logout lists (stateless design)

#### REQ-AUTH-005: Password Security
**Description:** Passwords shall be securely hashed and never transmitted in plain text.

**Details:**
- All passwords hashed with bcrypt (minimum 10 salt rounds)
- Passwords never logged or displayed in API responses
- Password comparison done server-side only
- HTTPS required for all password-related endpoints

---

### 2.2 Store Management

#### REQ-STORE-001: Store Registration
**Description:** Users shall be able to register a new store in the system.

**Details:**
- Required fields: store name, email, currency, address (optional), phone (optional)
- Email must be unique across all stores
- Currency default: USD
- Upon registration, store is created with `isApproved = false`
- SuperAdmin must approve the store before staff can access it
- Create default superadmin user for the store (optional feature)

**API Endpoint:** `POST /api/stores`

#### REQ-STORE-002: Store Approval Workflow
**Description:** SuperAdmin shall be able to approve or reject store applications.

**Details:**
- Only SuperAdmin users can approve/reject stores
- Unapproved stores show in pending list
- Approved stores become active and accessible to staff
- Staff users from unapproved stores cannot log in
- Once approved, users can immediately log in
- Approval updates the store `isApproved` field to true

**API Endpoint:** `POST /api/admin/approve-store`

#### REQ-STORE-003: Store Branding Configuration
**Description:** Store admins shall be able to customize store branding.

**Details:**
- Configurable fields: primary color, secondary color, accent color, background image
- Colors stored as hex values (e.g., #000000)
- Background image stored as URL or base64 data
- Branding applied to all store pages (till, kitchen, admin dashboard)
- Branding persists via polling mechanism (10-second refresh intervals)
- Changes reflected in real-time across all open sessions for that store
- Uses localStorage for client-side persistence
- Falls back to default colors if not configured

**API Endpoint:** `POST /api/stores/branding`

#### REQ-STORE-004: Store Information Retrieval
**Description:** Authorized users shall be able to retrieve store information.

**Details:**
- SuperAdmin can retrieve all stores
- Store Admin can retrieve only their own store
- Staff can access their assigned store info
- Returns: store ID, name, email, address, phone, currency, branding config, approval status
- Response includes complete store object with all relationships

**API Endpoint:** `GET /api/stores`

#### REQ-STORE-005: Store Data Isolation
**Description:** Store data must be strictly isolated between tenants.

**Details:**
- All queries must filter by storeId
- Users can only access data from their assigned store
- SuperAdmin can access all stores but must explicitly specify storeId parameter
- All database relationships include storeId with CASCADE delete
- Deleting a store removes all associated: users, orders, inventory, staff, etc.

---

### 2.3 User & Staff Management

#### REQ-USER-001: User Creation
**Description:** Store admins and SuperAdmin shall be able to create new user accounts.

**Details:**
- Required fields: email, name, password, role
- Roles: STAFF, KITCHEN, ADMIN, SUPERADMIN
- Email must be unique within the system
- Password must be securely hashed before storage
- New user is active by default (`isActive = true`)
- Newly created staff are automatically added to StaffMember table
- User is associated with the store that created them

**API Endpoint:** `POST /api/users`

#### REQ-USER-002: Staff Directory
**Description:** Store admins shall be able to view and manage staff members.

**Details:**
- List all staff in their store
- Display: user ID, email, name, role, phone, address, creation date
- Filter by role or status
- View individual staff details
- Staff information includes employment details (phone, address)

**API Endpoint:** `GET /api/users`

#### REQ-USER-003: User Activation/Deactivation
**Description:** Store admins shall be able to activate or deactivate user accounts.

**Details:**
- Only active users can log in
- Set `isActive` flag to true/false
- Deactivated users return login error
- Display active status in staff directory

**API Endpoint:** `PUT /api/users/{userId}`

#### REQ-USER-004: Staff Credentials Display
**Description:** Upon staff creation, credentials shall be immediately displayed to admin.

**Details:**
- Show email and temporary password to admin
- Admin must note these credentials to share with staff
- Password should be user-changeable (optional self-service)
- Display in a modal/popup that cannot be reopened (credentials shown once)

---

### 2.4 Inventory Management

#### REQ-INV-001: Menu Item Creation
**Description:** Store admins and SuperAdmin shall be able to create menu items.

**Details:**
- Required fields: name, category, unit price, quantity available
- Categories: predefined or custom (Meals, Drinks, Appetizers, Desserts, etc.)
- Unit price stored as float (currency amount)
- Quantity tracks available stock
- Items are store-specific (isolated per store)
- Status: active/inactive

**API Endpoint:** `POST /api/inventory`

**Request Body:**
```json
{
  "name": "Burger",
  "category": "Meals",
  "unitPrice": 12.99,
  "quantity": 50
}
```

#### REQ-INV-002: Menu Item Updates
**Description:** Store admins shall be able to update menu item details.

**Details:**
- Updatable fields: name, category, unit price, quantity, status
- Price changes apply to new orders only (historical orders unaffected)
- Quantity can be adjusted for stock management
- Items can be marked inactive to hide from till

**API Endpoint:** `PUT /api/inventory/{itemId}`

#### REQ-INV-003: Menu Item Deletion
**Description:** Store admins shall be able to delete menu items.

**Details:**
- Deletion soft-deletes or hard-deletes depending on business rules
- Deleted items no longer appear in till
- Historical orders retain deleted item information for auditing

**API Endpoint:** `DELETE /api/inventory/{itemId}`

#### REQ-INV-004: Menu Browsing for Till Operators
**Description:** Till operators shall be able to browse and search menu items.

**Details:**
- Display all active items organized by category
- Show item name, price, and availability
- Search functionality to find items by name
- Category filtering
- Real-time quantity updates

**API Endpoint:** `GET /api/inventory`

#### REQ-INV-005: Stock Management
**Description:** System shall track inventory stock levels.

**Details:**
- Track quantity per menu item
- Update quantity upon order fulfillment
- Alert if stock runs low (optional)
- Prevent ordering items with 0 quantity (optional business rule)
- Inventory usage tracked in InventoryUsage table for auditing

---

### 2.5 Order Management

#### REQ-ORDER-001: Order Creation
**Description:** Till operators shall be able to create customer orders.

**Details:**
- Required: at least one order item with quantity
- Order items must exist in inventory
- Each order item includes: itemId, quantity, unit price (from inventory), notes (optional)
- System generates unique human-readable order number (e.g., ORD-20260509-001)
- Initial status: PENDING
- Staff ID associated with order creator
- Order timestamp recorded
- Calculate subtotal, tax, and total

**API Endpoint:** `POST /api/orders`

**Request Body:**
```json
{
  "items": [
    {
      "itemId": "item_id",
      "quantity": 2,
      "notes": "No onions"
    }
  ],
  "paymentMethod": "CASH|CARD|MOBILE|OTHER",
  "notes": "Order notes"
}
```

#### REQ-ORDER-002: Order Status Workflow
**Description:** Orders shall progress through a defined status workflow.

**Details:**
- Status progression: PENDING → IN_PROGRESS → READY → COMPLETED
- PENDING: Order awaiting kitchen processing
- IN_PROGRESS: Kitchen actively preparing order
- READY: Order ready for customer pickup
- COMPLETED: Order delivered to customer and payment settled
- CANCELLED: Order rejected (admin action)
- Kitchen staff update status as they work
- Till operators mark as COMPLETED after payment
- Status changes trigger notifications

#### REQ-ORDER-003: Order Modification
**Description:** Till operators shall be able to modify pending orders.

**Details:**
- Only PENDING orders can be modified
- Can add/remove items or adjust quantities
- Cannot modify orders in progress or ready
- Recalculate totals upon modification
- Track modifications in audit log

**API Endpoint:** `PUT /api/orders/{orderId}`

#### REQ-ORDER-004: Order Cancellation
**Description:** Authorized users shall be able to cancel orders.

**Details:**
- Store admins can cancel any order
- Till operators can cancel only their own pending orders
- PENDING and IN_PROGRESS orders can be cancelled
- READY and COMPLETED orders cannot be cancelled
- Cancelled orders marked with status CANCELLED
- Reason for cancellation recorded (optional)

**API Endpoint:** `DELETE /api/orders/{orderId}` or `PUT /api/orders/{orderId}/cancel`

#### REQ-ORDER-005: Order Query & Filtering
**Description:** Users shall be able to query and filter orders.

**Details:**
- Filter by: status, date range, staff member, payment method
- Search by order number
- Pagination support (20-50 items per page)
- Sort by date, status, or order value
- Real-time results

**API Endpoint:** `GET /api/orders?status=READY&limit=20&offset=0`

---

### 2.6 Payment Processing

#### REQ-PAY-001: Payment Methods
**Description:** System shall support multiple payment methods.

**Details:**
- Supported methods: CASH, CARD, MOBILE_MONEY, OTHER
- Payment method selected during order creation
- Payment status tracked with each order
- Payment method displayed in transaction history

#### REQ-PAY-002: Payment Acceptance
**Description:** Till operators shall be able to accept and record payments.

**Details:**
- Amount due calculated from order total
- Till operator selects payment method
- System records payment timestamp
- Order status updated to COMPLETED upon payment
- Payment information stored in transaction log

**API Endpoint:** `POST /api/orders/{orderId}/payment`

**Request Body:**
```json
{
  "paymentMethod": "CASH|CARD|MOBILE|OTHER",
  "amountReceived": 50.00,
  "notes": "Payment notes"
}
```

#### REQ-PAY-003: Multiple Payments per Order
**Description:** System shall support split/multiple payments for a single order.

**Details:**
- Order can accept multiple payments (e.g., partial cash + card)
- Remaining balance calculated after each payment
- Order marked COMPLETED only when fully paid
- Each payment logged separately

---

### 2.7 Receipt Management

#### REQ-RECEIPT-001: Receipt Generation
**Description:** System shall generate receipts for completed orders.

**Details:**
- Receipt includes: store name, order number, date/time, items, quantities, prices, subtotal, tax, total, payment method
- Displayed immediately after payment
- Store branding applied (colors, logo)
- Human-readable format

#### REQ-RECEIPT-002: Receipt Printing
**Description:** Till operators shall be able to print receipts.

**Details:**
- Print command triggers browser print dialog
- Receipt formatted for standard POS paper (80mm width)
- Automatically triggered after payment (optional auto-print)
- Manual reprint available from transaction history

#### REQ-RECEIPT-003: Receipt Storage
**Description:** All receipts shall be digitally stored for retrieval.

**Details:**
- Receipts accessible from order details
- Export to PDF (optional feature)
- Search and filter historical receipts

---

### 2.8 Kitchen Operations

#### REQ-KITCHEN-001: Order Queue Display
**Description:** Kitchen staff shall see a real-time queue of pending orders.

**Details:**
- Display all PENDING and IN_PROGRESS orders
- Show: order number, items, special notes, time pending
- Sorted by oldest first (FIFO)
- Real-time updates via polling (3-second intervals)
- Color-coded by urgency or wait time (optional)

**Page:** `/kitchen`

#### REQ-KITCHEN-002: Order Status Updates
**Description:** Kitchen staff shall be able to update order status.

**Details:**
- Transition from PENDING → IN_PROGRESS when starting
- Transition from IN_PROGRESS → READY when completed
- Cannot skip statuses (must follow workflow)
- Timestamp recorded for each status change
- Update triggers notification to till

**API Endpoint:** `PUT /api/orders/{orderId}/status`

#### REQ-KITCHEN-003: Kitchen Notifications
**Description:** Kitchen staff shall receive notifications of new orders.

**Details:**
- New orders appear in queue immediately
- Audio alert (optional): beep or sound effect
- Visual alert: highlight new orders
- Notifications persist until order marked READY

---

### 2.9 Transaction History & Reporting

#### REQ-REPORT-001: Completed Transactions View
**Description:** Users shall be able to view completed transactions.

**Details:**
- Display all COMPLETED orders for the store
- Show: order number, date/time, items, total, payment method, staff member
- Filter by date range, staff member, payment method
- Pagination: 20-50 transactions per page
- Export to CSV or PDF (optional)

**API Endpoint:** `GET /api/transactions`

#### REQ-REPORT-002: Daily Sales Report
**Description:** Store admins shall be able to view daily sales metrics.

**Details:**
- Total orders completed today
- Total revenue
- Average order value
- Items sold (by name and quantity)
- Payment method breakdown
- Top-selling items
- Busiest hours (hourly breakdown)

**API Endpoint:** `GET /api/analytics/daily-sales`

#### REQ-REPORT-003: Sales Analytics Dashboard
**Description:** Store admins shall access comprehensive sales analytics.

**Details:**
- Date range selection (custom range or presets)
- Metrics: total revenue, transaction count, average order value, tax collected
- Charts: daily revenue trend, hourly distribution, item popularity, payment methods
- Filters: staff member, payment method, item category
- Export capability

**API Endpoint:** `GET /api/analytics`

#### REQ-REPORT-004: Transaction Audit Log
**Description:** System shall maintain audit trail of all transactions.

**Details:**
- Record created/updated/deleted transactions
- Timestamp and user ID tracked
- Action type recorded (CREATE, UPDATE, DELETE, PAYMENT)
- Previous and new values logged for updates
- Used for compliance and dispute resolution

#### REQ-REPORT-005: Staff Performance Report
**Description:** Store admins shall view individual staff performance.

**Details:**
- Transactions per staff member
- Revenue generated per staff
- Average transaction time
- Date range filtering
- Comparison metrics

---

### 2.10 Administrative Functions

#### REQ-ADMIN-001: Store Administration Dashboard
**Description:** Store admins and SuperAdmin shall access an admin dashboard.

**Details:**
- Overview of store operations
- Quick access to all admin functions
- Real-time metrics (today's sales, pending orders, staff count)
- Links to: staff management, inventory, menu management, settings, analytics

**Page:** `/admin`

#### REQ-ADMIN-002: System Cleanup (SuperAdmin Only)
**Description:** SuperAdmin shall be able to clean up system data.

**Details:**
- Delete test/demo data
- Clean up test user accounts
- Clear historical test transactions (optional)
- Action requires confirmation
- Audit log records cleanup action

**API Endpoint:** `POST /api/admin/cleanup/test-accounts`

#### REQ-ADMIN-003: Menu Management (SuperAdmin Per-Store)
**Description:** SuperAdmin shall manage menus for all stores.

**Details:**
- Create/update/delete menu items per store
- Same functionality as store admin but with store selection
- Store selector dropdown
- Bulk operations (optional)

**Page:** `/admin` (Menu Management tab)

#### REQ-ADMIN-004: Pending Store Approvals
**Description:** SuperAdmin shall review and approve new store registrations.

**Details:**
- List of pending stores
- Store details: name, email, address, registration date
- Approve/reject action buttons
- Approval triggers email notification to store
- Rejected stores remain in system for audit

**Page:** `/admin` (Approvals tab)

---

### 2.11 Promotional & Advertising Features

#### REQ-PROMO-001: Advert Creation
**Description:** SuperAdmin shall be able to create promotional advertisements.

**Details:**
- Required fields: title, image (base64 or URL), image must be < 500KB
- Optional fields: description, link (clickable CTA), caption
- Target audience: universal (all stores) or specific store
- Adverts stored in Advert table
- isActive flag controls visibility

**API Endpoint:** `POST /api/adverts`

**Request Body:**
```json
{
  "title": "Summer Sale",
  "description": "50% off all drinks",
  "imageUrl": "base64_encoded_image",
  "link": "https://example.com/sale",
  "caption": "Shop Now",
  "storeId": "store_id_or_null"
}
```

#### REQ-PROMO-002: Advert Management (SuperAdmin)
**Description:** SuperAdmin shall be able to edit and delete adverts.

**Details:**
- Edit advert details (title, description, image, link)
- Delete adverts
- Mark adverts as active/inactive
- View all adverts (universal and store-specific)
- Filter by store
- Changes apply immediately to all store displays

**API Endpoints:**
- `PUT /api/adverts/{advertId}`
- `DELETE /api/adverts/{advertId}`

#### REQ-PROMO-003: Advert Display on Store Pages
**Description:** Adverts shall display on all store-facing pages.

**Details:**
- Display panel on right sidebar (176px width, fixed position)
- Show all active adverts for store + universal adverts
- Reduced height images (24px height per advert)
- Clickable adverts open link in new tab
- Refresh every 30 seconds
- Persist across page navigation

**Pages:** Till page, Kitchen page, Admin page

#### REQ-PROMO-004: Advert Visibility Rules
**Description:** Adverts shall follow visibility rules based on scope and status.

**Details:**
- Universal adverts: visible on all stores
- Store-specific adverts: visible only on assigned store
- Only active adverts (isActive = true) display
- SuperAdmin sees all adverts from all stores when viewing adverts page
- Store staff see only their store's + universal adverts

---

### 2.12 Real-Time Updates & Notifications

#### REQ-REALTIME-001: Order Status Notifications
**Description:** Till operators and admins shall receive notifications of kitchen status changes.

**Details:**
- When order transitions to READY, notify till
- Notification displayed in UI
- Auto-redirect to Ready for Collection tab (optional)
- Sound alert (optional)

#### REQ-REALTIME-002: Branding Updates
**Description:** Branding changes shall update in real-time across all sessions.

**Details:**
- Admin updates branding colors/image
- Change propagates to all open till/kitchen/admin pages
- Polling mechanism (10-second interval) refreshes branding
- localStorage updates trigger cross-tab sync via storage events
- Users see updated branding without page refresh

#### REQ-REALTIME-003: Advert Refresh
**Description:** Advert panel shall refresh regularly.

**Details:**
- Polling interval: 30 seconds
- When SuperAdmin creates/updates advert, refreshes on all store pages within 30 seconds
- Manual refresh via button (optional)

---

## Security & Authentication Requirements

### 3.1 Authentication Security

#### REQ-SEC-AUTH-001: Password Hashing
**Description:** All passwords shall be cryptographically hashed.

**Details:**
- Use bcrypt algorithm
- Minimum 10 salt rounds
- No plaintext passwords stored or logged

#### REQ-SEC-AUTH-002: JWT Token Security
**Description:** JWT tokens shall be secure and tamper-proof.

**Details:**
- Signed with private secret (JWT_SECRET)
- Expiry: 24 hours
- Payload includes: userId, storeId, email, role
- Verification required on every protected endpoint
- No token rotation (simple 24-hour expiry model)

#### REQ-SEC-AUTH-003: HTTPS Enforcement
**Description:** All communication shall use HTTPS.

**Details:**
- Production environment enforces HTTPS
- Secure cookie attributes (httpOnly, secure, sameSite)
- No sensitive data in URLs or query parameters (except tokens in headers)

### 3.2 Data Access Control

#### REQ-SEC-CONTROL-001: Multi-Tenant Isolation
**Description:** Data shall be strictly isolated between stores.

**Details:**
- All queries filter by storeId
- No queries return cross-store data
- Foreign key constraints enforce relationships
- CASCADE delete on store removal

#### REQ-SEC-CONTROL-002: Role-Based Access Control (RBAC)
**Description:** Access to features shall be controlled by user role.

**Details:**
- SuperAdmin: Full system access, all stores
- Store Admin: Full access to assigned store only
- Till Operator: Till page access, order creation, payment processing
- Kitchen Staff: Kitchen page access, order status updates
- Customer: Limited public features (read-only)

#### REQ-SEC-CONTROL-003: Endpoint Authorization
**Description:** All API endpoints shall verify user authorization.

**Details:**
- Check user role against required role(s)
- Check storeId ownership
- Return 403 Forbidden if unauthorized
- Log authorization failures

### 3.3 Data Protection

#### REQ-SEC-DATA-001: Password Reset Security
**Description:** Password reset shall be secure (if feature implemented).

**Details:**
- Reset link includes secure, time-limited token
- Link expires after 1 hour or single use
- Token sent via email only (not SMS or other channels)
- New password hashed before storage

#### REQ-SEC-DATA-002: Sensitive Data Masking
**Description:** Sensitive data shall be masked in logs and responses.

**Details:**
- Never log passwords, tokens, or payment card details
- API responses don't include password hashes
- Payment details not stored in transaction logs (only payment method)
- PII (personally identifiable information) minimized in logs

---

## Multi-Tenant Architecture Requirements

### 4.1 Tenant Isolation

#### REQ-MT-001: Store-Level Isolation
**Description:** Each store operates as an independent tenant.

**Details:**
- Separate data: users, orders, inventory, branding, adverts
- storeId foreign key on all tenant-specific tables
- Users belong to exactly one store (except SuperAdmin with storeId = null)
- No data leakage between stores
- Performance: optimal query performance with storeId indexing

#### REQ-MT-002: Superadmin Cross-Store Access
**Description:** SuperAdmin users can access and manage multiple stores.

**Details:**
- SuperAdmin has storeId = null
- SuperAdmin can view all stores via store selector
- SuperAdmin can manage all store data (users, inventory, adverts)
- SuperAdmin can approve pending stores
- Audit trail tracks SuperAdmin actions across stores

#### REQ-MT-003: Store Data Relationships
**Description:** All store data relationships shall include storeId.

**Details:**
- User → Store (many-to-one)
- Order → Store (many-to-one)
- InventoryItem → Store (many-to-one)
- StaffMember → Store (many-to-one)
- Advert → Store (many-to-one, nullable for universal adverts)
- Notification → Store (many-to-one)
- AuditLog → Store (many-to-one)

---

## Performance & Scalability Requirements

### 5.1 Response Time

#### REQ-PERF-001: API Response Times
**Description:** API endpoints shall respond within acceptable timeframes.

**Details:**
- Simple queries (login, inventory list): < 200ms
- Complex queries (analytics): < 1000ms
- Order creation/updates: < 500ms
- Measured under normal load (single store, normal traffic)

#### REQ-PERF-002: Page Load Times
**Description:** Web pages shall load quickly.

**Details:**
- Initial page load: < 2 seconds
- Interactive till/kitchen/admin pages: < 500ms after initial load
- Real-time updates (polling): imperceptible to user (< 1 second stale data)

### 5.2 Scalability

#### REQ-PERF-003: Concurrent Users
**Description:** System shall support multiple concurrent users per store.

**Details:**
- Minimum: 50 concurrent users per store
- Designed to scale to 100+ concurrent users with optimization
- No hard limits enforced in code (relies on infrastructure)

#### REQ-PERF-004: Multi-Store Scaling
**Description:** System shall support multiple stores simultaneously.

**Details:**
- Minimum: 100 concurrent stores
- Unlimited stores (horizontally scalable via database and serverless)
- Performance isolation: one store's load doesn't impact others

#### REQ-PERF-005: Database Indexing
**Description:** Frequently queried fields shall have database indexes.

**Details:**
- Index on: storeId, userId, email, createdAt
- Composite indexes for common filter combinations
- Foreign key indexes for relationships

### 5.3 Optimization

#### REQ-PERF-006: Caching Strategy
**Description:** System shall cache frequently accessed data.

**Details:**
- Client-side: localStorage for branding, user info, tokens
- Browser: normal HTTP caching for static assets
- In-memory: optional server-side caching for inventory (future)
- Cache invalidation: polling mechanism or event-based invalidation

#### REQ-PERF-007: Query Optimization
**Description:** Database queries shall be optimized.

**Details:**
- Use database indexes effectively
- Limit result set with pagination
- Include only necessary fields in SELECT
- Avoid N+1 queries (use joins/includes)

---

## Data Management & Persistence

### 6.1 Database Schema

#### REQ-DATA-001: PostgreSQL Compatibility
**Description:** System shall use PostgreSQL as primary database.

**Details:**
- Provider: Neon (serverless PostgreSQL)
- Connection pooling for connection efficiency
- Support for all PostgreSQL data types

#### REQ-DATA-002: Data Persistence Models
**Description:** All data models shall be defined in Prisma schema.

**Details:**
- Models: Store, User, StaffMember, Order, OrderItem, InventoryItem, InventoryUsage, Notification, AuditLog, Advert
- Relationships: proper foreign keys, cascade rules, indexing
- Migrations: database schema version control

### 6.2 Data Retention & Cleanup

#### REQ-DATA-003: Historical Data Retention
**Description:** Historical data shall be retained for auditing.

**Details:**
- Completed transactions: retained indefinitely (or per business policy)
- Audit logs: retained indefinitely
- Deleted items: soft-delete recommended (retains data)
- Test data: cleanup available via SuperAdmin panel

#### REQ-DATA-004: Data Backup
**Description:** System shall maintain data backups.

**Details:**
- Automatic backups: database provider responsibility (Neon handles)
- Backup retention: as per provider default (typically 7-30 days)
- Disaster recovery: manual restoration if needed

---

## User Roles & Permissions

### 7.1 Role Definitions

#### REQ-ROLE-001: SuperAdmin Role
**Description:** SuperAdmin users have system-wide administrative access.

**Permissions:**
- Create, read, update, delete stores
- Approve/reject store applications
- Create/edit/delete users for any store
- Create/edit/delete inventory for any store
- View all transactions and analytics
- Create, edit, delete adverts (universal and store-specific)
- Access system cleanup functions
- Access all admin pages and reports

**Restrictions:**
- Cannot directly process till transactions (must switch to store)
- Cannot mark orders as complete (kitchen only)

#### REQ-ROLE-002: Store Admin Role
**Description:** Store Admin users manage a single store.

**Permissions:**
- Create/edit/delete users within their store
- Create/edit/delete inventory items
- View all orders and transactions
- View store analytics and reports
- Update store branding settings
- Access admin dashboard
- View staff performance reports

**Restrictions:**
- Cannot approve stores
- Cannot create adverts (SuperAdmin only)
- Cannot access other stores' data
- Cannot create test accounts or cleanup system

#### REQ-ROLE-003: Till Operator (Staff) Role
**Description:** Till operators process customer transactions.

**Permissions:**
- Create orders
- Modify pending orders
- Accept payments
- View order history for their shifts
- Print receipts
- Access till page only

**Restrictions:**
- Cannot modify completed orders
- Cannot access inventory management
- Cannot access admin dashboard
- Cannot view other staff transactions (optional: can view own only)
- Cannot update store settings

#### REQ-ROLE-004: Kitchen Staff Role
**Description:** Kitchen staff prepare and manage orders.

**Permissions:**
- View order queue
- Update order status (PENDING → IN_PROGRESS → READY)
- View special notes on orders
- Access kitchen page only

**Restrictions:**
- Cannot modify order items
- Cannot access till or admin functions
- Cannot view transaction history
- Cannot access payment information

---

## Integration & API Requirements

### 8.1 API Standards

#### REQ-API-001: RESTful API Design
**Description:** APIs shall follow RESTful conventions.

**Details:**
- Standard HTTP methods: GET, POST, PUT, DELETE
- Resource-based URLs: /api/{resource}/{id}
- Standard status codes: 200, 201, 400, 401, 403, 404, 500
- JSON request/response format
- Consistent error response structure

#### REQ-API-002: Error Handling
**Description:** APIs shall return consistent error responses.

**Details:**
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {} // optional additional details
  }
}
```

#### REQ-API-003: Pagination
**Description:** List endpoints shall support pagination.

**Details:**
- Query parameters: limit, offset (or page, pageSize)
- Default limit: 20 items
- Maximum limit: 100 items
- Response includes: data array, total count, has_more flag

#### REQ-API-004: Rate Limiting
**Description:** API endpoints should be rate-limited (optional feature).

**Details:**
- Per-user rate limiting
- Typical limit: 100 requests per minute
- Return 429 Too Many Requests when exceeded

### 8.2 Third-Party Integrations

#### REQ-API-005: Email Service Integration
**Description:** System shall send emails for notifications.

**Details:**
- Service: Resend (currently configured)
- Use cases: store approval notifications, password resets
- Template-based emails
- Configurable sender email and subject

#### REQ-API-006: Payment Gateway Integration
**Description:** System shall support payment processing (optional advanced feature).

**Details:**
- Currently: manual payment recording (cash, card selection)
- Future integration: Stripe, Square, or similar
- PCI compliance required
- Webhook handling for payment confirmations

---

## Version History & Future Additions

### Version 1.0 (Current - May 9, 2026)

**Released Features:**
- Multi-tenant store management
- User authentication and role-based access control
- Complete order lifecycle management (PENDING → COMPLETED)
- Kitchen order queue with real-time updates
- Payment processing (manual recording with multiple methods)
- Transaction history and basic analytics
- Inventory management and menu creation
- Store branding customization with real-time persistence
- Promotional advertising system
- SuperAdmin store approval workflow
- Staff management and performance tracking
- Receipt generation and display

**Known Limitations:**
- Polling-based real-time updates (not websocket)
- Manual payment recording (no PCI-compliant card processing)
- Limited export formats (CSV optional)
- Single-region deployment (US-East)
- No offline mode

---

### Version 1.1 (Planned - Q3 2026)

**Planned Features:**
- [ ] Advanced reporting with custom date ranges
- [ ] Staff shift tracking and time clock
- [ ] Inventory forecasting based on sales trends
- [ ] Customer loyalty program integration
- [ ] Discount and coupon system
- [ ] Mobile app for kitchen staff (iOS/Android)
- [ ] Email receipt delivery
- [ ] Multi-language support
- [ ] Backup and recovery dashboard

**Performance Improvements:**
- [ ] WebSocket implementation for real-time updates
- [ ] Server-side caching layer (Redis)
- [ ] Query optimization and database restructuring
- [ ] CDN integration for static assets

---

### Version 2.0 (Planned - Q1 2027)

**Major Features:**
- [ ] PCI-compliant card payment processing
- [ ] Multiple payment gateway support
- [ ] Supplier and purchase order management
- [ ] Employee scheduling system
- [ ] Advanced financial reporting (P&L, cash flow)
- [ ] Multi-currency support
- [ ] Tax calculation and compliance (by jurisdiction)
- [ ] Recipe costing and margin analysis
- [ ] Table management for dine-in restaurants
- [ ] Reservation system
- [ ] Customer feedback and ratings system

**Infrastructure:**
- [ ] Multi-region deployment
- [ ] High availability (99.9% uptime SLA)
- [ ] Disaster recovery procedures
- [ ] Database replication and failover
- [ ] Load balancing across regions

---

### Future Considerations (Backlog)

**Features Under Consideration:**
- Offline mode with sync when online
- Computer vision for automated order verification
- AI-powered inventory management
- Predictive analytics and demand forecasting
- Social media integration
- API for third-party integrations
- Webhook support for external systems
- Advanced fraud detection
- Business intelligence dashboard
- Multi-device synchronization
- Voice-activated order entry
- Receipt customization engine

---

### Appendix A: Data Models Summary

#### Store
```
id: String (primary key)
name: String
email: String (unique)
address: String?
phone: String?
currency: String (default: USD)
primaryColor: String
secondaryColor: String
accentColor: String
backgroundImage: String?
isActive: Boolean
isApproved: Boolean
emailVerified: Boolean
verificationCode: String?
createdAt: DateTime
updatedAt: DateTime
```

#### User
```
id: String (primary key)
email: String (unique)
password: String (hashed)
name: String
role: Role enum (STAFF, KITCHEN, ADMIN, SUPERADMIN)
storeId: String? (foreign key, nullable for SuperAdmin)
isActive: Boolean
createdAt: DateTime
updatedAt: DateTime
```

#### Order
```
id: String (primary key)
orderNumber: String (human-readable)
storeId: String (foreign key)
staffId: String? (foreign key)
status: OrderStatus enum (PENDING, IN_PROGRESS, READY, COMPLETED, CANCELLED)
subtotal: Float
tax: Float
total: Float
paymentMethod: String?
notes: String?
createdAt: DateTime
updatedAt: DateTime
completedAt: DateTime?
```

#### InventoryItem
```
id: String (primary key)
storeId: String (foreign key)
name: String
category: String
unitPrice: Float
quantity: Int
isActive: Boolean
createdAt: DateTime
updatedAt: DateTime
```

#### Advert
```
id: String (primary key)
storeId: String? (foreign key, nullable for universal)
title: String
description: String?
imageUrl: String
link: String?
caption: String?
isActive: Boolean
order: Int (display order)
createdAt: DateTime
updatedAt: DateTime
```

---

### Appendix B: API Endpoint Reference

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---|
| `/api/auth/login` | POST | User login | No |
| `/api/stores` | GET | List stores | Yes |
| `/api/stores` | POST | Create store | Yes |
| `/api/stores/{id}` | GET | Get store details | Yes |
| `/api/stores/branding` | POST | Update branding | Yes |
| `/api/users` | GET | List users | Yes |
| `/api/users` | POST | Create user | Yes |
| `/api/users/{id}` | PUT | Update user | Yes |
| `/api/inventory` | GET | List inventory | Yes |
| `/api/inventory` | POST | Create item | Yes |
| `/api/inventory/{id}` | PUT | Update item | Yes |
| `/api/inventory/{id}` | DELETE | Delete item | Yes |
| `/api/orders` | GET | List orders | Yes |
| `/api/orders` | POST | Create order | Yes |
| `/api/orders/{id}` | PUT | Update order | Yes |
| `/api/orders/{id}` | DELETE | Cancel order | Yes |
| `/api/transactions` | GET | Transaction history | Yes |
| `/api/analytics` | GET | Sales analytics | Yes |
| `/api/adverts` | GET | Get adverts | Yes |
| `/api/adverts` | POST | Create advert | Yes (SuperAdmin) |
| `/api/adverts/{id}` | PUT | Update advert | Yes (SuperAdmin) |
| `/api/adverts/{id}` | DELETE | Delete advert | Yes (SuperAdmin) |
| `/api/admin/approve-store` | POST | Approve store | Yes (SuperAdmin) |

---

**Document Generated:** May 9, 2026  
**Next Review Date:** August 9, 2026  
**Owner:** Technical Architecture Team  
**Classification:** Internal - Technical Documentation

---

*This document is the authoritative specification for the Sales Till System. All development must align with these requirements. For updates or clarifications, contact the Technical Architecture Team.*
