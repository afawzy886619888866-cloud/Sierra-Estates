import { supabase } from '../supabaseClient';

export interface Property {
  id: string;
  sbrCode: string;
  compound: string;
  name: string;
  specs: string;
  price: string;
  imageUrl: string;
  type: 'Rent' | 'Resale';
  tags: string[];
}

/**
 * Fetches properties from Supabase / Database filtered by type (Rent or Resale)
 */
export async function fetchPropertiesFromDB(typeFilter: 'Rent' | 'Resale'): Promise<Property[]> {
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
        return data.map((item: any) => ({
          id: item.id || item.ref_id,
          sbrCode: item.ref_id || `SBR-${item.id?.substring(0, 6)}`,
          compound: item.compound || 'New Cairo',
          name: item.title || `${item.property_type} in ${item.compound}`,
          specs: `BUA: ${item.area_sqm}m² | ${item.bedrooms} Beds | ${item.bathrooms} Baths`,
          price: `${Number(item.price).toLocaleString()} EGP`,
          imageUrl: (item.images && item.images[0]) || "https://static.shared.propertyfinder.eg/media/images/listing/01JMGA94NXVF25Q8R6VYVRV0Z4/01282d44-c0b4-4993-9f36-0b9eb682059d.png",
          type: item.deal_type === 'rent' ? 'Rent' : 'Resale',
          tags: item.amenities?.length ? item.amenities : [item.finishing_type || "Luxury Finishing", item.property_type || "Standalone"],
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
      type: "Rent" as const,
      imageUrl: "https://static.shared.propertyfinder.eg/media/images/listing/01JNT5G6WQ0X89RGT5KH5THTH9/d9b34e3b-ed1e-11ef-9c46-0a0bf5daed27-3f96b588-a9eb-47b8-9cbc-adb1ac5ebb78.png",
      tags: ["Standalone", "Fully Finished"]
    },
    {
      id: "UPT-S2",
      sbrCode: "UPT-4S-120M",
      name: "Celesta Golf Mansion",
      compound: "Uptown Cairo",
      specs: "BUA: 472m² | Land: 800m²",
      price: "35,000,000 EGP",
      type: "Resale" as const,
      imageUrl: "https://static.shared.propertyfinder.eg/media/images/listing/01JMGA94NXVF25Q8R6VYVRV0Z4/01282d44-c0b4-4993-9f36-0b9eb682059d.png",
      tags: ["Golf View", "Ready to Move"]
    },
    {
      id: "PLM-V3",
      sbrCode: "PLM-5S-45M",
      name: "The Palm Haven",
      compound: "Palm Hills New Cairo",
      specs: "BUA: 420m² | Land: 700m²",
      price: "45,000,000 EGP",
      type: "Resale" as const,
      imageUrl: "https://static.shared.propertyfinder.eg/media/images/listing/01JNT5G6WQ0X89RGT5KH5THTH9/d9b34e3b-ed1e-11ef-9c46-0a0bf5daed27-3f96b588-a9eb-47b8-9cbc-adb1ac5ebb78.png",
      tags: ["Prime Location", "Private Pool"]
    }
  ] satisfies Property[]).filter(item => item.type === typeFilter);
}
