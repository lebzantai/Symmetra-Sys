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

test("GET / returns service metadata instead of Cannot GET", async () => {
  const response = await fetch(`${baseUrl}/`);

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.service, "symmetra-sys-automation");
  assert.equal(body.status, "ok");
  assert.deepEqual(body.endpoints, [
    "/health",
    "/webhooks/lead",
    "/webhooks/inbound",
    "/users/:userId/access-check"
  ]);
});
