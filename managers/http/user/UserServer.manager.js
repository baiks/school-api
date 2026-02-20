"use strict";
const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("../../../config/swagger.js");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const authMw = require("../../../mws/auth.mw.js");
const validate = require("../../../mws/validate.mw.js");
const SchoolServer = require("../school/SchoolServer.manager.js");
const ClassroomServer = require("../classroom/ClassroomServer.manager.js");
const StudentServer = require("../student/StudentServer.manager.js");

module.exports = class UserServer {
  constructor({ config, cortex, managers }) {
    this.config = config;
    this.cortex = cortex;
    this.managers = managers;
    this.app = express();
    this._setup();
  }

  _setup() {
    const { config, app, managers } = this;
    const { responseDispatcher, tokenManager, userManager } = managers;

    // ── Global Middleware ────────────────────────────────────────────────
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(
      rateLimit({
        windowMs: config.rateLimit?.windowMs || 15 * 60 * 1000,
        max: config.rateLimit?.max || 100,
        message: {
          ok: false,
          message: "Too many requests, please try again later.",
        },
      }),
    );

    const auth = (roles) => authMw(tokenManager, roles);
    const superOnly = auth(["superadmin"]);
    const anyAdmin = auth(["superadmin", "school_admin"]);
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

    // ── Swagger UI ────────────────────────────────────────────────────────
    app.use(
      "/api-docs",
      swaggerUi.serve,
      swaggerUi.setup(swaggerSpec, {
        customSiteTitle: "School API Docs",
        swaggerOptions: { persistAuthorization: true },
      }),
    );
    app.get("/api-docs.json", (req, res) => res.json(swaggerSpec));

    // ── Health ────────────────────────────────────────────────────────────
    app.get("/health", (req, res) =>
      res.json({ ok: true, service: config.dotEnv.SERVICE_NAME }),
    );

    // ── Auth Routes ───────────────────────────────────────────────────────
    app.post(
      "/api/auth/register",
      superOnly,
      validate(["username", "email", "password"]),
      async (req, res, next) => {
        try {
          const { username, email, password, role, schoolId } = req.body;
          const result = await userManager.register({
            username,
            email,
            password,
            role,
            schoolId,
          });
          return result.error ? err(res, result) : ok(res, result);
        } catch (e) {
          next(e);
        }
      },
    );

    app.post(
      "/api/auth/login",
      validate(["email", "password"]),
      async (req, res, next) => {
        try {
          const result = await userManager.login({
            email: req.body.email,
            password: req.body.password,
          });
          return result.error ? err(res, result) : ok(res, result);
        } catch (e) {
          next(e);
        }
      },
    );

    app.post(
      "/api/auth/refresh",
      validate(["longToken"]),
      async (req, res, next) => {
        try {
          const result = await userManager.refreshToken({
            longToken: req.body.longToken,
          });
          return result.error ? err(res, result) : ok(res, result);
        } catch (e) {
          next(e);
        }
      },
    );

    app.get("/api/auth/me", anyAdmin, async (req, res, next) => {
      try {
        const result = await userManager.getById(req.user.userId);
        return result.error ? err(res, result) : ok(res, result);
      } catch (e) {
        next(e);
      }
    });

    // ── User Management Routes (superadmin only) ──────────────────────────
    app.get("/api/users", superOnly, async (req, res, next) => {
      try {
        const result = await userManager.list(req.query);
        return result.error ? err(res, result) : ok(res, result);
      } catch (e) {
        next(e);
      }
    });

    app.delete("/api/users/:id", superOnly, async (req, res, next) => {
      try {
        const result = await userManager.deactivate(req.params.id);
        return result.error ? err(res, result) : ok(res, result);
      } catch (e) {
        next(e);
      }
    });

    // ── Entity Sub-Routers ────────────────────────────────────────────────
    const schoolServer = new SchoolServer({ config, managers });
    const classroomServer = new ClassroomServer({ config, managers });
    const studentServer = new StudentServer({ config, managers });

    app.use("/api/schools", anyAdmin, schoolServer.getRouter());
    app.use("/api/classrooms", anyAdmin, classroomServer.getRouter());
    app.use("/api/students", anyAdmin, studentServer.getRouter());

    // ── 404 ───────────────────────────────────────────────────────────────
    app.use((req, res) => {
      res
        .status(404)
        .json({
          ok: false,
          message: `Route ${req.method} ${req.path} not found`,
        });
    });

    // ── Error Handler ─────────────────────────────────────────────────────
    app.use((error, req, res, next) => {
      console.error("[Server Error]", error);
      res
        .status(500)
        .json({
          ok: false,
          message: "Internal server error",
          error: error.message,
        });
    });
  }

  run() {
    const port = this.config.dotEnv.USER_PORT;
    this.app.listen(port, () => {
      console.log(
        `[${this.config.dotEnv.SERVICE_NAME}] Server running on port ${port}`,
      );
      console.log(`[Swagger] http://localhost:${port}/api-docs`);
    });
  }
};
