/**
 * ImmoScout 風格 UI 組件匯出
 */

// Theme
export { immoTheme, immoColors, immoTypography, immoSpacing, immoRadius, immoShadows } from './theme';

// Shared Components
export { ImmoImageCarousel } from './ImmoImageCarousel';
export { ImmoCardActions } from './ImmoCardActions';

// UI Components
export { ImmoScoutSearchBar } from './ImmoScoutSearchBar';
export { ImmoScoutFilterChips, defaultFilterChips, type FilterChip } from './ImmoScoutFilterChips';

export { 
  ImmoScoutWishCard, 
  ImmoScoutWishCardSkeleton, 
} from './ImmoScoutWishCard';

export { 
  ImmoScoutTripCard, 
  ImmoScoutTripCardSkeleton,
} from './ImmoScoutTripCard';

export { 
  ImmoScoutDiscoveryCard, 
  // ImmoScoutDiscoveryCardSkeleton, // Temporarily removed as it was not provided in the refactor
} from './ImmoScoutDiscoveryCard';

// Adapters
export {
  normalizeWishForCard,
  type ImmoWishDisplayModel,
  normalizeTripForCard,
  type ImmoTripDisplayModel,
  normalizeDiscoveryForCard,
  type ImmoDiscoveryDisplayModel,
} from './immoAdapters';
