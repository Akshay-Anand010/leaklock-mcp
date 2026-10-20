import type { Charge } from "./types.ts"; // The charge shape from step 1. This file does not declare that shape again.

// The pieces read off one raw statement line, before the keep-or-drop rules run.
type ParsedLine = { // A line split into fields. This is not a charge.
  date: string; // The calendar date from the line, as YYYY-MM-DD.
  shop: string; // The shop text as the line wrote it, before secrets are removed.
  amount: number; // The money amount from the line.
  currency: string; // The three-letter currency code from the line.
  incoming: boolean; // True when the line is money coming in, which this filter drops.
}; // Ends the parsed-line shape.

// True when the text is a real YYYY-MM-DD calendar date.
function isIsoDate(value: string): boolean { // Rejects blank text and impossible dates such as February 31.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) { // The date must be four digits, a dash, two digits, a dash, and two digits.
    return false; // Any other writing is not a date this filter can keep.
  } // Ends the shape check.
  const [yearText, monthText, dayText] = value.split("-"); // Split the three date parts.
  const year = Number(yearText); // The year as a number.
  const month = Number(monthText); // The month as a number.
  const day = Number(dayText); // The day as a number.
  const parsed = new Date(Date.UTC(year, month - 1, day)); // Build a UTC date. Month numbers here start at zero.
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day; // True only when the calendar agrees with the text.
} // Ends the date check.

// True when the shop text is a balance snapshot rather than a purchase.
function isBalanceLine(shop: string): boolean { // Balance lines stay off the charge list.
  return /\bbalance\b/i.test(shop); // The word balance, in any letter case, marks the line.
} // Ends the balance check.

// True when the shop text is a person-to-person transfer.
function isPeerTransfer(shop: string): boolean { // Peer transfers are not merchant charges.
  return /\b(?:venmo|zelle|cash\s*app|square\s*cash|apple\s*cash|popmoney|p2p|peer(?:\s|-)?to(?:\s|-)?peer|peer\s+transfer)\b/i.test(shop); // Names the common peer-payment wording.
} // Ends the peer-transfer check.

