/* ============================================================
   Sierra Estates · New Cairo — shared data (HZDATA)
   Consumed by index.html + sibling pages.
   ============================================================ */
(function () {
  var U = 'https://images.unsplash.com/';
  var q = '?auto=format&fit=crop&w=1400&q=80';

  var HZDATA = {

    /* ── hero slides ── */
    slides: [
      {
        img: U + 'photo-1613977257363-707ba9348227' + q,
        pre: 'New Cairo · AI-Guided Real Estate',
        preAr: 'القاهرة الجديدة · عقارات مدعومة بالذكاء الاصطناعي',
        main: 'The future of real estate in New Cairo',
        mainAr: 'مستقبل العقارات في القاهرة الجديدة'
      },
      {
        img: U + 'photo-1600596542815-ffad4c1539a9' + q,
        pre: 'Villas · Apartments · Penthouses',
        preAr: 'فيلات · شقق · بنتهاوس',
        main: 'Luxury living across 19 compounds',
        mainAr: 'حياة فاخرة في 19 كمباوند'
      },
      {
        img: U + 'photo-1600607687939-ce8a6c25118c' + q,
        pre: 'Smart matching · Verified inventory',
        preAr: 'مطابقة ذكية · مخزون موثّق',
        main: 'Every listing scored by our AI',
        mainAr: 'كل عقار مقيّم بالذكاء الاصطناعي'
      },
      {
        img: U + 'photo-1512917774080-9991f1c4c750' + q,
        pre: 'Resale · Rent · New Launches',
        preAr: 'إعادة بيع · إيجار · إطلاقات جديدة',
        main: 'The best of New Cairo living',
        mainAr: 'أفضل ما في القاهرة الجديدة'
      }
    ],

    /* ── compounds ──  n=name  z=zone  g=grade  ai=score  priceM=avg EGP millions ── */
    compounds: [
      { n: 'Hyde Park New Cairo', z: 'Fifth Settlement', g: 'A+', ai: 9.8, priceM: 14.5 },
      { n: 'Mivida',              z: 'Fifth Settlement', g: 'A+', ai: 9.6, priceM: 16.2 },
      { n: 'Mountain View iCity', z: 'Fifth Settlement', g: 'A',  ai: 9.4, priceM: 12.8 },
      { n: 'Eastown (SODIC)',     z: 'Fifth Settlement', g: 'A+', ai: 9.5, priceM: 15.0 },
      { n: 'Madinaty',            z: 'New Cairo',         g: 'A',  ai: 9.1, priceM: 8.6  },
      { n: 'Al Rehab',            z: 'New Cairo',         g: 'B+', ai: 8.4, priceM: 6.2  },
      { n: 'Taj City',            z: 'New Cairo',         g: 'A',  ai: 9.0, priceM: 11.3 },
      { n: 'Villette',            z: 'Fifth Settlement', g: 'A',  ai: 9.2, priceM: 13.7 }
    ],

    compoundImgs: {
      'Hyde Park New Cairo': U + 'photo-1600585154340-be6161a56a0c' + q,
      'Mivida':              U + 'photo-1613490493576-7fde63acd811' + q,
      'Mountain View iCity': U + 'photo-1600566753086-00f18fb6b3ea' + q,
      'Eastown (SODIC)':     U + 'photo-1580587771525-78b9dba3b914' + q,
      'Madinaty':            U + 'photo-1512917774080-9991f1c4c750' + q,
      'Al Rehab':            U + 'photo-1570129477492-45c003edd2be' + q,
      'Taj City':            U + 'photo-1600047509807-ba8f99d2cdde' + q,
      'Villette':            U + 'photo-1600607687920-4e2a09cf159d' + q
    },

    /* ── featured listings ── */
    listings: [
      { id: 'SE-101', tag: 'Resale',  type: 'Villa',      compound: 'Hyde Park New Cairo', zone: 'Fifth Settlement', beds: 5, baths: 5, area: 420, priceM: 22.5, ai: 9.7,
        img: U + 'photo-1613977257363-707ba9348227' + q },
      { id: 'SE-102', tag: 'Resale',  type: 'Apartment',  compound: 'Mivida', zone: 'Fifth Settlement', beds: 3, baths: 3, area: 195, priceM: 9.8, ai: 9.4,
        img: U + 'photo-1502672260266-1c1ef2d93688' + q },
      { id: 'SE-103', tag: 'New',     type: 'Penthouse',  compound: 'Eastown (SODIC)', zone: 'Fifth Settlement', beds: 4, baths: 4, area: 310, priceM: 18.2, ai: 9.6,
        img: U + 'photo-1600607687939-ce8a6c25118c' + q },
      { id: 'SE-104', tag: 'Rent',    type: 'Twin House', compound: 'Mountain View iCity', zone: 'Fifth Settlement', beds: 4, baths: 4, area: 285, priceM: 0.09, ai: 9.2,
        img: U + 'photo-1600566753086-00f18fb6b3ea' + q },
      { id: 'SE-105', tag: 'Resale',  type: 'Villa',      compound: 'Villette', zone: 'Fifth Settlement', beds: 5, baths: 6, area: 460, priceM: 27.0, ai: 9.5,
        img: U + 'photo-1600585154340-be6161a56a0c' + q },
      { id: 'SE-106', tag: 'Resale',  type: 'Apartment',  compound: 'Taj City', zone: 'New Cairo', beds: 3, baths: 2, area: 172, priceM: 7.4, ai: 9.0,
        img: U + 'photo-1512917774080-9991f1c4c750' + q },
      { id: 'SE-107', tag: 'New',     type: 'Duplex',     compound: 'Madinaty', zone: 'New Cairo', beds: 4, baths: 3, area: 240, priceM: 10.6, ai: 8.9,
        img: U + 'photo-1570129477492-45c003edd2be' + q },
      { id: 'SE-108', tag: 'Rent',    type: 'Apartment',  compound: 'Al Rehab', zone: 'New Cairo', beds: 2, baths: 2, area: 140, priceM: 0.045, ai: 8.3,
        img: U + 'photo-1567767292278-a4f21aa2d36e' + q }
    ]
  };

  window.HZDATA = HZDATA;
})();
