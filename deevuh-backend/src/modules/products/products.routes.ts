import { Router } from 'express';
import { listProducts, getProduct, createProduct, updateProduct, deleteProduct } from './products.controller.js';
import { adminGuard } from '../../middleware/adminGuard.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { createProductSchema, updateProductSchema } from './products.schemas.js';

const router = Router();

router.get('/', listProducts);
router.get('/:id', getProduct);
router.post('/', adminGuard, validateRequest(createProductSchema), createProduct);
router.put('/:id', adminGuard, validateRequest(updateProductSchema), updateProduct);
router.delete('/:id', adminGuard, deleteProduct);

export default router;
