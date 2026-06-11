/**
 * Shared logic: confirm booking, lock seats, issue tickets, VIP upgrade.
 * Used by payments/confirm and driver/confirm-cash.
 */
async function confirmBookingAndIssueTickets(tx, { booking, userId }) {
  if (!booking.booking_seats?.length)
    throw new Error('PASSENGERS_MISSING');

  await tx.trip_seat_status.updateMany({
    where: {
      trip_id: booking.trip_id,
      seat_id: { in: booking.booking_seats.map(bs => bs.seat_id) },
    },
    data: {
      status:            'CONFIRMED',
      locked_until:      null,
      locked_by_user_id: null,
    },
  });

  const tickets = await Promise.all(
    booking.booking_seats.map(bs =>
      tx.tickets.create({
        data: {
          booking_id:      booking.id,
          booking_seat_id: bs.id,
          qr_code:         `PAM-${Number(booking.id)}-${Number(bs.seat_id)}-${Date.now()}`,
          status:          'ISSUED',
        },
      })
    )
  );

  await tx.bookings.update({
    where: { id: booking.id },
    data:  { status: 'CONFIRMED', expires_at: null, payment_method: booking.payment_method || 'ONLINE' },
  });

  const ticketCount = booking.booking_seats.length;
  const currentUser = await tx.users.findUnique({
    where: { id: BigInt(userId) },
    select: { total_tickets: true, total_trips: true, loyalty_tier: true },
  });
  const newTotalTickets = (currentUser?.total_tickets || 0) + ticketCount;
  const newTier = (newTotalTickets >= 10 || (currentUser?.total_trips || 0) >= 10)
    ? 'VIP_CUSTOMER'
    : (currentUser?.loyalty_tier || 'STANDARD');

  await tx.users.update({
    where: { id: BigInt(userId) },
    data: {
      total_tickets: newTotalTickets,
      loyalty_tier:  newTier,
    },
  });

  return { tickets, loyaltyTier: newTier, totalTickets: newTotalTickets };
}

module.exports = { confirmBookingAndIssueTickets };
