declare module "node:test" { // Names the built-in test runner for the checker. Node already provides it at run time.
  export function test(name: string, body: () => void): void; // One named test with a body that runs the checks.
} // Ends the test-runner note.

declare module "node:assert/strict" { // Names the strict assert helpers for the checker.
  function equal(actual: unknown, expected: unknown): void; // Checks that two values are the same.
  function ok(value: unknown): asserts value; // Checks that a value is present.
  export { equal, ok }; // Makes those two checks available as named imports.
  const strictAssert: { // The same checks as a default import.
    equal: typeof equal; // The equality check on the default object.
    ok: typeof ok; // The presence check on the default object.
  }; // Ends the default object.
  export default strictAssert; // Lets a test file import the checks as one object.
} // Ends the assert note.
