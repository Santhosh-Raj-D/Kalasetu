import { productRepo } from '../repositories/productRepo';
import { verificationRepo } from '../repositories/verificationRepo';
import { userRepo } from '../repositories/userRepo';
import { createNotification } from '../utils/notify';
import { createError } from '../middleware/errorHandler';

export const verificationService = {
  async review(consultantId: number, data: {
    productId: number;
    decision: 'APPROVED' | 'REJECTED';
    feedback?: string;
    culturalNotes?: string;
  }) {
    const product = await productRepo.findById(data.productId);
    if (!product) throw createError('Product not found', 404);
    if (product.status !== 'PENDING_REVIEW') {
      throw createError('Product is not pending review', 400);
    }

    await verificationRepo.create({
      product_id: data.productId,
      consultant_id: consultantId,
      decision: data.decision,
      feedback: data.feedback,
    });

    await productRepo.updateStatus(
      data.productId,
      data.decision === 'APPROVED' ? 'APPROVED' : 'REJECTED',
      data.decision === 'APPROVED' ? data.culturalNotes : undefined,
    );

    const artisan = await userRepo.findById(product.artisan_id);
    if (artisan) {
      const title = data.decision === 'APPROVED'
        ? `Your product "${product.name}" has been approved!`
        : `Your product "${product.name}" was not approved`;
      const body = data.decision === 'APPROVED'
        ? 'It is now live in the marketplace with an Authenticity Badge.'
        : data.feedback || 'See the feedback for details.';
      await createNotification(artisan.id, 'REVIEW_DECISION', title, body, `/artisan/products.html`);
    }
  },
};
