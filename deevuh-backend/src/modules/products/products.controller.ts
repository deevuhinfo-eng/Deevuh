import { Request, Response } from 'express';
import prisma from '../../config/database.js';
import { AuthenticatedRequest } from '../../middleware/adminGuard.js';

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
          images: true,
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
        include: { variants: true, images: true },
      });
    } else {
      // Map frontend slug to database title
      const slugMap: Record<string, string> = {
        'baby-blue-coordset': 'Baby Blue Coordset',
        'beige-outfit': 'Beige Tailored Set',
        'brown-coordset': 'Brown Earthy Coordset',
        'dupatta-beige-outfit': 'Beige Dupatta Set',
      };

      const title = slugMap[idOrSlug];
      if (title) {
        product = await prisma.product.findFirst({
          where: { title },
          include: { variants: true, images: true },
        });
      }

      // Fallback matching slugified titles
      if (!product) {
        const allProducts = await prisma.product.findMany({
          include: { variants: true, images: true },
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
      include: { variants: true, images: true },
    });

    res.status(201).json({ status: 'success', data: product });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id as string },
      data: req.body,
      include: { variants: true, images: true },
    });
    res.status(200).json({ status: 'success', data: product });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const deleteProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await prisma.product.delete({ where: { id: req.params.id as string } });
    res.status(200).json({ status: 'success', message: 'Product deleted.' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
