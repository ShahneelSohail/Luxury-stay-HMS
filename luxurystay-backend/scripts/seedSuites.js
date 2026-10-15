require('dotenv').config();
const mongoose = require('mongoose');
const Suite    = require('../models/Suite');

const SUITES = [
  {
    slug:        'deluxe_twin',
    name:        'Deluxe Twin',
    description: 'Twin beds for travel companions or family. Garden-side aspect, full marble bathroom, walk-in shower.',
    sqm:         28,
    maxGuests:   2,
    baseRate:    460,
    gradient:    'linear-gradient(140deg, #EFE8DB, #C9AE82)',
    sortOrder:   1,
    amenities: [
      { icon: 'wifi',   label: 'Fibre Wi-Fi' },
      { icon: 'coffee', label: 'Espresso' },
      { icon: 'spa',    label: 'Bath ritual' },
    ],
  },
  {
    slug:        'deluxe_king',
    name:        'Deluxe King',
    description: 'Our signature category. King bed, sitting nook, French balcony with views over the gardens or Promenade.',
    sqm:         32,
    maxGuests:   2,
    baseRate:    480,
    gradient:    'linear-gradient(140deg, #C9AE82, #A08054)',
    sortOrder:   2,
    amenities: [
      { icon: 'wifi',   label: 'Fibre Wi-Fi' },
      { icon: 'coffee', label: 'Espresso' },
      { icon: 'spa',    label: 'Bath ritual' },
    ],
  },
  {
    slug:        'junior_suite',
    name:        'Junior Suite',
    description: 'Generous proportions, separate sitting area, soaking tub overlooking the sea. Espresso service standard.',
    sqm:         48,
    maxGuests:   3,
    baseRate:    720,
    gradient:    'linear-gradient(140deg, #A08054, #806339)',
    sortOrder:   3,
    amenities: [
      { icon: 'wifi',   label: 'Fibre Wi-Fi' },
      { icon: 'coffee', label: 'Espresso' },
      { icon: 'spa',    label: 'Bath ritual' },
      { icon: 'leaf',   label: 'Terrace' },
    ],
  },
  {
    slug:        'premier_suite',
    name:        'Premier Suite',
    description: 'Two-bedroom configuration available. Private terrace, dressing room, dedicated butler service.',
    sqm:         76,
    maxGuests:   4,
    baseRate:    1240,
    gradient:    'linear-gradient(140deg, #806339, #4A443B)',
    sortOrder:   4,
    amenities: [
      { icon: 'wifi',   label: 'Fibre Wi-Fi' },
      { icon: 'coffee', label: 'Espresso' },
      { icon: 'spa',    label: 'Bath ritual' },
      { icon: 'leaf',   label: 'Terrace' },
      { icon: 'crown',  label: 'Butler', vip: true },
    ],
  },
  {
    slug:        'penthouse',
    name:        'Penthouse',
    description: 'The crown of the house. Wraparound terrace with plunge pool, dining for ten, panoramic Mediterranean views.',
    sqm:         180,
    maxGuests:   6,
    baseRate:    2400,
    gradient:    'linear-gradient(140deg, #4A443B, #1A1814)',
    sortOrder:   5,
    amenities: [
      { icon: 'wifi',   label: 'Fibre Wi-Fi' },
      { icon: 'coffee', label: 'Espresso' },
      { icon: 'spa',    label: 'Bath ritual' },
      { icon: 'pool',   label: 'Plunge pool' },
      { icon: 'crown',  label: 'Butler', vip: true },
    ],
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  let created = 0, skipped = 0;
  for (const data of SUITES) {
    const exists = await Suite.findOne({ slug: data.slug });
    if (exists) {
      console.log(`  skip  ${data.slug} (already exists)`);
      skipped++;
    } else {
      await Suite.create(data);
      console.log(`  ✓     ${data.slug}`);
      created++;
    }
  }

  console.log(`\nDone — ${created} created, ${skipped} skipped.`);
  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
