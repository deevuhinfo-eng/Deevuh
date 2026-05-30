import { z } from 'zod';

export const createProductSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().min(1, 'Description is required'),
  basePrice: z.number().positive('Base price must be positive'),
  category: z.string().min(1, 'Category is required').max(100),
  variants: z.array(z.object({
    size: z.string().min(1),
    price: z.number().positive(),
    stockQty: z.number().int().min(0),
  })).optional(),
  images: z.array(z.object({
    imageUrl: z.string().url(),
  })).optional(),
});

export const updateProductSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().min(1).optional(),
  basePrice: z.number().positive().optional(),
  category: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});
