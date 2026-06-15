import { z } from 'zod';

export const createReviewSchema = z.object({
  productId: z.string().uuid('Product ID must be a valid UUID'),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  reviewText: z.string().min(10, 'Review must be at least 10 characters').max(1000, 'Review must not exceed 1000 characters'),
});

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5').optional(),
  reviewText: z.string().min(10, 'Review must be at least 10 characters').max(1000, 'Review must not exceed 1000 characters').optional(),
});
