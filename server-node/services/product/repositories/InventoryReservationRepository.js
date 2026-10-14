let InventoryReservationModel;
try {
  InventoryReservationModel = require("../models/InventoryReservationModel");
} catch (err) {
  InventoryReservationModel = null;
}

class InventoryReservationRepository {
  constructor() {
    this.reservations = [];
  }

  async findById(id) {
    if (InventoryReservationModel && process.env.MONGODB_URI) {
      return InventoryReservationModel.findOne({ id }).lean();
    }
    return this.reservations.find((reservation) => reservation.id === id);
  }

  async create(reservation) {
    if (InventoryReservationModel && process.env.MONGODB_URI) {
      const created = await InventoryReservationModel.create(reservation);
      return created.toObject();
    }

    this.reservations.push(reservation);
    return reservation;
  }

  async findExpiredReserved(now = new Date()) {
    if (InventoryReservationModel && process.env.MONGODB_URI) {
      return InventoryReservationModel.find({
        status: "reserved",
        expiresAt: { $lte: now },
      }).lean();
    }

    return this.reservations.filter(
      (reservation) =>
        reservation.status === "reserved" &&
        new Date(reservation.expiresAt).getTime() <= now.getTime()
    );
  }

  async transition(id, fromStatus, toStatus, updates = {}) {
    if (InventoryReservationModel && process.env.MONGODB_URI) {
      return InventoryReservationModel.findOneAndUpdate(
        { id, status: fromStatus },
        { $set: { ...updates, status: toStatus } },
        { new: true }
      ).lean();
    }

    const reservation = this.reservations.find(
      (item) => item.id === id && item.status === fromStatus
    );
    if (!reservation) return null;

    Object.assign(reservation, { ...updates, status: toStatus });
    return reservation;
  }
}

module.exports = { InventoryReservationRepository };
