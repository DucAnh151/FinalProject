require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const provinces = await prisma.provinces.findMany();
  const users     = await prisma.users.findMany({ select: { id: true, full_name: true, role: true } });
  const trips     = await prisma.trips.findMany({ take: 3 });

  console.log('✅ Prisma kết nối thành công!');
  console.log('Provinces:', provinces);
  console.log('Users:', users);
  console.log('Trips count:', trips.length);
}

main()
  .catch(e => console.error('❌ Lỗi:', e.message))
  .finally(() => prisma.$disconnect());