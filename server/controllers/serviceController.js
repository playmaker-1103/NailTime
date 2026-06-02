const supabase = require("../config/supabase");
const { mapService, mapServicePayload } = require("../utils/dbMappers");

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

function isValidUuid(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id
  );
}

async function getServices(req, res) {
  try {
    const includeInactive = req.query.includeInactive === "true";
    let query = supabase.from("services").select("*").order("created_at", { ascending: false });

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ message: "Could not fetch services" });
    }

    return res.json({ services: data.map(mapService) });
  } catch (error) {
    return res.status(500).json({ message: "Could not fetch services" });
  }
}

async function getServiceById(req, res) {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(400).json({ message: "Invalid service id" });
    }

    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ message: "Could not fetch service" });
    }

    if (!data) {
      return res.status(404).json({ message: "Service not found" });
    }

    return res.json({ service: mapService(data) });
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

    const { data, error } = await supabase
      .from("services")
      .insert(mapServicePayload({ ...req.body, durationMinutes, price }))
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({ message: "Could not create service" });
    }

    return res.status(201).json({ service: mapService(data) });
  } catch (error) {
    return res.status(500).json({ message: "Could not create service" });
  }
}

async function updateService(req, res) {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(400).json({ message: "Invalid service id" });
    }

    const { errors, durationMinutes, price } = validateServiceInput(req.body);

    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join(". ") });
    }

    const { data, error } = await supabase
      .from("services")
      .update(mapServicePayload({ ...req.body, durationMinutes, price }))
      .eq("id", req.params.id)
      .select("*")
      .maybeSingle();

    if (error) {
      return res.status(500).json({ message: "Could not update service" });
    }

    if (!data) {
      return res.status(404).json({ message: "Service not found" });
    }

    return res.json({ service: mapService(data) });
  } catch (error) {
    return res.status(500).json({ message: "Could not update service" });
  }
}

async function deleteService(req, res) {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(400).json({ message: "Invalid service id" });
    }

    const { data, error } = await supabase
      .from("services")
      .delete()
      .eq("id", req.params.id)
      .select("id")
      .maybeSingle();

    if (error) {
      return res.status(500).json({ message: "Could not delete service" });
    }

    if (!data) {
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
