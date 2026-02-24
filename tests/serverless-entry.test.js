const test = require("node:test");
const assert = require("node:assert/strict");

test("api/index exports a request handler", () => {
  const handler = require("../api/index");
  assert.equal(typeof handler, "function");
});
