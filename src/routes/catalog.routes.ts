import { Router, Request, Response, NextFunction } from 'express';
import { productRepo } from '../repositories/productRepo';
import { categoryRepo } from '../repositories/categoryRepo';
import { artisanRepo } from '../repositories/artisanRepo';
import { userRepo } from '../repositories/userRepo';
import { reviewRepo } from '../repositories/reviewRepo';

const router = Router();

router.get('/products', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const result = await productRepo.findPublic({
      search: req.query.search as string,
      category: req.query.category as string,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
      sort: req.query.sort as string,
      featured: req.query.featured === 'true',
      page,
      limit,
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.get('/products/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await productRepo.findBySlug(req.params.slug);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    if (product.status !== 'APPROVED') return res.status(404).json({ success: false, error: 'Product not found' });

    const images = await productRepo.getImages(product.id);
    const reviews = await reviewRepo.findByProduct(product.id);
    res.json({ success: true, data: { ...product, images, reviews } });
  } catch (err) { next(err); }
});

router.get('/categories', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await categoryRepo.findAll();
    res.json({ success: true, data: categories });
  } catch (err) { next(err); }
});

router.get('/artisans', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const artisans = await artisanRepo.findAllWithProfiles();
    res.json({ success: true, data: artisans });
  } catch (err) { next(err); }
});

router.get('/artisans/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userRepo.findById(parseInt(req.params.id));
    if (!user || user.role !== 'ARTISAN') {
      return res.status(404).json({ success: false, error: 'Artisan not found' });
    }
    const profile = await artisanRepo.findByUserId(user.id);
    const products = await productRepo.findByArtisan(user.id);
    const approvedProducts = products.filter(p => p.status === 'APPROVED');
    res.json({ success: true, data: { user, profile, products: approvedProducts } });
  } catch (err) { next(err); }
});

export default router;
