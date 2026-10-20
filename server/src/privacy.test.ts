import assert from "node:assert/strict"; // Strict checks for the filter tests.
import { test } from "node:test"; // The built-in test runner.
import type { Charge } from "./types.ts"; // The charge shape from step 1. This file does not declare that shape again.
import { filterStatementLine } from "./privacy.ts"; // The filter under test.

// Runs the filter and fails the test when a line we meant to keep comes back empty.
function kept(line: string): Charge { // Turns a kept line into a charge the test can read.
  const charge = filterStatementLine(line); // Ask the filter what to do with this line.
  if (charge === null) { // Null means the filter dropped a line this test expected to keep.
    throw new Error("expected the line to be kept"); // Fail the test with a plain reason.
  } // Ends the null check.
  return charge; // Hand the kept charge to the test.
} // Ends the helper.

test("keeps a normal outgoing merchant charge", (): void => { // A shop charge that is not a balance, credit, peer transfer, or grocery trip stays.
  const charge = kept("2026-03-01 | NETFLIX.COM | 15.99 | USD"); // A plain outgoing Netflix line.
  assert.equal(charge.merchantRawText, "NETFLIX.COM"); // The shop text is the merchant wording.
  assert.equal(charge.merchantDisplayName, "NETFLIX.COM"); // The display name is that same shop text.
  assert.equal(charge.amount, 15.99); // The amount is the amount on the line.
  assert.equal(charge.currency, "USD"); // The currency is the currency on the line.
  assert.equal(charge.date, "2026-03-01"); // The date is the date on the line.
  assert.equal(charge.direction, "out"); // A kept charge is money going out.
  assert.equal(charge.source, "bank"); // A statement line is marked as coming from the bank.
  assert.equal(charge.id, charge.rowHash); // The id and the re-import fingerprint are the same kept-line mark.
  assert.equal("balance" in charge, false); // The charge has no balance field.
  assert.equal("accountNumber" in charge, false); // The charge has no account number field.
}); // Ends the keep test.

test("keeps another outgoing shop the same way", (): void => { // The filter is not a list of allowed shops.
  const charge = kept("2026-03-04 | AMAZON PRIME | 14.99 | USD | out"); // An outgoing Amazon line with an explicit out mark.
  assert.equal(charge.merchantRawText, "AMAZON PRIME"); // The shop text is kept.
  assert.equal(charge.amount, 14.99); // The amount is kept.
  assert.equal(charge.currency, "USD"); // The currency is kept.
  assert.equal(charge.date, "2026-03-04"); // The date is kept.
}); // Ends the second keep test.

test("drops a balance line", (): void => { // A balance snapshot is not a charge.
  assert.equal(filterStatementLine("2026-03-01 | Ending balance | 2400.55 | USD"), null); // The balance line is dropped.
}); // Ends the balance test.

test("drops an incoming credit", (): void => { // Money coming in is not a charge.
  assert.equal(filterStatementLine("2026-03-02 | Payroll deposit | 1800.00 | USD | in"), null); // A line marked in is dropped.
  assert.equal(filterStatementLine("2026-03-02 | EMPLOYER | -1800.00 | USD"), null); // A negative amount is dropped as a credit.
}); // Ends the credit test.

test("drops a peer-to-peer transfer", (): void => { // Person-to-person payments are not merchant charges.
  assert.equal(filterStatementLine("2026-03-03 | VENMO PAYMENT JANE | 40.00 | USD"), null); // A Venmo payment is dropped.
  assert.equal(filterStatementLine("2026-03-03 | Zelle to Sam | 25.00 | USD | out"), null); // A Zelle transfer is dropped even when marked out.
}); // Ends the peer-transfer test.

test("drops a grocery charge", (): void => { // Grocery trips are everyday purchases and are not kept.
  assert.equal(filterStatementLine("2026-03-04 | TRADER JOE'S | 62.40 | USD"), null); // A Trader Joe's line is dropped.
  assert.equal(filterStatementLine("2026-03-04 | WHOLE FOODS MARKET | 18.25 | USD | out"), null); // A Whole Foods line is dropped.
}); // Ends the grocery test.

test("strips account numbers and long card numbers from the shop text", (): void => { // Secrets in the shop text are removed before a charge can come back.
  const charge = kept("2026-03-05 | NETFLIX.COM acct 111122223333 card 4111 1111 1111 1111 | 15.99 | USD"); // A good charge with an account number and a card number in the shop text.
  assert.equal(charge.merchantRawText, "NETFLIX.COM"); // The shop text comes back without those numbers.
  assert.equal(charge.merchantDisplayName, "NETFLIX.COM"); // The display name is that same cleaned shop text.
  assert.equal(charge.id.includes("111122223333"), false); // The id does not contain the account number.
  assert.equal(charge.rowHash.includes("4111111111111111"), false); // The fingerprint does not contain the card number.
  assert.equal(JSON.stringify(charge).includes("111122223333"), false); // No field on the charge contains the account number.
  assert.equal(JSON.stringify(charge).includes("4111 1111 1111 1111"), false); // No field on the charge contains the card number.
}); // Ends the strip test.

test("uses the same fingerprint when only the secret digits differ", (): void => { // A later import can match the line without keeping the account number.
  const first = kept("2026-03-06 | SPOTIFY acct 111111111111 | 11.99 | USD"); // The same shop with one account number.
  const second = kept("2026-03-06 | SPOTIFY acct 222222222222 | 11.99 | USD"); // The same shop with a different account number.
  assert.equal(first.merchantRawText, "SPOTIFY"); // The first shop text has no account number.
  assert.equal(second.merchantRawText, "SPOTIFY"); // The second shop text has no account number.
  assert.equal(first.rowHash, second.rowHash); // The fingerprint is built from the kept facts only.
}); // Ends the fingerprint test.

test("drops a line that is not a statement line", (): void => { // Text that is not date, shop, amount, and currency is dropped.
  assert.equal(filterStatementLine(""), null); // A blank line is dropped.
  assert.equal(filterStatementLine("not a statement"), null); // A sentence is dropped.
}); // Ends the junk-line test.
