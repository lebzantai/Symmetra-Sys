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

test("GET / returns website HTML instead of Cannot GET", async () => {
  const response = await fetch(`${baseUrl}/`);

  assert.equal(response.status, 200);
  const body = await response.text();
  assert.match(body, /<title>Symmetra Systems \| Gym Automation<\/title>/);
  assert.match(body, /Symmetra Gym Lead Capture/);
});
