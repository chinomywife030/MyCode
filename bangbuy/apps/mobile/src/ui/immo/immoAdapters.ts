import { Discovery } from '@/src/lib/discoveries';

// Wish Adapter
export interface ImmoWishDisplayModel {
  id: string;
  title: string;
  country?: string;
  image?: string;
  images?: string[];
  price: number;
  priceFormatted: string;
  userName: string;
  status: string;
  statusText: string;
}

export function normalizeWishForCard(wish: {
  id: string;
  title: string;
  targetCountry?: string;
  images?: string[];
  budget?: number;
  price?: number;
  commission?: number;
  buyer?: { name?: string; avatarUrl?: string };
  status?: string;
}): ImmoWishDisplayModel {
  let displayPrice = 0;
  if (wish.budget && wish.budget > 0) {
    displayPrice = wish.budget;
  } else if (wish.price && wish.commission) {
    displayPrice = wish.price + wish.commission;
  } else if (wish.price) {
    displayPrice = wish.price;
  }

  return {
    id: wish.id,
    title: wish.title || '',
    country: wish.targetCountry,
    image: wish.images?.[0],
    images: Array.isArray(wish.images) ? wish.images : [],
    price: displayPrice,
    priceFormatted: displayPrice > 0 
      ? `NT$ ${displayPrice.toLocaleString()}`
      : '價格洽詢',
    userName: wish.buyer?.name || '使用者',
    status: wish.status || 'open',
    statusText: wish.status === 'open' ? '需求中' : wish.status || '需求中',
  };
}

// Trip Adapter
export interface ImmoTripDisplayModel {
  id: string;
  destination: string;
  description?: string;
  dateRange?: string;
  ownerName: string;
  ownerAvatar?: string;
  ownerInitial: string;
}

export function normalizeTripForCard(trip: {
  id: string;
  destination: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  owner?: { name?: string; avatarUrl?: string };
}, dateRange?: string): ImmoTripDisplayModel {
  const ownerName = trip.owner?.name || '匿名用戶';
  
  return {
    id: trip.id,
    destination: trip.destination || '',
    description: trip.description,
    dateRange: dateRange,
    ownerName,
    ownerAvatar: trip.owner?.avatarUrl,
    ownerInitial: ownerName.charAt(0).toUpperCase(),
  };
}

// Discovery Adapter
export interface ImmoDiscoveryDisplayModel {
  id: string;
  title: string;
  country?: string;
  city?: string;
  image?: string;
  images?: string[];
  authorName: string;
  authorInitial: string;
  authorId?: string;
}

export function normalizeDiscoveryForCard(discovery: Discovery): ImmoDiscoveryDisplayModel {
  if (!discovery) return {} as any;

  const authorName = discovery.profiles?.name || '匿名用戶';
  
  return {
    id: discovery.id,
    title: discovery.title || '',
    country: discovery.country,
    city: discovery.city,
    image: discovery.photos?.[0],
    images: Array.isArray(discovery.photos) ? discovery.photos : [],
    authorName,
    authorInitial: authorName.charAt(0).toUpperCase(),
    authorId: discovery.user_id,
  };
}
