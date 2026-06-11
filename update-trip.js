const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
    try {
        const trip = await prisma.trips.update({
            where: { id: 1n },
            data: { assigned_driver_id: 3n }
        });
        console.log('✅ Trip assigned:', trip.id, 'to driver:', trip.assigned_driver_id);
    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        await prisma.$disconnect();
    }
})();
