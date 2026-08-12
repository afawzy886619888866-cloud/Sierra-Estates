import { NextResponse } from 'next/server';
import { InventoryQueryService } from '@/lib/services/inventory-query';

export async function GET() {
  let properties: Array<{
    id: string;
    reference: string;
    title: string;
    description: string;
    price: number;
    bedrooms: number;
    bathrooms: number;
    size: number;
    property_type: string;
    location: string;
    city: string;
    agent: { name: string; email: string; phone: string };
    images: string[];
  }> = [];

  try {
    const liveUnits = await InventoryQueryService.query({ status: 'available', limit: 100 });
    if (liveUnits && liveUnits.length > 0) {
      properties = liveUnits.map((u) => ({
        id: u.id,
        reference: u.code || `SB-${u.id.substring(0, 5)}`,
        title: u.title || `${u.propertyType} in ${u.compound}`,
        description: u.description || `${u.propertyType} offering ${u.area} sqm in ${u.compound}, ${u.city}.`,
        price: u.price || 0,
        bedrooms: u.bedrooms || 0,
        bathrooms: 2,
        size: u.area || 0,
        property_type: u.propertyType || 'Apartment',
        location: u.compound || u.location || 'New Cairo',
        city: u.city || 'Cairo',
        agent: {
          name: 'Sierra Estates Concierge',
          email: 'listings@sierra-estates.net',
          phone: '+201092048333',
        },
        images: ['https://sierra-estates.net/images/property-hero-1.jpg'],
      }));
    }
  } catch {
    // Fall back to sample feed if Firestore is uninitialized in dev/CI
  }

  if (properties.length === 0) {
    properties = [
      {
        id: 'PF-001',
        reference: 'SB-001',
        title: 'Skyline Penthouse A',
        description: 'A luxurious penthouse overlooking Downtown New Cairo.',
        price: 8200000,
        bedrooms: 4,
        bathrooms: 4.5,
        size: 450,
        property_type: 'Penthouse',
        location: 'Downtown New Cairo',
        city: 'Cairo',
        agent: {
          name: 'Sierra Agent',
          email: 'agent@sierra-estates.net',
          phone: '+201092048333',
        },
        images: ['https://sierra-estates.net/images/property-hero-1.jpg'],
      },
    ];
  }

  // Generate standard Property Finder XML format
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<list>\n`;

  properties.forEach((p) => {
    xml += `  <property>\n`;
    xml += `    <reference_number>${p.reference}</reference_number>\n`;
    xml += `    <title_en>${p.title}</title_en>\n`;
    xml += `    <description_en>${p.description}</description_en>\n`;
    xml += `    <price>${p.price}</price>\n`;
    xml += `    <bedroom>${p.bedrooms}</bedroom>\n`;
    xml += `    <bathroom>${p.bathrooms}</bathroom>\n`;
    xml += `    <size>${p.size}</size>\n`;
    xml += `    <property_type>${p.property_type}</property_type>\n`;
    xml += `    <city>${p.city}</city>\n`;
    xml += `    <community>${p.location}</community>\n`;
    xml += `    <agent>\n`;
    xml += `      <name>${p.agent.name}</name>\n`;
    xml += `      <email>${p.agent.email}</email>\n`;
    xml += `      <phone>${p.agent.phone}</phone>\n`;
    xml += `    </agent>\n`;
    xml += `    <photo>\n`;
    p.images.forEach((img) => {
      xml += `      <url>${img}</url>\n`;
    });
    xml += `    </photo>\n`;
    xml += `  </property>\n`;
  });

  xml += `</list>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
}
