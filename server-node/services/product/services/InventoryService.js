const { ProductRepository } = require("../repositories/ProductRepository");
const { InventoryReservationRepository } = require("../repositories/InventoryReservationRepository");

class InventoryService {
  constructor(productRepository = new ProductRepository(), reservationRepository = new InventoryReservationRepository()) {
    this.productRepository = productRepository;
    this.reservationRepository = reservationRepository;
    this.inFlightReservations = new Map();
  }

  async reserve({ reservationId, customerId, items, expiresAt }) {
    this.validateReservation({ reservationId, items });

    if (this.inFlightReservations.has(reservationId)) {
      return this.inFlightReservations.get(reservationId);
    }

    const operation = this.reserveInternal({
      reservationId,
      customerId,
      items,
      expiresAt,
    });
    this.inFlightReservations.set(reservationId, operation);

    try {
      return await operation;
    } finally {
      this.inFlightReservations.delete(reservationId);
    }
  }

  async reserveInternal({ reservationId, customerId, items, expiresAt }) {
    const existing = await this.reservationRepository.findById(reservationId);
    if (existing) {
      if (existing.customerId !== customerId) {
        throw this.error("Reservation belongs to another customer", 403);
      }
      if (["reserved", "committed"].includes(existing.status)) return existing;
      throw this.error("Reservation is no longer active", 409);
    }

    const decremented = [];
    try {
      for (const item of items) {
        const updated = await this.productRepository.decrementIfAvailable(
          item.productId,
          item.quantity
        );
        if (!updated) {
          throw this.error(`Insufficient stock for product ${item.productId}`, 409);
        }
        decremented.push(item);
      }

      return this.reservationRepository.create({
        id: reservationId,
        customerId,
        items,
        status: "reserved",
        expiresAt: new Date(expiresAt),
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      await this.restoreItems(decremented);
      throw error;
    }
  }

  async release(reservationId, customerId) {
    const existing = await this.reservationRepository.findById(reservationId);
    if (!existing) return null;
    if (existing.customerId !== customerId) {
      throw this.error("Reservation belongs to another customer", 403);
    }
    if (existing.status !== "reserved") return existing;

    const released = await this.reservationRepository.transition(
      reservationId,
      "reserved",
      "released",
      { releasedAt: new Date().toISOString() }
    );
    if (!released) return existing;

    await this.restoreItems(existing.items);
    return released;
  }

  async get(reservationId, customerId) {
    const reservation = await this.reservationRepository.findById(reservationId);
    if (!reservation) throw this.error("Inventory reservation not found", 404);
    if (reservation.customerId !== customerId) {
      throw this.error("Reservation belongs to another customer", 403);
    }
    return reservation;
  }

  async commit(reservationId, customerId) {
    const existing = await this.reservationRepository.findById(reservationId);
    if (!existing) throw this.error("Inventory reservation not found", 404);
    if (existing.customerId !== customerId) {
      throw this.error("Reservation belongs to another customer", 403);
    }
    if (existing.status === "committed") return existing;
    if (existing.status !== "reserved") {
      throw this.error("Inventory reservation is not active", 409);
    }

    return this.reservationRepository.transition(
      reservationId,
      "reserved",
      "committed",
      { committedAt: new Date().toISOString() }
    );
  }

  async releaseExpiredReservations() {
    const expired = await this.reservationRepository.findExpiredReserved();
    for (const reservation of expired) {
      try {
        await this.release(reservation.id, reservation.customerId);
      } catch (error) {
        console.error(
          `Expired reservation release failed for ${reservation.id}: ${error.message}`
        );
      }
    }
  }

  async restoreItems(items) {
    for (const item of items) {
      await this.productRepository.incrementStock(item.productId, item.quantity);
    }
  }

  validateReservation({ reservationId, items }) {
    if (!reservationId || !Array.isArray(items) || !items.length) {
      throw this.error("Reservation id and items are required", 400);
    }

    for (const item of items) {
      if (!Number.isInteger(Number(item.productId)) || !Number.isInteger(item.quantity) || item.quantity < 1) {
        throw this.error("Reservation contains an invalid item", 400);
      }
    }
  }

  error(message, statusCode) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  }
}

module.exports = { InventoryService };
