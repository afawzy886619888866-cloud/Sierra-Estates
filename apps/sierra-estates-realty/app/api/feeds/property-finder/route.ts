import { NextResponse } from 'next/server';

export async function GET() {
  // In a real app, you would query the database for approved listings here
  const properties = [
    {
      id: 'PF-001',
      reference: 'SB-001',
      title: 'Skyline Penthouse A',
      description: 'A luxurious penthouse overlooking Downtown Hubtown.',
      price: 820000,
      bedrooms: 4,
      bathrooms: 4.5,
      size: 4500,
      property_type: 'Penthouse',
      location: 'Downtown Hubtown',
      city: 'Hubtown',
      agent: {
        name: 'Sierra Agent',
        email: 'agent@sierraestates.com',
        phone: '+1234567890'
      },
      images: ['https://example.com/image1.jpg']
    }
  ];

  // Generate standard Property Finder XML format
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<list>\n`;

  properties.forEach(p => {
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
    p.images.forEach(img => {
      xml += `      <url>${img}</url>\n`;
    });
    xml += `    </photo>\n`;
    xml += `  </property>\n`;
  });

  xml += `</list>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml'
    }
  });
}
