import express from 'express';
import { getAllProducts,getFeaturedProducts,getProductsByCategory,createProduct,deleteProduct,getRecommendedProducts,toggleFeaturedProduct } from '../controllers/product.controller.js';
import {protectRoute,adminRoute} from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/products',protectRoute, adminRoute, getAllProducts);
router.get('/featured',getFeaturedProducts);
router.get('/category.:category',getProductsByCategory);
router.get('/recommendations',getRecommendedProducts);
router.post('/',protectRoute, adminRoute, createProduct);
router.patch('/:id',protectRoute, adminRoute, toggleFeaturedProduct);
router.delete('/:id',protectRoute, adminRoute, deleteProduct);

export default router;

