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

test("GET /api returns service metadata for serverless-style routes", async () => {
  const response = await fetch(`${baseUrl}/api`);

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.service, "symmetra-sys-automation");
  assert.equal(body.status, "ok");
});

test("GET /api/webhooks/lead returns method guidance", async () => {
  const response = await fetch(`${baseUrl}/api/webhooks/lead`);
  assert.equal(response.status, 405);

  const body = await response.json();
  assert.equal(body.error, "Method Not Allowed");
});
