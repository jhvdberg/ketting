import { test } from "node:test";
import assert from "node:assert/strict";
import { parseWeightInput } from "../../../src/modules/gym/screens/shared.js";

test("parseWeightInput accepteert een komma als decimaalteken (Nederlands toetsenbord)", () => {
  assert.equal(parseWeightInput("12,5"), 12.5);
  assert.equal(parseWeightInput("12.5"), 12.5);
  assert.equal(parseWeightInput("0,5"), 0.5);
  assert.equal(parseWeightInput("100"), 100);
  assert.equal(parseWeightInput(""), null);
});
