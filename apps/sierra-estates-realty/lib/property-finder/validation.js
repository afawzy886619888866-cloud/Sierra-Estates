 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }






export class EgyptListingValidator {
  /**
   * Allowed Property Types for Egypt by Category
   */
   static  __initStatic() {this.ALLOWED_TYPES = {
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
  }}

  /**
   * Allowed Amenities for Egypt by Category
   */
   static  __initStatic2() {this.ALLOWED_AMENITIES = {
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
  }}

  /**
   * Validates a listing request specifically for the Egypt market.
   */
   static validate(request) {
    const errors = [];

    // 1. Basic Required Fields
    if (!request.reference) errors.push('Reference is required.');
    if (!request.category) errors.push('Category is required (residential or commercial).');
    if (!request.type) errors.push('Property Type is required.');
    if (!request.offeringType) errors.push('Offering Type is required (sale or rent).');
    if (!_optionalChain([request, 'access', _ => _.location, 'optionalAccess', _2 => _2.id])) errors.push('Location ID is required.');
    if (!request.size || request.size <= 0) errors.push('Valid size in sqft is required.');

    // 2. Title and Description (English is mandatory)
    if (!_optionalChain([request, 'access', _3 => _3.title, 'optionalAccess', _4 => _4.en]) || request.title.en.length < 10) {
      errors.push('English title is required and must be at least 10 characters.');
    }
    if (!_optionalChain([request, 'access', _5 => _5.description, 'optionalAccess', _6 => _6.en]) || request.description.en.length < 30) {
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
    if (!_optionalChain([request, 'access', _7 => _7.media, 'optionalAccess', _8 => _8.images]) || request.media.images.length === 0) {
      errors.push('At least one image is required.');
    } else {
      const hasValidImage = request.media.images.some(img => _optionalChain([img, 'access', _9 => _9.original, 'optionalAccess', _10 => _10.url]));
      if (!hasValidImage) {
        errors.push('At least one image must have a valid original URL.');
      }
    }

    // 6. Price Validation
    if (!request.price) {
      errors.push('Price information is required.');
    } else {
      const amount = request.price.amounts[request.price.type ];
      if (!amount || amount <= 0) {
        errors.push(`Price amount for type "${request.price.type}" must be greater than 0.`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
} EgyptListingValidator.__initStatic(); EgyptListingValidator.__initStatic2();
