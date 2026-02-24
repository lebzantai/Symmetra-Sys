const test = require("node:test");
const assert = require("node:assert/strict");

const handler = require("../api/index");

test("serverless entrypoint exports an express-compatible handler", () => {
  assert.equal(typeof handler, "function");
  assert.equal(typeof handler.use, "function");
  assert.equal(typeof handler.listen, "function");
});
