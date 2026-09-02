 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { supabase } from '../../../../lib/supabase';













/**
 * Fetches properties from Supabase / Database filtered by type (Rent or Resale)
 */
export async function fetchPropertiesFromDB(typeFilter) {
  try {
    const dealType = typeFilter.toLowerCase() === 'rent' ? 'rent' : 'sale';
    
    // Check if Supabase URL is configured
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('deal_type', dealType)
        .eq('status', 'active')
        .limit(50);

      if (!error && data && data.length > 0) {
        return data.map((item) => ({
          id: item.id || item.ref_id,
          sbrCode: item.ref_id || `SBR-${_optionalChain([item, 'access', _ => _.id, 'optionalAccess', _2 => _2.substring, 'call', _3 => _3(0, 6)])}`,
          compound: item.compound || 'New Cairo',
          name: item.title || `${item.property_type} in ${item.compound}`,
          specs: `BUA: ${item.area_sqm}m² | ${item.bedrooms} Beds | ${item.bathrooms} Baths`,
          price: `${Number(item.price).toLocaleString()} EGP`,
          imageUrl: (item.images && item.images[0]) || "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=1200&auto=format&fit=crop",
          type: item.deal_type === 'rent' ? 'Rent' : 'Resale',
          tags: _optionalChain([item, 'access', _4 => _4.amenities, 'optionalAccess', _5 => _5.length]) ? item.amenities : [item.finishing_type || "Luxury Finishing", item.property_type || "Standalone"],
        }));
      }
    }
  } catch (error) {
    console.warn("Supabase fetching fallback:", error);
  }

  // Fallback Mock data matching New Cairo Context if database is empty during init
  return ([
    {
      id: "MVD-V1",
      sbrCode: "MVD-3F-75K",
      name: "Azure Heights Estate",
      compound: "Mivida",
      specs: "BUA: 350m² | Land: 650m²",
      price: "75,000 EGP",
      type: "Rent" ,
      imageUrl: "https://images.unsplash.com/photo-1613490908578-812e52bb1667?q=80&w=1200&auto=format&fit=crop",
      tags: ["Standalone", "Fully Finished"]
    },
    {
      id: "UPT-S2",
      sbrCode: "UPT-4S-120M",
      name: "Celesta Golf Mansion",
      compound: "Uptown Cairo",
      specs: "BUA: 472m² | Land: 800m²",
      price: "35,000,000 EGP",
      type: "Resale" ,
      imageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=1200&auto=format&fit=crop",
      tags: ["Golf View", "Ready to Move"]
    },
    {
      id: "PLM-V3",
      sbrCode: "PLM-5S-45M",
      name: "The Palm Haven",
      compound: "Palm Hills New Cairo",
      specs: "BUA: 420m² | Land: 700m²",
      price: "45,000,000 EGP",
      type: "Resale" ,
      imageUrl: "https://images.unsplash.com/photo-1613490908578-812e52bb1667?q=80&w=1200&auto=format&fit=crop",
      tags: ["Prime Location", "Private Pool"]
    }
  ] ).filter(item => item.type === typeFilter);
}
