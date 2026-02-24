const test = require("node:test");
const assert = require("node:assert/strict");

const handler = require("../api/index");

test("serverless entry exports express app handler", () => {
  assert.equal(typeof handler, "function");
  assert.equal(typeof handler.handle, "function");
});
