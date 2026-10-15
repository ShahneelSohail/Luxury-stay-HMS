require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const User = require('./models/User');
  const Room = require('./models/Room');

  // ── Users ──────────────────────────────────────────────────────────────────
  const users = [
    { name: 'Margaux Devereaux', email: 'm.devereaux@luxurystay.co', password: 'Admin@1234!',     role: 'admin' },
    { name: 'Henri Cassel',      email: 'h.cassel@luxurystay.co',    password: 'Manager@1234!',   role: 'manager' },
    { name: 'Yuki Tanaka',       email: 'y.tanaka@luxurystay.co',    password: 'Reception@1234!', role: 'receptionist' },
    { name: 'Rosa Mendoza',      email: 'r.mendoza@luxurystay.co',   password: 'House@1234!',     role: 'housekeeping' },
    { name: 'Tomás Reyes',       email: 't.reyes@luxurystay.co',     password: 'Service@1234!',   role: 'service' },
  ];

  for (const u of users) {
    const exists = await User.findOne({ email: u.email });
    if (!exists) {
      await User.create({ ...u, isActive: true });
      console.log(`Created user: ${u.name} (${u.role})`);
    } else {
      // Reset password in case it was previously double-hashed
      const doc = await User.findOne({ email: u.email });
      doc.password = u.password;
      await doc.save();
      console.log(`Reset password for: ${u.email}`);
    }
  }

  // ── Rooms ──────────────────────────────────────────────────────────────────
  const rooms = [
    { roomNumber: '101', type: 'deluxe_twin',   floor: 1, maxGuests: 2, status: 'available',   rates: { low: 150, standard: 180, high: 220, peak: 280 }, amenities: ['wifi','tv','minibar'] },
    { roomNumber: '102', type: 'deluxe_twin',   floor: 1, maxGuests: 2, status: 'occupied',    rates: { low: 150, standard: 180, high: 220, peak: 280 }, amenities: ['wifi','tv'] },
    { roomNumber: '103', type: 'deluxe_twin',   floor: 1, maxGuests: 2, status: 'cleaning',    rates: { low: 150, standard: 180, high: 220, peak: 280 }, amenities: ['wifi','tv'] },
    { roomNumber: '201', type: 'deluxe_king',   floor: 2, maxGuests: 2, status: 'available',   rates: { low: 220, standard: 280, high: 340, peak: 420 }, amenities: ['wifi','tv','minibar','bathtub'] },
    { roomNumber: '202', type: 'deluxe_king',   floor: 2, maxGuests: 2, status: 'occupied',    rates: { low: 220, standard: 280, high: 340, peak: 420 }, amenities: ['wifi','tv','minibar','bathtub'] },
    { roomNumber: '203', type: 'deluxe_king',   floor: 2, maxGuests: 2, status: 'maintenance', rates: { low: 220, standard: 280, high: 340, peak: 420 }, amenities: ['wifi','tv','minibar'] },
    { roomNumber: '301', type: 'junior_suite',  floor: 3, maxGuests: 3, status: 'available',   rates: { low: 380, standard: 480, high: 580, peak: 720 }, amenities: ['wifi','tv','minibar','bathtub','balcony'] },
    { roomNumber: '302', type: 'junior_suite',  floor: 3, maxGuests: 3, status: 'occupied',    rates: { low: 380, standard: 480, high: 580, peak: 720 }, amenities: ['wifi','tv','minibar','bathtub','balcony'] },
    { roomNumber: '401', type: 'premier_suite', floor: 4, maxGuests: 3, status: 'available',   rates: { low: 620, standard: 780, high: 940, peak: 1150 }, amenities: ['wifi','tv','minibar','bathtub','balcony','jacuzzi'] },
    { roomNumber: '501', type: 'penthouse',     floor: 5, maxGuests: 4, status: 'available',   rates: { low: 900, standard: 1100, high: 1400, peak: 1800 }, amenities: ['wifi','tv','minibar','bathtub','balcony','jacuzzi'] },
  ];

  for (const r of rooms) {
    const exists = await Room.findOne({ roomNumber: r.roomNumber });
    if (!exists) {
      await Room.create(r);
      console.log(`Created room: ${r.roomNumber} (${r.type})`);
    } else {
      console.log(`Skipped (exists): Room ${r.roomNumber}`);
    }
  }

  console.log('\nSeed complete.');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
