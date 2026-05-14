import { z } from 'zod';

// ── Auth ────────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address').max(254),
  password: z.string().min(1, 'Password is required').max(1024),
  storeId: z.string().optional(),
});

// ── Orders ──────────────────────────────────────────────────────────────────

export const OrderItemSchema = z.object({
  name: z.string().min(1).max(255),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  notes: z.string().max(1000).optional(),
});

export const PaymentSchema = z.object({
  method: z.string().min(1).max(50),
  amount: z.number().nonnegative(),
});

export const CreateOrderSchema = z.object({
  items: z.array(OrderItemSchema).min(1, 'At least one item is required'),
  notes: z.string().max(2000).optional(),
  paymentMethod: z.string().max(50).optional(),
  payments: z.array(PaymentSchema).max(2).optional(),
  printedForKitchen: z.boolean().optional(),
});

// ── Users ───────────────────────────────────────────────────────────────────

export const CreateUserSchema = z.object({
  email: z.string().email().max(254),
  name: z.string().min(1).max(255),
  password: z.string().min(8).max(1024),
  role: z.enum(['ADMIN', 'STAFF', 'CASHIER', 'KITCHEN']).optional(),
  storeId: z.string().optional(),
});
