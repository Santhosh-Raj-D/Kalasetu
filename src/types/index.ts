export type Role = 'ADMIN' | 'ARTISAN' | 'CUSTOMER' | 'CONSULTANT';
export type UserStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED';
export type ProductStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'DELISTED';
export type OrderStatus = 'PLACED' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type PaymentMethod = 'MOCK_CARD' | 'MOCK_UPI' | 'COD';
export type PaymentStatus = 'SUCCESS' | 'FAILED' | 'PENDING';
export type DiscountType = 'PERCENT' | 'FLAT';
export type InquiryStatus = 'OPEN' | 'QUOTED' | 'ACCEPTED' | 'DECLINED' | 'CLOSED';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  is_business: boolean;
  business_name?: string;
  status: UserStatus;
  created_at: Date;
}

export interface ArtisanProfile {
  user_id: number;
  tribe_name: string;
  region: string;
  craft_tradition: string;
  story?: string;
  years_experience: number;
  profile_image?: string;
  cover_image?: string;
}

export interface Product {
  id: number;
  artisan_id: number;
  category_id: number;
  name: string;
  slug: string;
  description: string;
  craft_technique?: string;
  materials?: string;
  price: number;
  stock: number;
  status: ProductStatus;
  is_featured: boolean;
  cultural_notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image?: string;
}

export interface Order {
  id: number;
  order_number: string;
  customer_id: number;
  subtotal: number;
  discount_amount: number;
  total: number;
  coupon_id?: number;
  status: OrderStatus;
  ship_name: string;
  ship_phone: string;
  ship_address: string;
  ship_city: string;
  ship_state: string;
  ship_pincode: string;
  created_at: Date;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  artisan_id: number;
  quantity: number;
  unit_price: number;
}

export interface CartItem {
  id: number;
  user_id: number;
  product_id: number;
  quantity: number;
}

export interface Coupon {
  id: number;
  code: string;
  description?: string;
  discount_type: DiscountType;
  discount_value: number;
  min_order_amount: number;
  max_uses: number;
  used_count: number;
  valid_from: Date;
  valid_to: Date;
  created_by: number;
  artisan_id?: number;
  is_active: boolean;
}

export interface Review {
  id: number;
  product_id: number;
  customer_id: number;
  rating: number;
  comment?: string;
  created_at: Date;
}

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  body?: string;
  link?: string;
  is_read: boolean;
  created_at: Date;
}

export interface BulkInquiry {
  id: number;
  business_user_id: number;
  product_id: number;
  quantity: number;
  target_price?: number;
  message?: string;
  status: InquiryStatus;
  created_at: Date;
}

export interface SupportTicket {
  id: number;
  raised_by: number;
  order_id?: number;
  subject: string;
  description: string;
  status: TicketStatus;
  assigned_admin_id?: number;
  resolution_note?: string;
  created_at: Date;
  resolved_at?: Date;
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
