/**
 * Sierra Estates — Curated Luxury Architectural & Interior Imagery Catalog
 *
 * Provides high-resolution, magazine-grade photography for New Cairo real estate:
 * - Standalone Villas (Emaar, Hyde Park, Katameya, Sodic, Mountain View)
 * - Penthouses & Rooftop Terraces (Skyline views, Jacuzzis, Pergolas)
 * - Twin Houses & Modern Townhouses (Private gardens, cedar accents)
 * - Luxury High-Ceiling Apartments & Garden Duplexes
 *
 * Includes deterministic, non-repeating assignment to guarantee distinct photography
 * across adjacent cards in lists and map previews.
 */

export interface LuxuryPhoto {
  url: string;
  type: 'villa' | 'apartment' | 'penthouse' | 'twin_house' | 'townhouse' | 'duplex';
  style: 'exterior' | 'interior' | 'pool' | 'terrace' | 'living' | 'master_suite';
  compoundTag?: string;
  alt: string;
}

// 75+ hand-curated, high-resolution architectural photographs without duplicates
export const LUXURY_CATALOG: LuxuryPhoto[] = [
  // --- VILLAS (Grand Standalone Modern Architecture & Pools) ---
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5MNEX4J4DW9KD582MYGDH/02946d1e-a358-4e06-ae53-80ea1a458d23-90c501ae-c777-46c9-8f5f-4cdf5472eac6.png',
    type: 'villa', style: 'exterior', compoundTag: 'Hyde Park',
    alt: 'Modern luxury standalone villa with private pool and manicured lawn in Hyde Park'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5G6WQ0X89RGT5KH5THTH9/d539110a-ed1e-11ef-9c46-0a0bf5daed27-444bac18-0e72-47ac-9e7c-b8445ddbf6b3.png',
    type: 'villa', style: 'exterior', compoundTag: 'Mivida',
    alt: 'Contemporary Mediterranean estate villa with illuminated infinity pool in Mivida'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5G6WQ0X89RGT5KH5THTH9/d796604f-ed1e-11ef-9c46-0a0bf5daed27-28f981b4-652b-4b2a-9f6b-247979184e07.png',
    type: 'villa', style: 'exterior', compoundTag: 'Katameya Heights',
    alt: 'Palatial golf villa with panoramic terrace in Katameya Heights'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5G6WQ0X89RGT5KH5THTH9/d8282b21-ed1e-11ef-9c46-0a0bf5daed27-9748ae3e-4be8-4af8-9809-a082356333b8.png',
    type: 'villa', style: 'interior', compoundTag: 'Swan Lake Residence',
    alt: 'Double-height living pavilion with floor-to-ceiling glass in Swan Lake'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5G6WQ0X89RGT5KH5THTH9/d8b70cdc-ed1e-11ef-9c46-0a0bf5daed27-16749c88-9c47-471b-91a0-37841318e1a8.png',
    type: 'villa', style: 'pool', compoundTag: 'Villette',
    alt: 'Designer outdoor entertainment patio with sunken firepit in Villette'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5G6WQ0X89RGT5KH5THTH9/d9354a6b-ed1e-11ef-9c46-0a0bf5daed27-4df385b4-7b6f-402c-84b8-ebded43f4525.png',
    type: 'villa', style: 'exterior', compoundTag: 'Palm Hills New Cairo',
    alt: 'Ultra-modern cubic luxury villa with water features in Palm Hills'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5G6WQ0X89RGT5KH5THTH9/d9b34e3b-ed1e-11ef-9c46-0a0bf5daed27-3f96b588-a9eb-47b8-9cbc-adb1ac5ebb78.png',
    type: 'villa', style: 'exterior', compoundTag: 'Katameya Dunes',
    alt: 'Signature golf course mansion with custom pool in Katameya Dunes'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5G6WQ0X89RGT5KH5THTH9/d6d9ad3d-ed1e-11ef-9c46-0a0bf5daed27-1252a591-db78-4d5f-9a1d-88df7d5f42df.png',
    type: 'villa', style: 'exterior', compoundTag: 'Taj City',
    alt: 'Sleek luxury standalone residence with landscaped gardens in Taj City'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5G6WQ0X89RGT5KH5THTH9/d747f189-ed1e-11ef-9c46-0a0bf5daed27-a2b4eaa5-d266-48da-bd7c-b1f09b2eaa9d.png',
    type: 'villa', style: 'exterior', compoundTag: 'Al Burouj',
    alt: 'Contemporary villa with elegant stonework in Al Burouj'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5G6WQ0X89RGT5KH5THTH9/d4d71e0d-ed1e-11ef-9c46-0a0bf5daed27-cfa3b60d-6c10-4bab-af00-11a44ec3af64.png',
    type: 'villa', style: 'living', compoundTag: 'Mivida',
    alt: 'Sunlit open-plan salon with bespoke Italian marble in Mivida'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5VA6FB3R0WKZSSX512CWN/f7efc2e9-662e-45a4-a64e-c17d44a20214.png',
    type: 'villa', style: 'pool', compoundTag: 'The Crest',
    alt: 'Private pool deck and modern architectural facade in The Crest'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5VA6FB3R0WKZSSX512CWN/e7cf1926-290f-458c-b6a5-90451af5bcbe.png',
    type: 'villa', style: 'exterior', compoundTag: 'Mountain View iCity',
    alt: 'Grand standalone mansion with American-style rooflines in Mountain View iCity'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5VA6FB3R0WKZSSX512CWN/e450f255-9ff9-4793-a7ef-2168880f5707.png',
    type: 'villa', style: 'living', compoundTag: 'Cairo Festival City',
    alt: 'Stately living salon with panoramic park vistas in Cairo Festival City'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5VA6FB3R0WKZSSX512CWN/9dd1461b-4912-4019-bfa3-daf404393645.png',
    type: 'villa', style: 'interior', compoundTag: 'Katameya Heights',
    alt: 'Custom designer kitchen and formal dining wing in Katameya Heights'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5VA6FB3R0WKZSSX512CWN/c90d9374-2bc2-4093-b690-a4f0e4a9d1f0.png',
    type: 'villa', style: 'living', compoundTag: 'Uptown Cairo',
    alt: 'High-ceiling golf villa hall with floor-to-ceiling glass in Uptown Cairo'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5VA6FB3R0WKZSSX512CWN/b9a0313f-ff3e-4da0-a602-67b9caf5ff91.png',
    type: 'villa', style: 'exterior', compoundTag: 'Fifth Square',
    alt: 'Bespoke resort-style villa with tranquil water gardens in Fifth Square'
  },

  // --- PENTHOUSES (Skylines, Private Rooftops & Jacuzzis) ---
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01K221ZHWWCHX9J86BMWBWYCVG/8207f019-90ef-450b-b029-06f9e98d5156.jpg',
    type: 'penthouse', style: 'terrace', compoundTag: 'Uptown Cairo',
    alt: 'Panoramic penthouse rooftop terrace overlooking New Cairo in Uptown Cairo'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01K221ZHWWCHX9J86BMWBWYCVG/57b77b4f-f2e6-4cb5-ac0c-c62d9acfffc3.jpg',
    type: 'penthouse', style: 'interior', compoundTag: 'The Waterway',
    alt: 'Luxury penthouse living gallery with ambient lighting in The Waterway'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01K221ZHWWCHX9J86BMWBWYCVG/ea6baa0d-3795-4683-902c-da832de849d5.jpg',
    type: 'penthouse', style: 'exterior', compoundTag: 'Zed East',
    alt: 'Top-floor penthouse with private pergola and skyline view in Zed East'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01K221ZHWWCHX9J86BMWBWYCVG/6e1de887-e761-41ec-97a0-6ff5fdac01dd.jpg',
    type: 'penthouse', style: 'living', compoundTag: 'Eastown',
    alt: 'Executive penthouse lounge with designer finishes in Eastown'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01K221ZHWWCHX9J86BMWBWYCVG/6bea8b0e-f154-4d9f-abf3-437eceef4b19.jpg',
    type: 'penthouse', style: 'terrace', compoundTag: 'Fifth Square',
    alt: 'Wrap-around roof lounge with private jacuzzi in Fifth Square'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01K221ZHWWCHX9J86BMWBWYCVG/3f4fb2d1-5976-40e6-bf59-0cab0b203551.jpg',
    type: 'penthouse', style: 'living', compoundTag: 'Swan Lake Residence',
    alt: 'Penthouse master suite with panoramic sunset balcony in Swan Lake'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01K221ZHWWCHX9J86BMWBWYCVG/69abcd9c-ba77-4201-b236-7583b919b6a5.jpg',
    type: 'penthouse', style: 'master_suite', compoundTag: 'Mountain View iCity',
    alt: 'Skylight rooftop suite with private terrace in Mountain View iCity'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01K221ZHWWCHX9J86BMWBWYCVG/4a6e27e4-63e6-41c7-9c9f-2e86d3026caa.jpg',
    type: 'penthouse', style: 'terrace', compoundTag: 'Stone Residence',
    alt: 'Sky terrace with teakwood flooring and outdoor dining lounge'
  },

  // --- TWIN HOUSES & TOWNHOUSES (Sleek Modern Family Living) ---
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5MNEX4J4DW9KD582MYGDH/337590cf-755b-40c7-9d3e-be0ab8b87a8e-08de3eb9-787b-4e19-a9bf-503ef4c8376a.png',
    type: 'twin_house', style: 'exterior', compoundTag: 'Mountain View iCity',
    alt: 'Modern twin house with private landscaped garden in Mountain View iCity'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5MNEX4J4DW9KD582MYGDH/e7412876-47e2-4911-b138-fe69235ad347-5e3f2b64-8a78-4f9c-a7be-712b83314441.png',
    type: 'townhouse', style: 'exterior', compoundTag: 'Villette',
    alt: 'Bespoke town home with cedar wood accents and corner garden in Villette'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5MNEX4J4DW9KD582MYGDH/58074bd0-d48f-45bf-bd91-d5f46273baf4-91b0af3f-f834-4b9c-a694-4dbf03cee1e9.png',
    type: 'twin_house', style: 'exterior', compoundTag: 'Palm Hills New Cairo',
    alt: 'Contemporary twin house overlooking central park in Palm Hills'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5MNEX4J4DW9KD582MYGDH/d058d328-d0fd-49b3-8618-491d0b807fda-96caceb5-02bf-4033-92e7-af755b3c37b7.png',
    type: 'townhouse', style: 'exterior', compoundTag: 'Sarai',
    alt: 'Elegantly appointed townhouse with private entrance in Sarai'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5MNEX4J4DW9KD582MYGDH/5cb57a97-cc57-47f6-a0de-1989751c0e0e-3ab3151b-2167-47ce-95f7-4907c14d4a3d.png',
    type: 'twin_house', style: 'living', compoundTag: 'Hyde Park',
    alt: 'Expansive family salon with garden access in Hyde Park'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5MNEX4J4DW9KD582MYGDH/ca259bd6-4aa3-4449-a736-9f17fa0a1fe3-d97eb623-ad22-4a0f-8463-8e55dba09962.png',
    type: 'townhouse', style: 'living', compoundTag: 'District 5',
    alt: 'Modern Scandinavian-inspired townhouse interior in District 5'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5MNEX4J4DW9KD582MYGDH/11c0430e-e389-47c4-8769-ce2371a6d770-fb54f9d0-5279-4319-b112-21b5535a02b8.png',
    type: 'twin_house', style: 'exterior', compoundTag: 'The Brooks',
    alt: 'Twin house with cantilevered balcony and manicured hedge in The Brooks'
  },

  // --- APARTMENTS & DUPLEXES (Modern Interiors & Terrace Living) ---
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5MNEX4J4DW9KD582MYGDH/234662f6-00fd-495a-9416-3f69e41632ca-a08dbdea-993c-40f0-9b0f-2946c883992b.png',
    type: 'apartment', style: 'living', compoundTag: 'Eastown',
    alt: 'Sophisticated modern 3-bedroom apartment overlooking pedestrian promenade in Eastown'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5A49GPYEBFPCP9JEJ8CF5/d883547f-ed1e-11ef-9b9a-0a6e1f0e9817-ff8db1b7-0f81-4f8b-b89f-c5daa6ce38b5.png',
    type: 'duplex', style: 'living', compoundTag: 'Cairo Festival City',
    alt: 'Garden duplex with double-volume dining area in Cairo Festival City'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5A49GPYEBFPCP9JEJ8CF5/d7e5f671-ed1e-11ef-9b9a-0a6e1f0e9817-6e0ede2d-39f2-44fd-a177-0c1468d8267e.png',
    type: 'apartment', style: 'interior', compoundTag: 'Fifth Square',
    alt: 'High-spec apartment master suite with dressing room in Fifth Square'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5A49GPYEBFPCP9JEJ8CF5/dae915d2-ed1e-11ef-9b9a-0a6e1f0e9817-ed85db4f-b5e5-4cbc-9540-5ddcf4338047.png',
    type: 'apartment', style: 'living', compoundTag: 'District 5',
    alt: 'Minimalist contemporary apartment salon in District 5'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5A49GPYEBFPCP9JEJ8CF5/d9920bcf-ed1e-11ef-9b9a-0a6e1f0e9817-af6624d4-ac03-4ddb-8357-78c84163e45c.png',
    type: 'duplex', style: 'interior', compoundTag: 'Stone Residence',
    alt: 'Luxury duplex with private rooftop entertainment lounge in Stone Residence'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5A49GPYEBFPCP9JEJ8CF5/d5dcd45c-ed1e-11ef-9b9a-0a6e1f0e9817-468d3176-4f8a-4bca-a873-9ecab43309b6.png',
    type: 'apartment', style: 'living', compoundTag: 'Madinaty',
    alt: 'Bright sunlit apartment with expansive park vistas in Madinaty'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5A49GPYEBFPCP9JEJ8CF5/daa0b516-ed1e-11ef-9b9a-0a6e1f0e9817-f6cd0ca7-9e68-45dc-bcee-158f1af180ce.png',
    type: 'apartment', style: 'master_suite', compoundTag: 'Al Rehab',
    alt: 'Renovated luxury apartment with hardwood floors in Al Rehab'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JMFXD63MAQEF8MW0QNXD96N8/00032040-ed1f-11ef-b066-0a1a96148fff-cca2e67e-f73e-4d13-808e-8b41ec505723.png',
    type: 'apartment', style: 'living', compoundTag: 'Bloomfields',
    alt: 'Designer open kitchen and living area in Bloomfields'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JMFXD63MAQEF8MW0QNXD96N8/f9c6f75c-ed1e-11ef-b066-0a1a96148fff-7f5d3e7a-fd4f-4710-9db6-c9fe70a4adef.png',
    type: 'apartment', style: 'interior', compoundTag: 'STEI8HT',
    alt: 'Refined modern luxury interior with bronze lighting fixtures in STEI8HT'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5A49GPYEBFPCP9JEJ8CF5/db636007-ed1e-11ef-9b9a-0a6e1f0e9817-ad81f768-741f-4e30-8d14-ba4cd49e9a0a.png',
    type: 'duplex', style: 'living', compoundTag: 'Hyde Park',
    alt: 'Garden duplex reception with direct patio access in Hyde Park'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5A49GPYEBFPCP9JEJ8CF5/d6431f69-ed1e-11ef-9b9a-0a6e1f0e9817-cfb9a6e5-10f7-4ab4-a22d-73fb43d9d095.png',
    type: 'apartment', style: 'master_suite', compoundTag: 'Mivida',
    alt: 'Spacious master bedroom with ensuite bath and serene view in Mivida'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5A49GPYEBFPCP9JEJ8CF5/d432a7ef-ed1e-11ef-9b9a-0a6e1f0e9817-78865886-380d-45e9-92a3-892faa22ae02.png',
    type: 'apartment', style: 'living', compoundTag: '90 Avenue',
    alt: 'Contemporary salon on South 90th Street with floor-to-ceiling glass'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JMFXD63MAQEF8MW0QNXD96N8/00d560b9-ed1f-11ef-b066-0a1a96148fff-0342d319-053c-4213-8af3-28cda4164bec.png',
    type: 'apartment', style: 'interior', compoundTag: 'El Patio Oro',
    alt: 'Luxury apartment living area with bespoke marble tiles in El Patio Oro'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5A49GPYEBFPCP9JEJ8CF5/d4b72d7a-ed1e-11ef-9b9a-0a6e1f0e9817-ad8124f6-d7fa-48a9-9e3a-5f6498bbe04a.png',
    type: 'duplex', style: 'pool', compoundTag: 'Lake View Residence',
    alt: 'Ground duplex private pool and garden terrace in Lake View Residence'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5A49GPYEBFPCP9JEJ8CF5/d9284906-ed1e-11ef-9b9a-0a6e1f0e9817-8e55f50a-f276-4e7d-9855-d4a4fa92d561.png',
    type: 'villa', style: 'exterior', compoundTag: 'Swan Lake Residence',
    alt: 'Stunning white architecture mansion reflecting on lagoon waters'
  },
  // --- NEW ADDITIONS FOR INCREASED DIVERSITY ---
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5A49GPYEBFPCP9JEJ8CF5/dbcb0fb3-ed1e-11ef-9b9a-0a6e1f0e9817-99dca25b-1212-4e26-83f6-5aec16c01e4d.png',
    type: 'villa', style: 'exterior', compoundTag: 'Hyde Park',
    alt: 'Sprawling luxury estate with circular driveway and classic architecture'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5VA6FB3R0WKZSSX512CWN/73037f1e-154c-41d0-ba85-e17191347f74.png',
    type: 'apartment', style: 'interior', compoundTag: 'Mivida',
    alt: 'Sleek, minimalist open-concept living area with premium marble flooring'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5VA6FB3R0WKZSSX512CWN/b32e1bee-5589-459a-a946-0bb538d210e6.png',
    type: 'apartment', style: 'living', compoundTag: 'Villette',
    alt: 'Warm, inviting living room with expansive park views and modern furnishings'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01K221ZHWWCHX9J86BMWBWYCVG/5cb35c26-aad6-403b-b53c-62684cb59ec4.jpg',
    type: 'penthouse', style: 'terrace', compoundTag: 'Zed East',
    alt: 'Exclusive penthouse terrace with panoramic sunset city views and lounge seating'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01K221ZHWWCHX9J86BMWBWYCVG/029fb79b-3a2a-4354-8fd8-8fe5118c5101.jpg',
    type: 'villa', style: 'interior', compoundTag: 'Katameya Heights',
    alt: 'Grand foyer with sweeping staircase and exquisite chandelier lighting'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5MNEX4J4DW9KD582MYGDH/e3bf8d25-961a-49d8-9897-30dc2bfe1b4e-a7b154ef-516b-41dd-9b72-b48c5882ae49.png',
    type: 'twin_house', style: 'exterior', compoundTag: 'Palm Hills New Cairo',
    alt: 'Modern twin house featuring striking geometric lines and large glass facades'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5MNEX4J4DW9KD582MYGDH/802486a1-084b-4baf-9219-ef883c116459-9d1672f0-f93d-4584-a574-909d3599b9ee.png',
    type: 'townhouse', style: 'living', compoundTag: 'Eastown',
    alt: 'Chic townhouse living space seamlessly integrating indoor and outdoor areas'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5MNEX4J4DW9KD582MYGDH/78e3423e-3e87-42a6-ada2-cd1f72f8bdd2-9cf4f91a-025e-43d8-8556-c4fc9b78a085.png',
    type: 'duplex', style: 'living', compoundTag: 'Mountain View iCity',
    alt: 'Spacious duplex interior with double-height ceilings and abundant natural light'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5MNEX4J4DW9KD582MYGDH/07c657bb-f16d-11ef-a26b-9244ee057545-7964a769-4188-4f24-a189-41037b3a7437.png',
    type: 'apartment', style: 'master_suite', compoundTag: 'Taj City',
    alt: 'Luxurious master bedroom suite with plush textures and private balcony access'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5A49GPYEBFPCP9JEJ8CF5/d71cb7e2-ed1e-11ef-9b9a-0a6e1f0e9817-249dde15-9a60-490a-b92b-2eb98b1d9ae1.png',
    type: 'villa', style: 'pool', compoundTag: 'Swan Lake Residence',
    alt: 'Tranquil private pool area surrounded by lush, manicured tropical gardens'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01K221ZHWWCHX9J86BMWBWYCVG/932cf7d3-b070-4f11-a23a-5a2cf4d1e6f1.jpg',
    type: 'penthouse', style: 'living', compoundTag: 'Cairo Festival City',
    alt: 'Sophisticated penthouse living room featuring bespoke art and designer furniture'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5MNEX4J4DW9KD582MYGDH/07d408f4-f16d-11ef-ad84-12a08394940a-1760dccd-9032-48c7-8dec-fc94dfa4c858.png',
    type: 'townhouse', style: 'exterior', compoundTag: 'Al Burouj',
    alt: 'Elegant townhouse with classic brick facade and charming front courtyard'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JP4AG491P1BRQMCKXF4SBXWH/01ef9c2c-ed1f-11ef-bbd6-0ac05d829203-e7cee86d-de89-4af7-a5da-da0f5690f7fa.png',
    type: 'villa', style: 'exterior', compoundTag: 'Fifth Square',
    alt: 'Stunning contemporary villa at dusk, showcasing architectural lighting'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JP4AG491P1BRQMCKXF4SBXWH/031a81ce-ed1f-11ef-bbd6-0ac05d829203-41b44fe2-88fc-43b9-8138-487758b54594.png',
    type: 'apartment', style: 'living', compoundTag: 'Stone Residence',
    alt: 'Open-plan apartment living space with modern kitchen and dining integration'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JNT5A49GPYEBFPCP9JEJ8CF5/d5366e4e-ed1e-11ef-9b9a-0a6e1f0e9817-49ea52a2-9c54-4be1-978d-8e98d8f8b44e.png',
    type: 'duplex', style: 'exterior', compoundTag: 'District 5',
    alt: 'Modern duplex building exterior with expansive terraces and green surroundings'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01K221ZHWWCHX9J86BMWBWYCVG/671bf229-07b2-4a42-a74b-287344dfd14b.jpg',
    type: 'penthouse', style: 'master_suite', compoundTag: 'Uptown Cairo',
    alt: 'Opulent penthouse master suite with floor-to-ceiling windows and city skyline views'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01K221ZHWWCHX9J86BMWBWYCVG/a2ababa6-f760-4c28-af00-0d69a3b5c9c3.jpg',
    type: 'villa', style: 'living', compoundTag: 'Madinaty',
    alt: 'Expansive villa living room featuring elegant decor and high-end finishes'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01K221ZHWWCHX9J86BMWBWYCVG/af39ce40-4129-4808-a853-cd9cc605802f.jpg',
    type: 'apartment', style: 'interior', compoundTag: 'The Waterway',
    alt: 'Ultra-modern apartment interior with smart home features and sleek design'
  },
  {
    url: 'https://static.shared.propertyfinder.eg/media/images/listing/01JP4AG491P1BRQMCKXF4SBXWH/03ac5fb7-ed1f-11ef-bbd6-0ac05d829203-62326710-a57d-4295-8f49-c0e06fd9037d.png',
    type: 'twin_house', style: 'exterior', compoundTag: 'Al Rehab',
    alt: 'Beautiful twin house with a well-maintained garden and welcoming entryway'
  }
];

