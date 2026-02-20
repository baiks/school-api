"use strict";
const { Router } = require("express");

module.exports = class ClassroomServer {
  constructor({ config, managers }) {
    this.config = config;
    this.classroomManager = managers.classroomManager;
    this.responseDispatcher = managers.responseDispatcher;
    this.router = Router();
    this._setup();
  }

  _setup() {
    const { router, classroomManager, responseDispatcher } = this;

    const ok = (res, result) =>
      responseDispatcher.dispatch(res, {
        ok: true,
        data: result.data,
        code: result.code || 200,
      });
    const err = (res, result) =>
      responseDispatcher.dispatch(res, {
        ok: false,
        errors: result.error,
        message: result.error,
        code: result.code || 400,
      });

    // school_admin: locked to their token schoolId; superadmin: must supply it explicitly
    const resolveSchoolId = (req, source = "body") => {
      if (req.user.role === "school_admin") return req.user.schoolId;
      return source === "query" ? req.query.schoolId : req.body.schoolId;
    };

    // GET /api/classrooms
    router.get("/", async (req, res) => {
      try {
        const schoolId = resolveSchoolId(req, "query");
        const result = await classroomManager.list({ ...req.query, schoolId });
        return result.error ? err(res, result) : ok(res, result);
      } catch (e) {
        console.error("[ClassroomServer] GET /:", e);
        return res
          .status(500)
          .json({ ok: false, message: "Failed to retrieve classrooms" });
      }
    });

    // POST /api/classrooms
    router.post("/", async (req, res) => {
      try {
        const schoolId = resolveSchoolId(req, "body");
        if (!schoolId) {
          return res.status(400).json({
            ok: false,
            message:
              "schoolId is required. Superadmins must provide it in the request body.",
          });
        }

        const { name, capacity, resources } = req.body;
        if (!name || capacity === undefined) {
          return res.status(400).json({
            ok: false,
            message: "Missing required fields: name, capacity",
          });
        }
        if (isNaN(capacity) || Number(capacity) < 1) {
          return res
            .status(400)
            .json({ ok: false, message: "capacity must be a positive number" });
        }

        const result = await classroomManager.create({
          name,
          schoolId,
          capacity: Number(capacity),
          resources,
        });
        return result.error
          ? err(res, result)
          : ok(res, { ...result, code: 201 });
      } catch (e) {
        console.error("[ClassroomServer] POST /:", e);
        return res
          .status(500)
          .json({ ok: false, message: "Failed to create classroom" });
      }
    });

    // GET /api/classrooms/:id
    router.get("/:id", async (req, res) => {
      try {
        const schoolId = resolveSchoolId(req, "query");
        const result = await classroomManager.getById(req.params.id, schoolId);
        return result.error ? err(res, result) : ok(res, result);
      } catch (e) {
        console.error("[ClassroomServer] GET /:id:", e);
        return res
          .status(500)
          .json({ ok: false, message: "Failed to retrieve classroom" });
      }
    });

    // PUT /api/classrooms/:id
    router.put("/:id", async (req, res) => {
      try {
        const schoolId = resolveSchoolId(req, "query");
        const { name, capacity, resources } = req.body;

        if (
          capacity !== undefined &&
          (isNaN(capacity) || Number(capacity) < 1)
        ) {
          return res
            .status(400)
            .json({ ok: false, message: "capacity must be a positive number" });
        }

        const updates = {};
        if (name !== undefined) updates.name = name;
        if (capacity !== undefined) updates.capacity = Number(capacity);
        if (resources !== undefined) updates.resources = resources;

        if (!Object.keys(updates).length) {
          return res
            .status(400)
            .json({ ok: false, message: "No valid fields provided to update" });
        }

        const result = await classroomManager.update(
          req.params.id,
          schoolId,
          updates,
        );
        return result.error ? err(res, result) : ok(res, result);
      } catch (e) {
        console.error("[ClassroomServer] PUT /:id:", e);
        return res
          .status(500)
          .json({ ok: false, message: "Failed to update classroom" });
      }
    });

    // DELETE /api/classrooms/:id
    router.delete("/:id", async (req, res) => {
      try {
        const schoolId = resolveSchoolId(req, "query");
        const result = await classroomManager.delete(req.params.id, schoolId);
        return result.error ? err(res, result) : ok(res, result);
      } catch (e) {
        console.error("[ClassroomServer] DELETE /:id:", e);
        return res
          .status(500)
          .json({ ok: false, message: "Failed to delete classroom" });
      }
    });
  }

  getRouter() {
    return this.router;
  }
};
