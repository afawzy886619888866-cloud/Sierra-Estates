/**
 * Property Finder Enterprise API (Atlas) v1 TypeScript Definitions
 * Based on docs/property-finder-openapi.json
 */

export type PFOfferingType = 'sale' | 'rent';

export type PFPropertyCategory = 'residential' | 'commercial';

export type PFPropertyType =
  | 'apartment'
  | 'villa'
  | 'townhouse'
  | 'penthouse'
  | 'duplex'
  | 'hotel-apartment'
  | 'land'
  | 'whole-building'
  | 'bulk-sale-unit'
  | 'bulk-rent-unit'
  | 'warehouse'
  | 'office-space'
  | 'retail'
  | 'shop'
  | 'show-room'
  | 'labor-camp'
  | 'staff-accommodation'
  | 'medical-facility'
  | 'factory'
  | 'farm'
  | 'co-working-space'
  | 'business-center'
  | 'chalet'
  | 'twin-house'
  | 'ivilla'
  | 'cabin'
  | 'palace'
  | 'roof'
  | 'bungalow'
  | 'compound'
  | 'rest-house'
  | 'restaurant'
  | 'clinic'
  | 'cafeteria';

export type PFAmenity =
  | 'central-ac'
  | 'built-in-wardrobes'
  | 'kitchen-appliances'
  | 'security'
  | 'balcony'
  | 'shared-gym'
  | 'shared-spa'
  | 'covered-parking'
  | 'maids-room'
  | 'study'
  | 'shared-pool'
  | 'childrens-pool'
  | 'private-garden'
  | 'private-pool'
  | 'view-of-water'
  | 'view-of-landmark'
  | 'walk-in-closet'
  | 'lobby-in-building'
  | 'networked'
  | 'dining-in-building'
  | 'conference-room'
  | 'concierge'
  | 'private-gym'
  | 'private-jacuzzi'
  | 'barbecue-area'
  | 'electricity'
  | 'waters'
  | 'sanitation'
  | 'no-services'
  | 'fixed-phone'
  | 'fibre-optics'
  | 'flood-drainage'
  | 'maid-service'
  | 'childrens-play-area'
  | 'pets-allowed'
  | 'vastu-compliant';

export type PFFurnishingType = 'unfurnished' | 'semi-furnished' | 'furnished';

export type PFFinishingType = 'fully-finished' | 'semi-finished' | 'unfinished';

export type PFListingStage = 'draft' | 'live' | 'takendown' | 'archived';

export interface PFTranslation {
  en?: string;
  ar?: string;
}

export interface PFPrice {
  type: 'sale' | 'yearly' | 'monthly' | 'weekly' | 'daily';
  amounts: {
    sale?: number;
    yearly?: number;
    monthly?: number;
    weekly?: number;
    daily?: number;
  };
  downpayment?: number;
  minimalRentalPeriod?: number;
  mortgage?: {
    enabled: boolean;
    comment?: string;
  };
  obligation?: {
    enabled: boolean;
    comment?: string;
  };
  valueAffected?: {
    enabled: boolean;
    comment?: string;
  };
  onRequest?: boolean;
  paymentMethods?: Array<'cash' | 'installments'>;
  utilitiesInclusive?: boolean;
  numberOfCheques?: number;
}

export interface PFLocationInfo {
  id: number;
  name?: string;
  path?: string;
}

export interface PFMedia {
  images?: Array<{
    original: { url: string; width?: number; height?: number };
    medium?: { url: string; width?: number; height?: number };
    thumbnail?: { url: string; width?: number; height?: number };
    large?: { url: string; width?: number; height?: number };
    watermarked?: { url: string; width?: number; height?: number };
  }>;
  videos?: {
    default?: string;
    view360?: string;
  };
}

export interface PFCompliance {
  type?: 'rera' | 'dtcm' | 'adrec';
  listingAdvertisementNumber?: string;
  advertisementLicenseIssuanceDate?: string;
  issuingClientLicenseNumber?: string;
  userConfirmedDataIsCorrect?: boolean;
}

export interface PFListing {
  id: string;
  reference: string;
  title: PFTranslation;
  description: PFTranslation;
  category: PFPropertyCategory;
  type: PFPropertyType;
  offeringType: PFOfferingType;
  price: PFPrice;
  size: number;
  location: PFLocationInfo;
  media: PFMedia;
  bedrooms?: 'studio' | '1' | '2' | '3' | '4' | '5' | '6' | string;
  bathrooms?: 'none' | '1' | '2' | '3' | '4' | '5' | '6' | string;
  amenities?: PFAmenity[];
  furnishingType?: PFFurnishingType;
  finishingType?: PFFinishingType;
  completionStatus?: 'off_plan' | 'off_plan_primary' | 'completed' | 'completed_primary';
  floorNumber?: string;
  numberOfFloors?: number;
  parkingSlots?: number;
  hasParkingOnSite?: boolean;
  hasKitchen?: boolean;
  hasGarden?: boolean;
  plotSize?: number;
  builtUpArea?: number;
  yearBuilt?: number;
  age?: number;
  developer?: string;
  projectStatus?: string;
  state: {
    stage: PFListingStage;
    type: string;
    reasons?: PFTranslation[];
  };
  assignedTo?: {
    id: number;
    name?: string;
  };
  createdBy?: {
    id: number;
    name?: string;
  };
  createdAt: string;
  updatedAt: string;
  compliance?: PFCompliance;
}

/**
 * Request payload for creating/updating a listing
 */
export interface PFListingRequest extends Partial<Omit<PFListing, 'id' | 'state' | 'createdAt' | 'updatedAt' | 'createdBy'>> {
  reference: string;
  title: PFTranslation;
  description: PFTranslation;
  category: PFPropertyCategory;
  type: PFPropertyType;
  offeringType: PFOfferingType;
  price: PFPrice;
  size: number;
  location: { id: number };
}

export interface PFLead {
  id: string;
  entityType: 'listing' | 'company' | 'agent' | 'project' | 'developer';
  channel: 'whatsapp' | 'email' | 'call';
  status: 'sent' | 'delivered' | 'read' | 'replied';
  sender: {
    name?: string;
    contacts: Array<{ type: 'email' | 'phone'; value: string }>;
  };
  listing?: {
    id: string;
    reference: string;
  };
  publicProfile?: {
    id: number;
  };
  tags?: string[];
  enrichment?: Record<string, string>;
  createdAt: string;
}

export interface PFPagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface PFAuthToken {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface PFUser {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: 'active' | 'inactive';
  publicProfile?: {
    id: number;
    name?: string;
  };
}

/**
 * Egypt-Specific Validation Rules
 */
export interface EgyptComplianceRules {
  permitRequired: boolean; // Currently false for EG in many PF setups, but can change
  allowedCategories: PFPropertyCategory[];
  requiredImagesMin: number;
  titleLengthMin: number;
  descriptionLengthMin: number;
}
