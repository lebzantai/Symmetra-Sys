const test = require("node:test");
const assert = require("node:assert/strict");

const { app } = require("../src/server");

let server;
let baseUrl;

test.before(() => {
  server = app.listen(0);
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(() => {
  server.close();
});

test("GET /webhooks/lead returns method guidance instead of Cannot GET", async () => {
  const response = await fetch(`${baseUrl}/webhooks/lead`);
  assert.equal(response.status, 405);

  const body = await response.json();
  assert.equal(body.error, "Method Not Allowed");
  assert.equal(body.message, "Use POST /webhooks/lead with a JSON payload.");
});

test("unknown API routes return JSON 404 payload", async () => {
  const response = await fetch(`${baseUrl}/api/does-not-exist`);
  assert.equal(response.status, 404);

  const body = await response.json();
  assert.equal(body.error, "Not Found");
  assert.equal(body.method, "GET");
  assert.equal(body.path, "/api/does-not-exist");
});

test("unknown website routes return the website HTML", async () => {
  const response = await fetch(`${baseUrl}/pricing`);
  assert.equal(response.status, 200);

  const body = await response.text();
  assert.match(body, /Symmetra Gym Lead Capture/);
});
