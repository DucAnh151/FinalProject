import { defineStore } from 'pinia'

const STORAGE_KEY = 'pam_booking'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveToStorage(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // quota exceeded — silent fail
  }
}

function clearStorage() {
  localStorage.removeItem(STORAGE_KEY)
}

const defaultState = () => ({
  // Step 1 — trip selected from SearchView
  selectedTrip: null,        // full trip object from API

  // Step 2 — seat map
  bookingId:    null,        // returned from POST /bookings
  expiresAt:    null,        // ISO string
  seats:        [],          // [{ seatId, seatName, floor, row, col }]

  // Step 3 — passenger details (BookingView)
  passengers:   [],          // [{ name, phone, isSelf }]
  pickupStopId: null,
  dropoffStopId:null,

  // Step 4 — payment
  totalPrice:   0,
})

export const useBookingStore = defineStore('booking', {
  state: () => {
    const saved = loadFromStorage()
    return saved ? { ...defaultState(), ...saved } : defaultState()
  },

  getters: {
    hasActiveBooking: (state) => {
      if (!state.bookingId || !state.expiresAt) return false
      return new Date(state.expiresAt) > new Date()
    },

    timeLeftSeconds: (state) => {
      if (!state.expiresAt) return 0
      return Math.max(0, Math.floor((new Date(state.expiresAt) - Date.now()) / 1000))
    },

    seatCount: (state) => state.seats.length,
  },

  actions: {
    // ── Step 1: user picked a trip in SearchView ──
    setSelectedTrip(trip) {
      this.selectedTrip = trip
      this._persist()
    },

    // ── Step 2: booking created after seat selection ──
    setBookingResult({ bookingId, expiresAt, seats, trip, totalPrice }) {
      this.bookingId  = bookingId
      this.expiresAt  = expiresAt instanceof Date ? expiresAt.toISOString() : expiresAt
      this.seats      = seats        // [{ seatId, seatName }]
      if (trip) this.selectedTrip = trip
      this.totalPrice = totalPrice || 0
      // reset downstream steps
      this.passengers    = []
      this.pickupStopId  = null
      this.dropoffStopId = null
      this._persist()
    },

    // ── Step 3: passenger info saved in BookingView ──
    setPassengers({ passengers, pickupStopId, dropoffStopId }) {
      this.passengers    = passengers
      this.pickupStopId  = pickupStopId
      this.dropoffStopId = dropoffStopId
      this._persist()
    },

    setTotalPrice(price) {
      this.totalPrice = price
      this._persist()
    },

    // ── Clear everything after payment completes or on manual reset ──
    clear() {
      Object.assign(this, defaultState())
      clearStorage()
    },

    // ── Internal: write current state to localStorage ──
    _persist() {
      saveToStorage({
        selectedTrip:  this.selectedTrip,
        bookingId:     this.bookingId,
        expiresAt:     this.expiresAt,
        seats:         this.seats,
        passengers:    this.passengers,
        pickupStopId:  this.pickupStopId,
        dropoffStopId: this.dropoffStopId,
        totalPrice:    this.totalPrice,
      })
    },
  },
})