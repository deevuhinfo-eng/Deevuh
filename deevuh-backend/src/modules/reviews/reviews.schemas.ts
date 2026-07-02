import { z } from 'zod';

export const createReviewSchema = z.object({
  productId: z.string().uuid('Product ID must be a valid UUID'),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  title: z.string().max(255, 'Title must not exceed 255 characters').optional().nullable(),
  reviewText: z.string().min(10, 'Review must be at least 10 characters').max(1000, 'Review must not exceed 1000 characters'),
  images: z.array(z.string().url('Invalid image URL')).max(5, 'You can upload up to 5 images').optional(),
});

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5').optional(),
  title: z.string().max(255, 'Title must not exceed 255 characters').optional().nullable(),
  reviewText: z.string().min(10, 'Review must be at least 10 characters').max(1000, 'Review must not exceed 1000 characters').optional(),
  images: z.array(z.string().url('Invalid image URL')).max(5, 'You can upload up to 5 images').optional(),
});
