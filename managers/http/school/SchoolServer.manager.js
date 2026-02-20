"use strict";
const { Router } = require("express");

module.exports = class SchoolServer {
  constructor({ config, managers }) {
    this.config = config;
    this.schoolManager = managers.schoolManager;
    this.responseDispatcher = managers.responseDispatcher;
    this.router = Router();
    this._setup();
  }

  _setup() {
    const { router, schoolManager, responseDispatcher } = this;

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
    const superOnly = (req, res) => {
      if (req.user.role !== "superadmin") {
        res
          .status(403)
          .json({ ok: false, message: "Forbidden: superadmin only" });
        return false;
      }
      return true;
    };

    // GET /api/schools
    router.get("/", async (req, res) => {
      try {
        const result = await schoolManager.list(req.query);
        return result.error ? err(res, result) : ok(res, result);
      } catch (e) {
        console.error("[SchoolServer] GET /:", e);
        return res
          .status(500)
          .json({ ok: false, message: "Failed to retrieve schools" });
      }
    });

    // POST /api/schools
    router.post("/", async (req, res) => {
      try {
        if (!superOnly(req, res)) return;

        const { name, address, phone, email, website } = req.body;
        if (!name || !address) {
          return res
            .status(400)
            .json({
              ok: false,
              message: "Missing required fields: name, address",
            });
        }

        const result = await schoolManager.create({
          name,
          address,
          phone,
          email,
          website,
        });
        return result.error
          ? err(res, result)
          : ok(res, { ...result, code: 201 });
      } catch (e) {
        console.error("[SchoolServer] POST /:", e);
        return res
          .status(500)
          .json({ ok: false, message: "Failed to create school" });
      }
    });

    // GET /api/schools/:id
    router.get("/:id", async (req, res) => {
      try {
        const id =
          req.user.role === "school_admin" ? req.user.schoolId : req.params.id;
        const result = await schoolManager.getById(id);
        return result.error ? err(res, result) : ok(res, result);
      } catch (e) {
        console.error("[SchoolServer] GET /:id:", e);
        return res
          .status(500)
          .json({ ok: false, message: "Failed to retrieve school" });
      }
    });

    // PUT /api/schools/:id
    router.put("/:id", async (req, res) => {
      try {
        if (!superOnly(req, res)) return;

        const { name, address, phone, email, website } = req.body;

        const updates = {};
        if (name !== undefined) updates.name = name;
        if (address !== undefined) updates.address = address;
        if (phone !== undefined) updates.phone = phone;
        if (email !== undefined) updates.email = email;
        if (website !== undefined) updates.website = website;

        if (!Object.keys(updates).length) {
          return res
            .status(400)
            .json({ ok: false, message: "No valid fields provided to update" });
        }

        const result = await schoolManager.update(req.params.id, updates);
        return result.error ? err(res, result) : ok(res, result);
      } catch (e) {
        console.error("[SchoolServer] PUT /:id:", e);
        return res
          .status(500)
          .json({ ok: false, message: "Failed to update school" });
      }
    });

    // DELETE /api/schools/:id
    router.delete("/:id", async (req, res) => {
      try {
        if (!superOnly(req, res)) return;

        const result = await schoolManager.delete(req.params.id);
        return result.error ? err(res, result) : ok(res, result);
      } catch (e) {
        console.error("[SchoolServer] DELETE /:id:", e);
        return res
          .status(500)
          .json({ ok: false, message: "Failed to delete school" });
      }
    });
  }

  getRouter() {
    return this.router;
  }
};