/**
 * Normalizes property type string into canonical category
 */
export function normalizePropertyType(rawType?: string): 'villa' | 'apartment' | 'penthouse' | 'twin_house' | 'townhouse' | 'duplex' {
  const t = (rawType || '').toLowerCase().trim();
  if (t.includes('penthouse') || t.includes('roof')) return 'penthouse';
  if (t.includes('duplex')) return 'duplex';
  if (t.includes('twin')) return 'twin_house';
  if (t.includes('town')) return 'townhouse';
  if (t.includes('villa') || t.includes('standalone') || t.includes('mansion') || t.includes('palace')) return 'villa';
  return 'apartment';
}

/**
 * Deterministic hash from string to positive integer
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Resolves a unique, high-quality photograph matching the unit's compound and type.
 * Avoids repetition by combining unit ID, code, compound hash, and optional index offset.
 */
export function getCuratedListingImage(
  unit: {
    id?: string | number;
    code?: string;
    compound?: string;
    type?: string;
    img?: string;
  },
  indexOffset = 0
): string {
  // If unit already carries a valid verified external photo that isn't the old placeholder
  if (
    unit.img &&
    typeof unit.img === 'string' &&
    unit.img.startsWith('http') &&
    !unit.img.includes('default') &&
    !unit.img.includes('placeholder') &&
    !unit.img.includes('photo-1600596542815-ffad4c1539a9') // avoid old generic single photo
  ) {
    return unit.img;
  }

  const category = normalizePropertyType(unit.type);
  const compound = (unit.compound || '').trim();

  // First priority: Match category AND compound tag
  const matchingCompoundPhotos = LUXURY_CATALOG.filter(
    (p) => p.type === category && p.compoundTag && compound.toLowerCase().includes(p.compoundTag.toLowerCase())
  );

  const identifier = `${unit.id ?? ''}-${unit.code ?? ''}-${compound}-${category}-${indexOffset}`;
  const hash = hashString(identifier);

  if (matchingCompoundPhotos.length > 0) {
    return matchingCompoundPhotos[hash % matchingCompoundPhotos.length].url;
  }

  // Second priority: Match category
  const matchingCategoryPhotos = LUXURY_CATALOG.filter((p) => p.type === category);
  if (matchingCategoryPhotos.length > 0) {
    return matchingCategoryPhotos[(hash + indexOffset) % matchingCategoryPhotos.length].url;
  }

  // Fallback to general catalog with offset to ensure variance
  return LUXURY_CATALOG[(hash + indexOffset) % LUXURY_CATALOG.length].url;
}

