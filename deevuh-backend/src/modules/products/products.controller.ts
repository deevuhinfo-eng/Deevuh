import { Request, Response } from 'express';
import prisma from '../../config/database.js';
import { AuthenticatedRequest } from '../../middleware/adminGuard.js';
import { deleteImageFromCloudinary, extractPublicId } from '../uploads/cloudinary.service.js';

export const listProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const skip = (page - 1) * limit;
    const category = req.query.category as string | undefined;

    const where: any = { isActive: true };
    if (category) where.category = category;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          variants: true,
          images: {
            orderBy: {
              order: 'asc'
            }
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    res.status(200).json({
      status: 'success',
      data: products,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const idOrSlug = req.params.id as string;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    let product = null;

    if (uuidRegex.test(idOrSlug)) {
      product = await prisma.product.findUnique({
        where: { id: idOrSlug },
        include: {
          variants: true,
          images: {
            orderBy: {
              order: 'asc'
            }
          }
        },
      });
    } else {
      // Map frontend slug to database title (supports both new updated titles and old seeded titles)
      const slugMap: Record<string, string[]> = {
        'baby-blue-coordset': ['The Vatavaran Coordset', 'Baby Blue Coordset'],
        'beige-outfit': ['The Korean Coordset', 'Beige Tailored Set'],
        'brown-coordset': ['The Mocha Brown Coordset', 'Brown Earthy Coordset'],
        'dupatta-beige-outfit': ['The Rani Coordset', 'Beige Dupatta Set'],
      };

      const titles = slugMap[idOrSlug];
      if (titles) {
        product = await prisma.product.findFirst({
          where: { title: { in: titles } },
          include: {
            variants: true,
            images: {
              orderBy: {
                order: 'asc'
              }
            }
          },
        });
      }

      // Fallback matching slugified titles
      if (!product) {
        const allProducts = await prisma.product.findMany({
          include: {
            variants: true,
            images: {
              orderBy: {
                order: 'asc'
              }
            }
          },
        });
        product = allProducts.find(p => {
          const formattedSlug = p.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
          return formattedSlug === idOrSlug;
        }) || null;
      }
    }

    if (!product) {
      res.status(404).json({ status: 'error', message: 'Product not found.' });
      return;
    }
    res.status(200).json({ status: 'success', data: product });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const createProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, description, basePrice, category, variants, images } = req.body;

    const product = await prisma.product.create({
      data: {
        title,
        description,
        basePrice,
        category,
        variants: variants ? { create: variants } : undefined,
        images: images ? { create: images } : undefined,
      },
      include: {
        variants: true,
        images: {
          orderBy: {
            order: 'asc'
          }
        }
      },
    });

    res.status(201).json({ status: 'success', data: product });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const productId = req.params.id as string;
    const { basePrice, images, ...otherData } = req.body;

    const product = await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: {
          ...otherData
        },
      });

      if (basePrice !== undefined) {
        await tx.productVariant.updateMany({
          where: { productId },
          data: { price: basePrice },
        });
        await tx.product.update({
          where: { id: productId },
          data: { basePrice },
        });
      }

      // Sync images if provided
      if (images !== undefined) {
        const existingImages = await tx.productImage.findMany({
          where: { productId }
        });

        const newUrls = new Set(images.map((img: any) => img.imageUrl));
        const imagesToDelete = existingImages.filter(ext => !newUrls.has(ext.imageUrl));

        for (const img of imagesToDelete) {
          await tx.productImage.delete({ where: { id: img.id } });
          const publicId = extractPublicId(img.imageUrl);
          if (publicId) {
            try {
              await deleteImageFromCloudinary(publicId);
            } catch (err) {
              console.error(`Failed to delete Cloudinary asset for product image: ${publicId}`, err);
            }
          }
        }

        for (const img of images) {
          if (img.id) {
            await tx.productImage.update({
              where: { id: img.id },
              data: { order: img.order }
            });
          } else {
            await tx.productImage.create({
              data: {
                productId,
                imageUrl: img.imageUrl,
                order: img.order
              }
            });
          }
        }
      }

      return await tx.product.findUnique({
        where: { id: productId },
        include: {
          variants: true,
          images: {
            orderBy: {
              order: 'asc'
            }
          }
        },
      });
    });

    res.status(200).json({ status: 'success', data: product });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const deleteProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const productId = req.params.id as string;

    // Fetch product images first to clean up Cloudinary
    const images = await prisma.productImage.findMany({
      where: { productId }
    });

    // Delete product (cascades database delete to product_images and variants)
    await prisma.product.delete({ where: { id: productId } });

    // Clean up Cloudinary
    for (const img of images) {
      const publicId = extractPublicId(img.imageUrl);
      if (publicId) {
        try {
          await deleteImageFromCloudinary(publicId);
        } catch (err) {
          console.error(`Failed to delete Cloudinary asset for product image: ${publicId}`, err);
        }
      }
    }

    res.status(200).json({ status: 'success', message: 'Product deleted.' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
