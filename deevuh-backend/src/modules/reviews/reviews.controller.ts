import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/authMiddleware.js';
import prisma from '../../config/database.js';

export const createReview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { productId, rating, reviewText } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Authentication required.' });
      return;
    }

    // 1. Verify if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });
    if (!product) {
      res.status(404).json({ status: 'error', message: 'Product not found.' });
      return;
    }

    // 2. Verify purchase status: user must have a successful order containing this product
    const successfulOrder = await prisma.order.findFirst({
      where: {
        userId,
        paymentStatus: 'SUCCESS',
        items: {
          some: {
            variant: {
              productId
            }
          }
        }
      }
    });

    if (!successfulOrder) {
      res.status(403).json({
        status: 'error',
        message: 'Only customers who have purchased this product can leave a review.'
      });
      return;
    }

    // 3. Check for duplicate review
    const existingReview = await prisma.review.findFirst({
      where: { productId, userId }
    });

    if (existingReview) {
      res.status(400).json({
        status: 'error',
        message: 'You have already reviewed this product. Please edit your existing review instead.'
      });
      return;
    }

    // 4. Create review
    const review = await prisma.review.create({
      data: {
        productId,
        userId,
        rating,
        reviewText,
        verifiedPurchase: true
      },
      include: {
        user: {
          select: { name: true }
        }
      }
    });

    res.status(201).json({
      status: 'success',
      data: review
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateReview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { rating, reviewText } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Authentication required.' });
      return;
    }

    // Find review
    const review = await prisma.review.findUnique({
      where: { id }
    });

    if (!review) {
      res.status(404).json({ status: 'error', message: 'Review not found.' });
      return;
    }

    // Check ownership
    if (review.userId !== userId) {
      res.status(403).json({ status: 'error', message: 'You can only edit your own reviews.' });
      return;
    }

    // Update review
    const updatedReview = await prisma.review.update({
      where: { id },
      data: {
        rating: rating !== undefined ? rating : undefined,
        reviewText: reviewText !== undefined ? reviewText : undefined,
      },
      include: {
        user: {
          select: { name: true }
        }
      }
    });

    res.status(200).json({
      status: 'success',
      data: updatedReview
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const deleteReview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Authentication required.' });
      return;
    }

    // Find review
    const review = await prisma.review.findUnique({
      where: { id }
    });

    if (!review) {
      res.status(404).json({ status: 'error', message: 'Review not found.' });
      return;
    }

    // Check permissions: owner or admin
    if (review.userId !== userId && userRole !== 'ADMIN') {
      res.status(403).json({ status: 'error', message: 'Access denied: privilege verification failed.' });
      return;
    }

    await prisma.review.delete({
      where: { id }
    });

    res.status(200).json({
      status: 'success',
      message: 'Review deleted successfully.'
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getProductReviews = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const productId = req.params.productId as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 5;
    const sort = (req.query.sort as string) || 'recent';
    const skip = (page - 1) * limit;

    // Build filters. Admin can see hidden reviews, regular users cannot.
    const userRole = req.user?.role;
    const where: any = {
      productId,
      ...(userRole === 'ADMIN' ? {} : { isHidden: false })
    };

    // Determine sorting
    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'highest') {
      orderBy = { rating: 'desc' };
    } else if (sort === 'lowest') {
      orderBy = { rating: 'asc' };
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: {
            select: { name: true }
          }
        }
      }),
      prisma.review.count({ where })
    ]);

    res.status(200).json({
      status: 'success',
      data: reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getProductRatingSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const productId = req.params.productId as string;

    // Fetch all active reviews to compute aggregates
    const reviews = await prisma.review.findMany({
      where: {
        productId,
        isHidden: false
      },
      select: {
        rating: true
      }
    });

    const totalCount = reviews.length;
    let averageRating = 0;
    const distribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0
    };

    if (totalCount > 0) {
      const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
      averageRating = Math.round((sum / totalCount) * 10) / 10; // Rounded to 1 decimal place

      reviews.forEach((r) => {
        const ratingKey = r.rating as 1 | 2 | 3 | 4 | 5;
        if (distribution[ratingKey] !== undefined) {
          distribution[ratingKey]++;
        }
      });
    }

    // Calculate percentage breakdown
    const breakdown = Object.entries(distribution).reduce((acc, [key, count]) => {
      const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
      acc[key] = { count, percentage };
      return acc;
    }, {} as any);

    res.status(200).json({
      status: 'success',
      data: {
        averageRating,
        totalCount,
        breakdown
      }
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const checkPurchaseStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const productId = req.params.productId as string;
    const userId = req.user?.id;

    if (!userId) {
      res.status(200).json({
        status: 'success',
        data: {
          hasPurchased: false,
          hasReviewed: false,
          existingReview: null
        }
      });
      return;
    }

    // 1. Verify successful purchase
    const successfulOrder = await prisma.order.findFirst({
      where: {
        userId,
        paymentStatus: 'SUCCESS',
        items: {
          some: {
            variant: {
              productId
            }
          }
        }
      }
    });

    // 2. Fetch existing review if any
    const existingReview = await prisma.review.findFirst({
      where: { productId, userId }
    });

    res.status(200).json({
      status: 'success',
      data: {
        hasPurchased: !!successfulOrder,
        hasReviewed: !!existingReview,
        existingReview
      }
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const moderateReview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { isHidden } = req.body;

    if (typeof isHidden !== 'boolean') {
      res.status(400).json({ status: 'error', message: 'isHidden field must be a boolean.' });
      return;
    }

    const review = await prisma.review.update({
      where: { id },
      data: { isHidden }
    });

    res.status(200).json({
      status: 'success',
      data: review
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
