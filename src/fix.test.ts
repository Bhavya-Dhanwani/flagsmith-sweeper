import assert from "node:assert";
import { fixSource } from "./fix.js";

const src = `function a() {
  if (flags.isEnabled("on")) {
    return 1;
  } else {
    return 2;
  }
}
function b() {
  if (flags.isEnabled("off")) {
    return 1;
  }
  return 2;
}
const c = flags.isEnabled("on") ? "x" : "y";
const d = !flags.isEnabled("off") ? "x" : "y";
const e = flags.isEnabled("keep") ? "x" : "y";
`;
const out = fixSource(src, new Map([["on", true], ["off", false]]));
assert.ok(!out.includes('"on"') && !out.includes('"off"'), out);
assert.ok(out.includes('flags.isEnabled("keep")'), out);
assert.match(out, /function a\(\) \{\n  return 1;\n\}/);
assert.match(out, /function b\(\) \{\n  return 2;\n\}/);
assert.match(out, /const c = "x";/);
assert.match(out, /const d = "x";/);
console.log("fix ok");