// True when the shop text is a grocery charge.
function isGroceryCharge(shop: string): boolean { // Grocery trips are everyday purchases and are not kept.
  return /\b(?:grocery|groceries|grocer|supermarket|whole\s*foods|trader\s*joe'?s?|kroger|safeway|aldi|publix|wegmans|food\s*lion|albertsons|sprouts|lidl|instacart|heb|shoprite|vons|ralphs)\b/i.test(shop); // Names grocery words and common grocers.
} // Ends the grocery check.

// True when the direction word means money came in.
function directionIsIncoming(direction: string): boolean { // The optional last field can mark a credit.
  return direction === "in" || direction === "credit" || direction === "cr"; // These three words mean an incoming credit.
} // Ends the direction check.

// True when the direction word means money went out.
function directionIsOutgoing(direction: string): boolean { // An explicit outgoing mark is accepted.
  return direction === "out" || direction === "debit" || direction === "dr"; // These three words mean a charge.
} // Ends the outgoing check.

// True when the shop text itself says the line is a credit.
function shopIsIncoming(shop: string): boolean { // Some credits are written in the shop text.
  return /\b(?:direct deposit|payroll|ach credit|interest credit|payment received|refund)\b/i.test(shop); // These phrases are money coming in, not a shop charge.
} // Ends the credit-phrase check.

// Removes account numbers and long card numbers from shop text.
function stripSecrets(shop: string): string { // The returned shop text must not carry those numbers.
  const withoutAccounts = shop.replace(/\b(?:account(?:\s+number)?|acct\.?|a\/c|iban|routing)\b[:\s#.-]*(?:\d[ -]?){8,}/gi, " "); // Cuts a labeled account number of at least eight digits.
  const withoutCards = withoutAccounts.replace(/\b(?:card(?:\s+number)?|pan)\b[:\s#.-]*(?:\d[ -]?){12,}/gi, " "); // Cuts a labeled card number of at least twelve digits.
  const withoutGroups = withoutCards.replace(/\b\d{4}(?:[ -]\d{4}){2,}\b/g, " "); // Cuts a card number written in groups of four.
  const withoutRuns = withoutGroups.replace(/\b\d{8,}\b/g, " "); // Cuts a long unbroken digit run, which is an account or a card.
  return withoutRuns.replace(/\s+/g, " ").trim(); // Closes up the gaps left where numbers were removed.
} // Ends the secret strip.

// Builds a fingerprint from the facts that are safe to keep.
function fingerprint(text: string): string { // The same kept line always gets the same id, and the id is not the account number.
  let first = 2166136261; // Starting value for the first half of the fingerprint.
  let second = 2166136261; // Starting value for the second half of the fingerprint.
  for (const char of text) { // Walk each character of the kept facts.
    const code = char.codePointAt(0) ?? 0; // Turn that character into a number.
    first ^= code; // Mix the number into the first half.
    first = Math.imul(first, 16777619); // Spread the first half so nearby lines do not share a fingerprint.
    second ^= code; // Mix the number into the second half.
    second = Math.imul(second, 2246822519); // Spread the second half with a different step.
  } // Ends the character walk.
  const left = (first >>> 0).toString(16).padStart(8, "0"); // Write the first half as eight hex characters.
  const right = (second >>> 0).toString(16).padStart(8, "0"); // Write the second half as eight hex characters.
  return left + right; // Join the halves into one fingerprint.
} // Ends the fingerprint helper.

// Reads one raw statement line. A line that is not four or five fields comes back empty.
function parseLine(line: string): ParsedLine | null { // Turns the raw text into fields, or gives up.
  const parts = line.split("|").map((part: string): string => part.trim()); // Split on bars and trim each field.
  if (parts.length < 4 || parts.length > 5) { // A line needs date, shop, amount, and currency, and may add a direction.
    return null; // Any other shape is dropped.
  } // Ends the field-count check.
  const date = parts[0] ?? ""; // The first field is the date.
  const shop = parts[1] ?? ""; // The second field is the shop text.
  const amountText = parts[2] ?? ""; // The third field is the amount.
  const currency = parts[3] ?? ""; // The fourth field is the currency.
  const directionText = parts[4]; // The fifth field, when present, says whether money went out or came in.
  if (!isIsoDate(date)) { // Keep only a real calendar date.
    return null; // A bad date drops the line.
  } // Ends the date check.
  if (shop.length === 0) { // A line with no shop text has nothing to keep.
    return null; // Drop the empty shop.
  } // Ends the shop check.
  const amountMatch = /^\$?\s*([+-]?\d+(?:\.\d+)?)$/.exec(amountText); // Read a plain amount, with an optional dollar sign.
  if (amountMatch === null) { // The amount must be a number.
    return null; // Drop a line whose amount cannot be read.
  } // Ends the amount shape check.
  const amount = Number(amountMatch[1]); // The amount as a number.
  if (!Number.isFinite(amount)) { // Guard against a number that is not finite.
    return null; // Drop a line with an unusable amount.
  } // Ends the finite check.
  if (!/^[A-Z]{3}$/.test(currency)) { // Currency must be three capital letters, such as USD.
    return null; // Drop a line with a missing or odd currency.
  } // Ends the currency check.
  const direction = directionText === undefined ? undefined : directionText.toLowerCase(); // Compare the direction without caring about letter case.
  if (direction !== undefined && !directionIsIncoming(direction) && !directionIsOutgoing(direction)) { // An unknown direction word is not guessed.
    return null; // Drop a line whose direction word is not one this filter knows.
  } // Ends the direction-word check.
  const incoming = amount < 0 || (direction !== undefined && directionIsIncoming(direction)) || shopIsIncoming(shop); // Money coming in is a credit, a negative amount, or a credit phrase.
  return { date, shop, amount: Math.abs(amount), currency, incoming }; // Hand back the fields. The amount is stored as a positive number.
} // Ends the line reader.

// Keeps one outgoing merchant charge, or returns null when the line must be dropped.
export function filterStatementLine(line: string): Charge | null { // This is the privacy filter for a single statement line.
  const parsed = parseLine(line); // Read the date, shop, amount, currency, and direction.
  if (parsed === null) { // A line that cannot be read is dropped.
    return null; // There is no charge to return.
  } // Ends the parse check.
  if (isBalanceLine(parsed.shop)) { // Balance snapshots are not charges.
    return null; // Drop the balance line.
  } // Ends the balance rule.
  if (parsed.incoming) { // Incoming credits are not charges.
    return null; // Drop the credit.
  } // Ends the credit rule.
  if (isPeerTransfer(parsed.shop)) { // Person-to-person transfers are not merchant charges.
    return null; // Drop the peer transfer.
  } // Ends the peer rule.
  if (isGroceryCharge(parsed.shop)) { // Grocery charges are everyday purchases and are not kept.
    return null; // Drop the grocery line.
  } // Ends the grocery rule.
  const shop = stripSecrets(parsed.shop); // Remove account numbers and long card numbers from the shop text.
  if (shop.length === 0) { // If nothing but a secret was in the shop text, there is no shop left.
    return null; // Drop a line that has no shop text after the strip.
  } // Ends the empty-shop check.
  const rowHash = fingerprint(`${parsed.date}|${shop}|${parsed.amount}|${parsed.currency}`); // Fingerprint only the kept facts, so the account number is not in the id.
  const charge: Charge = { // Build a charge from the kept facts. There is no balance field and no account number field.
    id: rowHash, // The id is the fingerprint, so a later import can recognize the same kept line.
    merchantRawText: shop, // The shop text after secrets are removed.
    merchantDisplayName: shop, // The same shop text. A later step rewrites this into a friendlier name.
    amount: parsed.amount, // The money amount.
    currency: parsed.currency, // The currency code.
    date: parsed.date, // The calendar date.
    direction: "out", // Only outgoing charges reach this point.
    source: "bank", // This line came from a statement, so the source is the bank.
    rowHash: rowHash, // The same fingerprint, stored for a later import.
  }; // Ends the charge object.
  return charge; // Hand back the kept charge.
} // Ends the privacy filter.