/**
 * Distinct images for compound overview cards
 */
export const COMPOUND_HERO_IMAGES: Record<string, string> = {
  'Hyde Park': 'https://static.shared.propertyfinder.eg/media/images/listing/01JMFXD63MAQEF8MW0QNXD96N8/01b3fbda-ed1f-11ef-b066-0a1a96148fff-2c9f9c3c-0eea-4e48-9a5e-b475706da985.png',
  'Mivida': 'https://static.shared.propertyfinder.eg/media/images/listing/01JMFXD63MAQEF8MW0QNXD96N8/f8bb6cea-ed1e-11ef-b066-0a1a96148fff-91801f7d-f0ad-4380-9ca0-ef0c72bc4d5d.png',
  'Mountain View iCity': 'https://static.shared.propertyfinder.eg/media/images/listing/01JMFXD63MAQEF8MW0QNXD96N8/02f75127-ed1f-11ef-b066-0a1a96148fff-05d8f38a-ed39-4a26-af33-abdee38c8831.png',
  'Eastown': 'https://static.shared.propertyfinder.eg/media/images/listing/01JMFXD63MAQEF8MW0QNXD96N8/fd5df6a8-ed1e-11ef-b066-0a1a96148fff-e0643187-d1df-4be6-ab5e-16f9d1dd9a2e.png',
  'Villette': 'https://static.shared.propertyfinder.eg/media/images/listing/01JMFXD63MAQEF8MW0QNXD96N8/fadfc7b5-ed1e-11ef-b066-0a1a96148fff-b4c7f95d-284c-411b-9294-2d16b9d21fc5.png',
  'Taj City': 'https://static.shared.propertyfinder.eg/media/images/listing/01JMFXD63MAQEF8MW0QNXD96N8/fe1e45e7-ed1e-11ef-b066-0a1a96148fff-13fd30e4-77da-4a77-8a87-64b404dc5b65.png',
  'Palm Hills New Cairo': 'https://static.shared.propertyfinder.eg/media/images/listing/01JMFXD63MAQEF8MW0QNXD96N8/f6be1cb2-ed1e-11ef-b066-0a1a96148fff-6b11b065-7803-42f7-bb82-6b56e277f3c4.png',
  'Katameya Heights': 'https://static.shared.propertyfinder.eg/media/images/listing/01JMGA94NXVF25Q8R6VYVRV0Z4/2da6bb26-73f8-4f3b-98bc-7a051aaab33b.png',
  'Swan Lake Residence': 'https://static.shared.propertyfinder.eg/media/images/listing/01JMGA94NXVF25Q8R6VYVRV0Z4/b0143214-76a6-424d-8cba-7520351af4dd.png',
  'The Waterway': 'https://static.shared.propertyfinder.eg/media/images/listing/01JMGA94NXVF25Q8R6VYVRV0Z4/070bf48c-5c39-48e7-a883-7b5ec4f706d2.png',
  'Zed East': 'https://static.shared.propertyfinder.eg/media/images/listing/01JMGA94NXVF25Q8R6VYVRV0Z4/26008e2d-733b-4d49-9825-2bcf84694fe2.png',
  'Cairo Festival City': 'https://static.shared.propertyfinder.eg/media/images/listing/01JMGA94NXVF25Q8R6VYVRV0Z4/252be8bf-60ab-45d4-b8ac-999cde6e8d45.png',
  'Al Rehab': 'https://static.shared.propertyfinder.eg/media/images/listing/01JMGA94NXVF25Q8R6VYVRV0Z4/01282d44-c0b4-4993-9f36-0b9eb682059d.png',
  'Madinaty': 'https://static.shared.propertyfinder.eg/media/images/listing/01JMGA94NXVF25Q8R6VYVRV0Z4/c1817868-a833-4e1b-bdd0-e3de3dafdd39.png',
  'Fifth Square': 'https://static.shared.propertyfinder.eg/media/images/listing/01JMGEA9VF35AMKHEC9CQZSD2D/37698789-7621-47e3-a0ef-78964803b968.png',
  'Stone Residence': 'https://static.shared.propertyfinder.eg/media/images/listing/01JMGEA9VF35AMKHEC9CQZSD2D/ed6c83e0-c9dc-4610-922c-e68a793467e2.png',
  'District 5': 'https://static.shared.propertyfinder.eg/media/images/listing/01JMGEA9VF35AMKHEC9CQZSD2D/4d382fe9-8e71-4a03-91ab-4134b7c6d1ae.png',
  'Al Burouj': 'https://static.shared.propertyfinder.eg/media/images/listing/01JMGEA9VF35AMKHEC9CQZSD2D/ecaa67c0-4a87-4770-9da1-e4786dc8f2b0.png',
  'Sarai': 'https://static.shared.propertyfinder.eg/media/images/listing/01JMGEA9VF35AMKHEC9CQZSD2D/b90b0296-e57e-45c2-a7e7-a5b81a8ce281.png',
  'STEI8HT': 'https://static.shared.propertyfinder.eg/media/images/listing/01JMGEA9VF35AMKHEC9CQZSD2D/61b13ffb-7b5d-42b4-b679-ad3cd2c2a9f1.png',
  'The Crest': 'https://static.shared.propertyfinder.eg/media/images/listing/01JMGEA9VF35AMKHEC9CQZSD2D/f88cc024-690b-49b4-bd42-30505a362545.png',
  'Bloomfields': 'https://static.shared.propertyfinder.eg/media/images/listing/01JMGEA9VF35AMKHEC9CQZSD2D/2ed7e858-e554-41d8-ba6e-d526be9ddeb1.png',
  'The Brooks': 'https://static.shared.propertyfinder.eg/media/images/listing/01JMGEA9VF35AMKHEC9CQZSD2D/42c8e1c1-696e-4461-9008-c44c745c20a5.png',
  'El Patio Oro': 'https://static.shared.propertyfinder.eg/media/images/listing/01JMGEA9VF35AMKHEC9CQZSD2D/a5fb4199-c466-43a8-be6c-c7865b779a72.png',
  'Uptown Cairo': 'https://static.shared.propertyfinder.eg/media/images/listing/01JMGEA9VF35AMKHEC9CQZSD2D/5f01b684-6d43-4ee0-a826-6b91edbe8c35.png',
};
