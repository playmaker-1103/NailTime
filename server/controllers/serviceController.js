const mongoose = require("mongoose");
const Service = require("../models/Service");

function validateServiceInput(body) {
  const errors = [];
  const durationMinutes = Number(body.durationMinutes);
  const price = Number(body.price);

  if (!body.name || !body.name.trim()) {
    errors.push("Service name is required");
  }

  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    errors.push("Service duration must be a positive number");
  }

  if (!Number.isFinite(price) || price <= 0) {
    errors.push("Service price must be a positive number");
  }

  return { errors, durationMinutes, price };
}

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

async function getServices(req, res) {
  try {
    const includeInactive = req.query.includeInactive === "true";
    const filter = includeInactive ? {} : { isActive: true };
    const services = await Service.find(filter).sort({ createdAt: -1 });
    return res.json({ services });
  } catch (error) {
    return res.status(500).json({ message: "Could not fetch services" });
  }
}

async function getServiceById(req, res) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid service id" });
    }

    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    return res.json({ service });
  } catch (error) {
    return res.status(500).json({ message: "Could not fetch service" });
  }
}

async function createService(req, res) {
  try {
    const { errors, durationMinutes, price } = validateServiceInput(req.body);

    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join(". ") });
    }

    const service = await Service.create({
      name: req.body.name.trim(),
      description: req.body.description || "",
      durationMinutes,
      price,
      isActive: req.body.isActive ?? true
    });

    return res.status(201).json({ service });
  } catch (error) {
    return res.status(500).json({ message: "Could not create service" });
  }
}

async function updateService(req, res) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid service id" });
    }

    const { errors, durationMinutes, price } = validateServiceInput(req.body);

    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join(". ") });
    }

    const service = await Service.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name.trim(),
        description: req.body.description || "",
        durationMinutes,
        price,
        isActive: req.body.isActive ?? true
      },
      { returnDocument: "after", runValidators: true }
    );

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    return res.json({ service });
  } catch (error) {
    return res.status(500).json({ message: "Could not update service" });
  }
}

async function deleteService(req, res) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid service id" });
    }

    const service = await Service.findByIdAndDelete(req.params.id);

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    return res.json({ message: "Service deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Could not delete service" });
  }
}

module.exports = {
  createService,
  deleteService,
  getServiceById,
  getServices,
  updateService
};
