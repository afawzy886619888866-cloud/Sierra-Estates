import { PFListingRequest, PFPropertyCategory, PFPropertyType, PFAmenity } from './types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class EgyptListingValidator {
  /**
   * Allowed Property Types for Egypt by Category
   */
  private static readonly ALLOWED_TYPES: Record<PFPropertyCategory, PFPropertyType[]> = {
    commercial: [
      'farm', 'land', 'bulk-rent-unit', 'bulk-sale-unit', 'cafeteria', 'clinic',
      'co-working-space', 'factory', 'hotel-apartment', 'medical-facility',
      'office-space', 'restaurant', 'retail', 'shop', 'show-room',
      'staff-accommodation', 'villa', 'warehouse', 'whole-building'
    ],
    residential: [
      'land', 'apartment', 'bulk-rent-unit', 'bulk-sale-unit', 'bungalow',
      'cabin', 'chalet', 'duplex', 'hotel-apartment', 'villa', 'palace',
      'penthouse', 'roof', 'townhouse', 'twin-house', 'whole-building'
    ]
  };

  /**
   * Allowed Amenities for Egypt by Category
   */
  private static readonly ALLOWED_AMENITIES: Record<PFPropertyCategory, PFAmenity[]> = {
    commercial: [
      'shared-gym', 'covered-parking', 'networked', 'dining-in-building',
      'conference-room', 'lobby-in-building'
    ],
    residential: [
      'central-ac', 'built-in-wardrobes', 'kitchen-appliances', 'security',
      'balcony', 'shared-gym', 'shared-spa', 'covered-parking', 'maids-room',
      'study', 'shared-pool', 'childrens-pool', 'private-garden', 'private-pool',
      'view-of-water', 'view-of-landmark', 'walk-in-closet', 'lobby-in-building'
    ]
  };

  /**
   * Validates a listing request specifically for the Egypt market.
   */
  public static validate(request: PFListingRequest): ValidationResult {
    const errors: string[] = [];

    // 1. Basic Required Fields
    if (!request.reference) errors.push('Reference is required.');
    if (!request.category) errors.push('Category is required (residential or commercial).');
    if (!request.type) errors.push('Property Type is required.');
    if (!request.offeringType) errors.push('Offering Type is required (sale or rent).');
    if (!request.location?.id) errors.push('Location ID is required.');
    if (!request.size || request.size <= 0) errors.push('Valid size in sqft is required.');

    // 2. Title and Description (English is mandatory)
    if (!request.title?.en || request.title.en.length < 10) {
      errors.push('English title is required and must be at least 10 characters.');
    }
    if (!request.description?.en || request.description.en.length < 30) {
      errors.push('English description is required and must be at least 30 characters.');
    }

    // 3. Category/Type Compatibility
    if (request.category && request.type) {
      const allowedTypes = this.ALLOWED_TYPES[request.category];
      if (allowedTypes && !allowedTypes.includes(request.type)) {
        errors.push(`Property type "${request.type}" is not allowed for category "${request.category}" in Egypt.`);
      }
    }

    // 4. Amenities Compatibility
    if (request.category && request.amenities && request.amenities.length > 0) {
      const allowedAmenities = this.ALLOWED_AMENITIES[request.category];
      if (request.type === 'land') {
        errors.push('Amenities are not allowed for "land" property type.');
      } else if (allowedAmenities) {
        const invalidAmenities = request.amenities.filter(a => !allowedAmenities.includes(a));
        if (invalidAmenities.length > 0) {
          errors.push(`The following amenities are not allowed for ${request.category} listings in Egypt: ${invalidAmenities.join(', ')}`);
        }
      }
    }

    // 5. Media Requirements
    if (!request.media?.images || request.media.images.length === 0) {
      errors.push('At least one image is required.');
    } else {
      const hasValidImage = request.media.images.some(img => img.original?.url);
      if (!hasValidImage) {
        errors.push('At least one image must have a valid original URL.');
      }
    }

    // 6. Price Validation
    if (!request.price) {
      errors.push('Price information is required.');
    } else {
      const amount = request.price.amounts[request.price.type as keyof typeof request.price.amounts];
      if (!amount || amount <= 0) {
        errors.push(`Price amount for type "${request.price.type}" must be greater than 0.`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
