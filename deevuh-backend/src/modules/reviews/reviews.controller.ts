import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/authMiddleware.js';
import prisma from '../../config/database.js';
import { deleteImageFromCloudinary, extractPublicId } from '../uploads/cloudinary.service.js';

export const createReview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { productId, rating, title, reviewText, images } = req.body;
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

    // 2. Check for duplicate review
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

    // 3. Verify purchase status to set verifiedPurchase flag dynamically
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

    // 4. Create review and images in a transaction
    const review = await prisma.$transaction(async (tx) => {
      const createdReview = await tx.review.create({
        data: {
          productId,
          userId,
          rating,
          title,
          reviewText,
          verifiedPurchase: !!successfulOrder,
        },
      });

      if (images && images.length > 0) {
        for (const url of images) {
          await tx.reviewImage.create({
            data: {
              reviewId: createdReview.id,
              imageUrl: url
            }
          });
        }
      }

      return await tx.review.findUnique({
        where: { id: createdReview.id },
        include: {
          user: { select: { name: true } },
          images: true
        }
      });
    });

    res.status(201).json({
      status: 'success',
      data: review
    });
  } catch (error: any) {
    console.error('[Create Review Error]', error);
    res.status(500).json({ status: 'error', message: 'Something went wrong.' });
  }
};

export const updateReview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { rating, title, reviewText, images } = req.body;
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

    const updatedReview = await prisma.$transaction(async (tx) => {
      // 1. Sync review images if provided
      if (images !== undefined) {
        const existingImages = await tx.reviewImage.findMany({
          where: { reviewId: id }
        });

        const newUrls = new Set(images);
        const imagesToDelete = existingImages.filter(ext => !newUrls.has(ext.imageUrl));

        for (const img of imagesToDelete) {
          await tx.reviewImage.delete({ where: { id: img.id } });
          const publicId = extractPublicId(img.imageUrl);
          if (publicId) {
            try {
              await deleteImageFromCloudinary(publicId);
            } catch (err) {
              console.error(`Failed to delete Cloudinary asset for review image: ${publicId}`, err);
            }
          }
        }

        const existingUrls = new Set(existingImages.map(img => img.imageUrl));
        for (const url of images) {
          if (!existingUrls.has(url)) {
            await tx.reviewImage.create({
              data: {
                reviewId: id,
                imageUrl: url
              }
            });
          }
        }
      }

      // 2. Update review text, rating, title
      return await tx.review.update({
        where: { id },
        data: {
          rating: rating !== undefined ? rating : undefined,
          title: title !== undefined ? title : undefined,
          reviewText: reviewText !== undefined ? reviewText : undefined,
        },
        include: {
          user: { select: { name: true } },
          images: true
        }
      });
    });

    res.status(200).json({
      status: 'success',
      data: updatedReview
    });
  } catch (error: any) {
    console.error('[Update Review Error]', error);
    res.status(500).json({ status: 'error', message: 'Something went wrong.' });
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

    // Find review along with its images
    const review = await prisma.review.findUnique({
      where: { id },
      include: { images: true }
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

    // Delete review (cascades database delete to review_images)
    await prisma.review.delete({
      where: { id }
    });

    // Delete assets from Cloudinary
    for (const img of review.images) {
      const publicId = extractPublicId(img.imageUrl);
      if (publicId) {
        try {
          await deleteImageFromCloudinary(publicId);
        } catch (err) {
          console.error(`Failed to delete Cloudinary asset for review image: ${publicId}`, err);
        }
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Review deleted successfully.'
    });
  } catch (error: any) {
    console.error('[Delete Review Error]', error);
    res.status(500).json({ status: 'error', message: 'Something went wrong.' });
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
          },
          images: true
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
    console.error('[Get Product Reviews Error]', error);
    res.status(500).json({ status: 'error', message: 'Something went wrong.' });
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
    console.error('[Get Rating Summary Error]', error);
    res.status(500).json({ status: 'error', message: 'Something went wrong.' });
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
      where: { productId, userId },
      include: { images: true }
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
    console.error('[Check Purchase Status Error]', error);
    res.status(500).json({ status: 'error', message: 'Something went wrong.' });
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
    console.error('[Moderate Review Error]', error);
    res.status(500).json({ status: 'error', message: 'Something went wrong.' });
  }
};
