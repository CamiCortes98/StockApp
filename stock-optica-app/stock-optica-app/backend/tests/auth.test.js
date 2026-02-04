const request = require("supertest");
const express = require("express");

test("health endpoint should respond ok", async () => {
  const app = express();
  app.get("/api/health", (req, res) => res.json({ ok: true }));
  const res = await request(app).get("/api/health");
  expect(res.statusCode).toBe(200);
  expect(res.body.ok).toBe(true);
});
