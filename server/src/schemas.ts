import type { // Pulls in type names only, so this file does not run any import or mail code.
  AdvocacyPreview, // Preview shape, used to check the preview schema keys.
  AnalyzeLeakageAndHikesInput, // Empty input shape for the leakage tool.
  AnalyzeLeakageAndHikesOutput, // Finding-list shape for the leakage tool.
  Charge, // Charge shape, used to check the charge schema keys.
  Descriptor, // Descriptor shape, used to check the descriptor schema keys.
  DescriptorList, // Descriptor list shape for the descriptors resource.
  DescriptorResourceUri, // Fixed address of the descriptor resource.
  GenerateAdvocacyActionInput, // Letter-tool input shape.
  GenerateAdvocacyActionOutput, // Letter-tool output shape.
  IngestFinancialStatementInput, // Statement-tool input shape.
  IngestFinancialStatementOutput, // Statement-tool output shape.
  JsonSchema, // The JSON Schema type these objects must fit.
  LeakageFinding, // One finding shape inside the leakage output.
  Subscription, // Subscription shape, risen or steady.
  SubscriptionBase, // Shared subscription fields, used to check the shared schema keys.
  SubscriptionItemResourceUri, // Address pattern for one subscription.
  SubscriptionList, // Subscription list shape for the ledger resource.
  SubscriptionListResourceUri, // Fixed address of the subscription list.
  SubscriptionSteady, // Subscription shape when the price did not rise.
  SubscriptionWithRise, // Subscription shape when the price did rise.
  SyncBillingCommunicationsInput, // Mail-tool input shape.
  SyncBillingCommunicationsOutput, // Mail-tool output shape.
} from "./types.js"; // Points at the type file. The .js ending is what Node module rules expect.

// Proves a true/false check is true, or the checker reports an error.
type Expect<T extends true> = T; // Collapses to the check result only when that result is true.

// Names of fields that must be present on a shape.
type RequiredKeysOf<T extends object> = { // Walks each field of T.
  [K in keyof T]-?: undefined extends T[K] ? never : K; // Drops fields that are allowed to be missing.
}[keyof T]; // Leaves the union of required field names.

// True when a required-name list matches the required fields of a shape.
type KeysCover<T extends object, Keys extends readonly PropertyKey[]> = // Compares a shape with a name list.
  Exclude<RequiredKeysOf<T>, Keys[number]> extends never // True when every required field is listed.
    ? Exclude<Keys[number], RequiredKeysOf<T>> extends never // True when the list has no extra or optional names.
      ? true // Both sides match.
      : false // The list names a field that is not required.
    : false; // A required field is missing from the list.

// A calendar date as JSON Schema.
const isoDateSchema = { // Shared date rule for every YYYY-MM-DD field.
  type: "string", // A date is a string.
  format: "date", // The string must be an ISO calendar date.
  minLength: 10, // YYYY-MM-DD is ten characters.
  description: "Calendar date written as YYYY-MM-DD.", // Tells a reader how to write the date.
} as const satisfies JsonSchema; // Locks the date rule to the JSON Schema type.

// A currency code as JSON Schema.
const currencySchema = { // Shared currency rule for money fields.
  type: "string", // A currency code is a string.
  pattern: "^[A-Z]{3}$", // Requires exactly three capital letters.
  minLength: 3, // The code is three characters.
  maxLength: 3, // The code is not longer than three characters.
  description: "Three-letter ISO currency code such as USD.", // Tells a reader what the code means.
} as const satisfies JsonSchema; // Locks the currency rule to the JSON Schema type.

// Charge fields, one schema per type field.
const chargeProperties = { // Field rules for one imported money line.
  id: { // Rule for the charge id.
    type: "string", // The id is a string.
    minLength: 1, // The id cannot be empty.
    description: "Stable id for this charge.", // Says what the id is for.
  }, // Ends the id rule.
  merchantRawText: { // Rule for the original shop text.
    type: "string", // The raw text is a string.
    minLength: 1, // The raw text cannot be empty.
    description: "Shop text exactly as the source wrote it.", // Says to keep the source wording.
  }, // Ends the raw-text rule.
  merchantDisplayName: { // Rule for the readable shop name.
    type: "string", // The display name is a string.
    minLength: 1, // The display name cannot be empty.
    description: "Shop name rewritten so a person can read it.", // Says this is the friendly name.
  }, // Ends the display-name rule.
  amount: { // Rule for the money amount.
    type: "number", // The amount is a number.
    minimum: 0, // This step stores spend amounts that are zero or more.
    description: "Money amount of this line.", // Says this is the line amount.
  }, // Ends the amount rule.
  currency: currencySchema, // Reuses the three-letter currency rule.
  date: isoDateSchema, // Reuses the calendar-date rule.
  direction: { // Rule for the money direction.
    const: "out", // The only allowed direction in this step is out.
    description: "Spend only. This step does not store money coming in.", // Says why the value is fixed.
  }, // Ends the direction rule.
  source: { // Rule for where the line came from.
    enum: ["bank", "email"], // A charge comes from a bank file or from email.
    description: "Whether this line came from a bank file or from email.", // Says what the two values mean.
  }, // Ends the source rule.
  rowHash: { // Rule for the re-import fingerprint.
    type: "string", // The fingerprint is a string.
    minLength: 1, // The fingerprint cannot be empty.
    description: "Fingerprint used to recognize the same line on a later import.", // Says why the hash exists.
  }, // Ends the hash rule.
} as const satisfies Record<keyof Charge, JsonSchema>; // Requires one rule for every charge field.

// Names that a charge object must include.
const chargeRequired = [ // Required charge fields, in the same order as the type.
  "id", // The charge needs its id.
  "merchantRawText", // The charge needs the original shop text.
  "merchantDisplayName", // The charge needs the readable shop name.
  "amount", // The charge needs its amount.
  "currency", // The charge needs its currency.
  "date", // The charge needs its date.
  "direction", // The charge needs its direction.
  "source", // The charge needs its source.
  "rowHash", // The charge needs its re-import fingerprint.
] as const; // Keeps these names as exact literals for the key check.

// Fails the check if the required list drifts away from the charge type.
type _ChargeKeys = Expect<KeysCover<Charge, typeof chargeRequired>>; // Compile-time proof that the charge keys match.

// JSON Schema for one charge.
export const chargeSchema = { // The charge contract a later step can publish.
  $schema: "https://json-schema.org/draft/2020-12/schema", // Names the JSON Schema dialect.
  title: "Charge", // Names this document after the charge type.
  description: "One money line after import. It has no balance and no account number.", // Says what a charge is, and what it leaves out.
  type: "object", // A charge is a JSON object.
  properties: chargeProperties, // Uses the field rules above.
  required: chargeRequired, // Lists the fields that must be present.
  additionalProperties: false, // Blocks extra fields such as an account number.
} as const satisfies JsonSchema; // Locks the charge document to the JSON Schema type.

// Descriptor fields.
const descriptorProperties = { // Field rules for one bank-text pair.
  rawBankText: { // Rule for the original bank text.
    type: "string", // The bank text is a string.
    minLength: 1, // The bank text cannot be empty.
    description: "Shop text exactly as the bank printed it.", // Says to keep the bank wording.
  }, // Ends the bank-text rule.
  displayName: { // Rule for the readable shop name.
    type: "string", // The display name is a string.
    minLength: 1, // The display name cannot be empty.
    description: "Readable shop name for that bank text.", // Says this is the friendly name.
  }, // Ends the display-name rule.
} as const satisfies Record<keyof Descriptor, JsonSchema>; // Requires one rule for every descriptor field.

// Names that a descriptor object must include.
const descriptorRequired = [ // Required descriptor fields.
  "rawBankText", // The pair needs the bank text.
  "displayName", // The pair needs the readable name.
] as const; // Keeps these names as exact literals.

// Fails the check if the descriptor keys drift.
type _DescriptorKeys = Expect<KeysCover<Descriptor, typeof descriptorRequired>>; // Compile-time proof that the descriptor keys match.

// JSON Schema for one descriptor.
export const descriptorSchema = { // The descriptor contract.
  $schema: "https://json-schema.org/draft/2020-12/schema", // Names the JSON Schema dialect.
  title: "Descriptor", // Names this document after the descriptor type.
  description: "Raw bank text paired with a readable shop name. Served at leaklock://descriptors.", // Points at the descriptor resource.
  type: "object", // A descriptor is a JSON object.
  properties: descriptorProperties, // Uses the field rules above.
  required: descriptorRequired, // Lists the fields that must be present.
  additionalProperties: false, // Blocks extra fields.
} as const satisfies JsonSchema; // Locks the descriptor document to the JSON Schema type.

// Last four card digits, or null.
const cardLastFourSchema = { // Rule for the optional card ending.
  description: "Last four card digits, or null when they are unknown.", // Says the field is a card ending or empty.
  oneOf: [ // Allows either four digits or null.
    { // The four-digit branch.
      type: "string", // The ending is a string when it is known.
      pattern: "^[0-9]{4}$", // Requires exactly four digits.
      minLength: 4, // The ending is four characters.
      maxLength: 4, // The ending is not longer than four characters.
      description: "Exactly four digits.", // Says no letters or spaces are allowed.
    }, // Ends the four-digit branch.
    { // The unknown branch.
      type: "null", // Null means the card ending is unknown.
      description: "Unknown card ending.", // Says why null is allowed.
    }, // Ends the unknown branch.
  ], // Ends the two allowed branches.
} as const satisfies JsonSchema; // Locks the card rule to the JSON Schema type.

// A date, or null when there is no trial end.
const trialEndDateSchema = { // Rule for the trial end.
  description: "Trial end date as YYYY-MM-DD, or null when there is no trial end.", // Says what the field holds.
  oneOf: [ // Allows either a date or null.
    isoDateSchema, // Reuses the calendar-date rule.
    { // The empty branch.
      type: "null", // Null means there is no trial end.
      description: "No trial end date.", // Says why null is allowed.
    }, // Ends the empty branch.
  ], // Ends the two allowed branches.
} as const satisfies JsonSchema; // Locks the trial-end rule to the JSON Schema type.

// Ids of supporting charges.
const chargeIdListSchema = { // Rule for the charge-id list.
  type: "array", // The support list is an array.
  items: { // Each item is one charge id.
    type: "string", // A charge id is a string.
    minLength: 1, // A charge id cannot be empty.
    description: "Id of a charge that supports this match.", // Says what each id points at.
  }, // Ends the item rule.
  uniqueItems: true, // The same charge id is listed once.
  description: "Charge ids that support this subscription.", // Says what the list is for.
} as const satisfies JsonSchema; // Locks the charge-id list to the JSON Schema type.

// Ids of supporting emails.
const emailIdListSchema = { // Rule for the email-id list.
  type: "array", // The support list is an array.
  items: { // Each item is one email id.
    type: "string", // An email id is a string.
    minLength: 1, // An email id cannot be empty.
    description: "Id of an email that supports this match.", // Says what each id points at.
  }, // Ends the item rule.
  uniqueItems: true, // The same email id is listed once.
  description: "Email ids that support this subscription.", // Says what the list is for.
} as const satisfies JsonSchema; // Locks the email-id list to the JSON Schema type.

// Subscription fields that do not depend on a price rise.
const sharedSubscriptionProperties = { // Field rules shared by both subscription branches.
  id: { // Rule for the subscription id.
    type: "string", // The id is a string.
    minLength: 1, // The id cannot be empty.
    description: "Stable id for this subscription.", // Says what the id is for.
  }, // Ends the id rule.
  merchantName: { // Rule for the shop name.
    type: "string", // The shop name is a string.
    minLength: 1, // The shop name cannot be empty.
    description: "Readable shop name for this subscription.", // Says this is the friendly shop name.
  }, // Ends the shop-name rule.
  amount: { // Rule for the current amount.
    type: "number", // The amount is a number.
    minimum: 0, // The current amount is zero or more.
    description: "Current money amount charged each cycle.", // Says this is the live price.
  }, // Ends the amount rule.
  currency: currencySchema, // Reuses the three-letter currency rule.
  cycle: { // Rule for the repeat period.
    enum: ["weekly", "monthly", "annual"], // The shop repeats weekly, monthly, or yearly.
    description: "How often the shop charges.", // Says what the cycle means.
  }, // Ends the cycle rule.
  source: { // Rule for the evidence source.
    enum: ["bank", "email", "both"], // Support can be bank, email, or both.
    description: "Whether bank lines, email, or both support the match. Bank with no email is still valid.", // Says a bank-only match counts.
  }, // Ends the source rule.
  lastChargeDate: isoDateSchema, // Reuses the calendar-date rule for the last charge.
  nextPredictedDate: isoDateSchema, // Reuses the calendar-date rule for the next guess.
  confidence: { // Rule for how sure the match is.
    enum: ["candidate", "active"], // The match is a guess or it is trusted.
    description: "Whether the match is still a guess or is already trusted.", // Says what the two values mean.
  }, // Ends the confidence rule.
  status: { // Rule for the life stage.
    enum: ["trial", "active", "paused", "cancelled"], // The four life stages of a subscription.
    description: "Whether the subscription is in trial, active, paused, or cancelled.", // Says what the status means.
  }, // Ends the status rule.
  trialEndDate: trialEndDateSchema, // Uses the date-or-null trial rule.
  cardLastFour: cardLastFourSchema, // Uses the four-digit-or-null card rule.
  chargeIds: chargeIdListSchema, // Uses the charge-id list rule.
  emailIds: emailIdListSchema, // Uses the email-id list rule.
} as const satisfies Record<keyof SubscriptionBase, JsonSchema>; // Requires one rule for every shared subscription field.

// Required names shared by both subscription branches.
const sharedSubscriptionRequired = [ // Required shared fields.
  "id", // The subscription needs its id.
  "merchantName", // The subscription needs its shop name.
  "amount", // The subscription needs its current amount.
  "currency", // The subscription needs its currency.
  "cycle", // The subscription needs its cycle.
  "source", // The subscription needs its evidence source.
  "lastChargeDate", // The subscription needs its last charge date.
  "nextPredictedDate", // The subscription needs its next predicted date.
  "confidence", // The subscription needs its confidence.
  "status", // The subscription needs its status.
  "trialEndDate", // The subscription needs a trial end or null.
  "cardLastFour", // The subscription needs four digits or null.
  "chargeIds", // The subscription needs its charge-id list.
  "emailIds", // The subscription needs its email-id list.
] as const; // Keeps these names as exact literals.

// Fails the check if the shared subscription keys drift.
type _SharedKeys = Expect<KeysCover<SubscriptionBase, typeof sharedSubscriptionRequired>>; // Compile-time proof for the shared fields.

// Fields for a subscription whose price rose.
const risenProperties = { // Field rules for a risen subscription.
  ...sharedSubscriptionProperties, // Copies the shared subscription fields.
  priceRise: { // Rule for the rise flag when the price went up.
    const: true, // True means the price rose.
    description: "True because the price went up.", // Says why this branch is true.
  }, // Ends the true flag rule.
  oldAmount: { // Rule for the earlier amount.
    type: "number", // The old amount is a number.
    minimum: 0, // The old amount is zero or more.
    description: "Amount before the rise.", // Says this is the previous price.
  }, // Ends the old-amount rule.
  newAmount: { // Rule for the later amount.
    type: "number", // The new amount is a number.
    minimum: 0, // The new amount is zero or more.
    description: "Amount after the rise.", // Says this is the new price.
  }, // Ends the new-amount rule.
  percent: { // Rule for the percent change.
    type: "number", // The percent is a number.
    exclusiveMinimum: 0, // A rise is a percent above zero.
    description: "Percent change from the old amount to the new amount.", // Says how to read the percent.
  }, // Ends the percent rule.
} as const satisfies Record<keyof SubscriptionWithRise, JsonSchema>; // Requires one rule for every risen-subscription field.

// Required names for a risen subscription.
const risenRequired = [ // Required fields when the price rose.
  ...sharedSubscriptionRequired, // Includes every shared required name.
  "priceRise", // The rise flag must be present.
  "oldAmount", // The old amount must be present.
  "newAmount", // The new amount must be present.
  "percent", // The percent must be present.
] as const; // Keeps these names as exact literals.

// Fails the check if the risen-subscription keys drift.
type _RisenKeys = Expect<KeysCover<SubscriptionWithRise, typeof risenRequired>>; // Compile-time proof for the risen branch.

// Fields for a subscription whose price stayed put.
const steadyProperties = { // Field rules for a steady subscription.
  ...sharedSubscriptionProperties, // Copies the shared subscription fields.
  priceRise: { // Rule for the rise flag when the price stayed put.
    const: false, // False means the price did not rise.
    description: "False because the price did not rise.", // Says why this branch is false.
  }, // Ends the false flag rule.
  oldAmount: { // Rule for the empty old amount.
    type: "null", // Null because there was no earlier price to compare.
    description: "No old amount, because there was no rise.", // Says why this is null.
  }, // Ends the empty old-amount rule.
  newAmount: { // Rule for the empty new amount.
    type: "null", // Null because there was no new price.
    description: "No new amount, because there was no rise.", // Says why this is null.
  }, // Ends the empty new-amount rule.
  percent: { // Rule for the empty percent.
    type: "null", // Null because there was no percent change.
    description: "No percent, because there was no rise.", // Says why this is null.
  }, // Ends the empty percent rule.
} as const satisfies Record<keyof SubscriptionSteady, JsonSchema>; // Requires one rule for every steady-subscription field.

// Required names for a steady subscription.
const steadyRequired = [ // Required fields when the price did not rise.
  ...sharedSubscriptionRequired, // Includes every shared required name.
  "priceRise", // The rise flag must be present.
  "oldAmount", // The old amount must be present, as null.
  "newAmount", // The new amount must be present, as null.
  "percent", // The percent must be present, as null.
] as const; // Keeps these names as exact literals.

// Fails the check if the steady-subscription keys drift.
type _SteadyKeys = Expect<KeysCover<SubscriptionSteady, typeof steadyRequired>>; // Compile-time proof for the steady branch.

// JSON Schema for one subscription. Rise numbers appear only on the true branch.
export const subscriptionSchema = { // The subscription contract.
  $schema: "https://json-schema.org/draft/2020-12/schema", // Names the JSON Schema dialect.
  title: "Subscription", // Names this document after the subscription type.
  description: "A repeating payment. Rise amounts are present only when priceRise is true. One item is served at leaklock://ledger/subscriptions/{id}.", // Points at the one-subscription resource.
  oneOf: [ // A subscription matches exactly one of the two branches.
    { // The risen-price branch.
      type: "object", // This branch is a JSON object.
      properties: risenProperties, // Uses the risen field rules.
      required: risenRequired, // Lists the fields this branch must include.
      additionalProperties: false, // Blocks extra fields on this branch.
    }, // Ends the risen-price branch.
    { // The steady-price branch.
      type: "object", // This branch is a JSON object.
      properties: steadyProperties, // Uses the steady field rules.
      required: steadyRequired, // Lists the fields this branch must include.
      additionalProperties: false, // Blocks extra fields on this branch.
    }, // Ends the steady-price branch.
  ], // Ends the two subscription branches.
} as const satisfies JsonSchema; // Locks the subscription document to the JSON Schema type.

// Touches the subscription union so the schema stays tied to that type name.
type _SubscriptionSchemaMatchesUnion = Expect<Subscription extends SubscriptionWithRise | SubscriptionSteady ? true : false>; // Proves the public union is the two branches.

// JSON Schema for the descriptor list resource.
export const descriptorListSchema = { // The body of leaklock://descriptors.
  $schema: "https://json-schema.org/draft/2020-12/schema", // Names the JSON Schema dialect.
  title: "DescriptorList", // Names this document after the list type.
  description: "Every descriptor, served at leaklock://descriptors.", // Puts the resource address in the description.
  type: "array", // The resource body is an array.
  items: descriptorSchema, // Each item is one descriptor.
} as const satisfies JsonSchema; // Locks the list document to the JSON Schema type.

// Fails the check if the list schema is not aimed at the descriptor list type.
type _DescriptorListIsArray = Expect<DescriptorList extends Descriptor[] ? true : false>; // Proves the list type is an array of descriptors.

// JSON Schema for the subscription list resource.
export const subscriptionListSchema = { // The body of leaklock://ledger/subscriptions.
  $schema: "https://json-schema.org/draft/2020-12/schema", // Names the JSON Schema dialect.
  title: "SubscriptionList", // Names this document after the list type.
  description: "Every subscription, served at leaklock://ledger/subscriptions.", // Puts the resource address in the description.
  type: "array", // The resource body is an array.
  items: subscriptionSchema, // Each item is one subscription.
} as const satisfies JsonSchema; // Locks the list document to the JSON Schema type.

// Fails the check if the list schema is not aimed at the subscription list type.
type _SubscriptionListIsArray = Expect<SubscriptionList extends Subscription[] ? true : false>; // Proves the list type is an array of subscriptions.

// The descriptors resource.
export const descriptorsResource = { // Resource entry for the descriptor list.
  uri: "leaklock://descriptors" as DescriptorResourceUri, // The fixed address of this resource.
  name: "descriptors", // Short name an MCP client can show.
  description: "Read leaklock://descriptors for raw bank text and the readable shop name paired with it.", // Says what the address returns.
  mimeType: "application/json" as const, // The body is JSON.
  schema: descriptorListSchema, // The body matches the descriptor list schema.
}; // Ends the descriptors resource.

// The subscription list resource.
export const subscriptionsResource = { // Resource entry for every subscription.
  uri: "leaklock://ledger/subscriptions" as SubscriptionListResourceUri, // The fixed address of this resource.
  name: "subscriptions", // Short name an MCP client can show.
  description: "Read leaklock://ledger/subscriptions for every subscription in the ledger.", // Says what the address returns.
  mimeType: "application/json" as const, // The body is JSON.
  schema: subscriptionListSchema, // The body matches the subscription list schema.
}; // Ends the subscription list resource.

// The one-subscription resource.
export const subscriptionItemResource = { // Resource entry for a single subscription.
  uri: "leaklock://ledger/subscriptions/{id}" as SubscriptionItemResourceUri, // The address pattern, with {id} standing in for one subscription id.
  name: "subscription", // Short name an MCP client can show.
  description: "Read leaklock://ledger/subscriptions/{id} for one subscription. Replace {id} with that subscription's id.", // Says how to fill in the address.
  mimeType: "application/json" as const, // The body is JSON.
  schema: subscriptionSchema, // The body matches one subscription.
}; // Ends the one-subscription resource.

// The three resources, in the order a reader meets them.
export const mcpResources = [ // The resource list for this step.
  descriptorsResource, // The descriptor list.
  subscriptionsResource, // The subscription list.
  subscriptionItemResource, // One subscription by id.
] as const; // Keeps the list fixed.

// Statement-tool input fields.
const ingestInputProperties = { // Field rules for reading a statement.
  file_path: { // Rule for the file location.
    type: "string", // The path is a string.
    minLength: 1, // The path cannot be empty.
    description: "Local path of the statement file to read.", // Says which file the tool would open later.
  }, // Ends the path rule.
  bank_template_hint: { // Rule for the optional layout hint.
    type: "string", // The hint is a string when it is sent.
    minLength: 1, // A hint, when present, cannot be empty.
    description: "Optional hint about which bank layout the file uses.", // Says the hint is optional layout help.
  }, // Ends the hint rule.
} as const satisfies Record<keyof IngestFinancialStatementInput, JsonSchema>; // Requires a rule for every input field, including the optional one.

// Names the statement tool always needs.
const ingestInputRequired = [ // Required statement-tool fields.
  "file_path", // The file path is required.
] as const; // Keeps the name as an exact literal. The layout hint stays optional.

// Fails the check if the statement input keys drift.
type _IngestInputKeys = Expect<KeysCover<IngestFinancialStatementInput, typeof ingestInputRequired>>; // Compile-time proof for the statement input.

// JSON Schema for the statement-tool input.
export const ingestFinancialStatementInputSchema = { // Input contract for ingest_financial_statement.
  $schema: "https://json-schema.org/draft/2020-12/schema", // Names the JSON Schema dialect.
  title: "IngestFinancialStatementInput", // Names this document after the input type.
  description: "Input for ingest_financial_statement. It asks for a file path and an optional bank layout hint.", // Says what the tool accepts.
  type: "object", // The input is a JSON object.
  properties: ingestInputProperties, // Uses the field rules above.
  required: ingestInputRequired, // The file path is required. The hint is not.
  additionalProperties: false, // Blocks extra fields.
} as const satisfies JsonSchema; // Locks the input document to the JSON Schema type.

// Statement-tool output fields. There is no balance and no account number.
const ingestOutputProperties = { // Field rules for the statement summary.
  file_name: { // Rule for the file name.
    type: "string", // The file name is a string.
    minLength: 1, // The file name cannot be empty.
    description: "File name only, not the full path.", // Says to leave the directory off.
  }, // Ends the file-name rule.
  rows_kept: { // Rule for the kept-row count.
    type: "integer", // The count is a whole number.
    minimum: 0, // The count cannot be negative.
    description: "How many data rows were kept.", // Says what the count means.
  }, // Ends the kept-count rule.
  rows_skipped: { // Rule for the skipped-row count.
    type: "integer", // The count is a whole number.
    minimum: 0, // The count cannot be negative.
    description: "How many data rows were ignored.", // Says what the count means.
  }, // Ends the skipped-count rule.
  merchant_names: { // Rule for the shop-name list.
    type: "array", // The names are an array.
    items: { // Each item is one shop name.
      type: "string", // A shop name is a string.
      minLength: 1, // A shop name cannot be empty.
      description: "One readable shop name from the kept rows.", // Says what each item is.
    }, // Ends the item rule.
    uniqueItems: true, // The same shop name is listed once.
    description: "Readable shop names found in the kept rows.", // Says what the list is for.
  }, // Ends the shop-name list rule.
  earliest_date: isoDateSchema, // Reuses the calendar-date rule for the oldest kept row.
  latest_date: isoDateSchema, // Reuses the calendar-date rule for the newest kept row.
} as const satisfies Record<keyof IngestFinancialStatementOutput, JsonSchema>; // Requires one rule for every summary field.

// Names the statement summary must include.
const ingestOutputRequired = [ // Required summary fields.
  "file_name", // The summary needs the file name.
  "rows_kept", // The summary needs the kept count.
  "rows_skipped", // The summary needs the skipped count.
  "merchant_names", // The summary needs the shop names.
  "earliest_date", // The summary needs the oldest date.
  "latest_date", // The summary needs the newest date.
] as const; // Keeps these names as exact literals.

// Fails the check if the statement output keys drift.
type _IngestOutputKeys = Expect<KeysCover<IngestFinancialStatementOutput, typeof ingestOutputRequired>>; // Compile-time proof for the statement summary.

// JSON Schema for the statement-tool output.
export const ingestFinancialStatementOutputSchema = { // Output contract for ingest_financial_statement.
  $schema: "https://json-schema.org/draft/2020-12/schema", // Names the JSON Schema dialect.
  title: "IngestFinancialStatementOutput", // Names this document after the output type.
  description: "Summary for ingest_financial_statement. It has the file name, row counts, shop names, and date span. It has no balances and no account numbers.", // Says what the summary includes and leaves out.
  type: "object", // The summary is a JSON object.
  properties: ingestOutputProperties, // Uses the field rules above.
  required: ingestOutputRequired, // Lists the fields that must be present.
  additionalProperties: false, // Blocks balances, account numbers, and any other extra field.
} as const satisfies JsonSchema; // Locks the summary document to the JSON Schema type.

// The statement tool, input and output together.
export const ingestFinancialStatementTool = { // Tool entry for statement import.
  name: "ingest_financial_statement" as const, // The tool name an MCP client calls.
  description: "Read one local statement file and return a short summary. The summary has no balances and no account numbers.", // Says what the tool is for.
  inputSchema: ingestFinancialStatementInputSchema, // The input contract.
  outputSchema: ingestFinancialStatementOutputSchema, // The output contract.
}; // Ends the statement tool.

// Mail-tool input fields. There is no auth token.
const syncInputProperties = { // Field rules for a mail scan.
  provider: { // Rule for the mailbox kind.
    enum: ["gmail", "imap"], // The mailbox is Gmail or IMAP.
    description: "Which mailbox to read. This input has no auth token.", // Says the login secret is not part of the input.
  }, // Ends the provider rule.
  days_back: { // Rule for the lookback.
    type: "integer", // The lookback is a whole number of days.
    minimum: 0, // Zero days is the smallest allowed lookback.
    description: "How many days of mail to look through, counting back from today.", // Says what the number means.
  }, // Ends the lookback rule.
} as const satisfies Record<keyof SyncBillingCommunicationsInput, JsonSchema>; // Requires a rule for every mail input field.

// Names the mail tool always needs.
const syncInputRequired = [ // Required mail-tool fields.
  "provider", // The mailbox kind is required.
  "days_back", // The lookback is required.
] as const; // Keeps these names as exact literals.

// Fails the check if the mail input keys drift.
type _SyncInputKeys = Expect<KeysCover<SyncBillingCommunicationsInput, typeof syncInputRequired>>; // Compile-time proof for the mail input.

// JSON Schema for the mail-tool input.
export const syncBillingCommunicationsInputSchema = { // Input contract for sync_billing_communications.
  $schema: "https://json-schema.org/draft/2020-12/schema", // Names the JSON Schema dialect.
  title: "SyncBillingCommunicationsInput", // Names this document after the input type.
  description: "Input for sync_billing_communications. It asks for a mailbox kind and a day count. It has no auth token.", // Says the token is intentionally absent.
  type: "object", // The input is a JSON object.
  properties: syncInputProperties, // Uses the field rules above.
  required: syncInputRequired, // Lists the fields that must be present.
  additionalProperties: false, // Blocks an auth token or any other extra field.
} as const satisfies JsonSchema; // Locks the input document to the JSON Schema type.

// Mail-tool output fields.
const syncOutputProperties = { // Field rules for the mail summary.
  messages_scanned: { // Rule for the scanned count.
    type: "integer", // The count is a whole number.
    minimum: 0, // The count cannot be negative.
    description: "How many messages were opened during the scan.", // Says what the count means.
  }, // Ends the scanned-count rule.
  billing_messages_kept: { // Rule for the kept-bill count.
    type: "integer", // The count is a whole number.
    minimum: 0, // The count cannot be negative.
    description: "How many of those messages looked like bills.", // Says what the count means.
  }, // Ends the kept-count rule.
  earliest_date: isoDateSchema, // Reuses the calendar-date rule for the oldest kept bill.
  latest_date: isoDateSchema, // Reuses the calendar-date rule for the newest kept bill.
} as const satisfies Record<keyof SyncBillingCommunicationsOutput, JsonSchema>; // Requires one rule for every mail summary field.

// Names the mail summary must include.
const syncOutputRequired = [ // Required mail-summary fields.
  "messages_scanned", // The summary needs the scanned count.
  "billing_messages_kept", // The summary needs the kept-bill count.
  "earliest_date", // The summary needs the start of the date range.
  "latest_date", // The summary needs the end of the date range.
] as const; // Keeps these names as exact literals.

// Fails the check if the mail output keys drift.
type _SyncOutputKeys = Expect<KeysCover<SyncBillingCommunicationsOutput, typeof syncOutputRequired>>; // Compile-time proof for the mail summary.

// JSON Schema for the mail-tool output.
export const syncBillingCommunicationsOutputSchema = { // Output contract for sync_billing_communications.
  $schema: "https://json-schema.org/draft/2020-12/schema", // Names the JSON Schema dialect.
  title: "SyncBillingCommunicationsOutput", // Names this document after the output type.
  description: "Summary for sync_billing_communications. It has messages scanned, billing messages kept, and the date range.", // Says what the summary includes.
  type: "object", // The summary is a JSON object.
  properties: syncOutputProperties, // Uses the field rules above.
  required: syncOutputRequired, // Lists the fields that must be present.
  additionalProperties: false, // Blocks extra fields.
} as const satisfies JsonSchema; // Locks the summary document to the JSON Schema type.

// The mail tool, input and output together.
export const syncBillingCommunicationsTool = { // Tool entry for the billing-mail scan.
  name: "sync_billing_communications" as const, // The tool name an MCP client calls.
  description: "Scan recent billing mail and return a short summary. The input has no auth token.", // Says what the tool is for.
  inputSchema: syncBillingCommunicationsInputSchema, // The input contract.
  outputSchema: syncBillingCommunicationsOutputSchema, // The output contract.
}; // Ends the mail tool.

// One finding kind, with a sentence for each value.
const leakageKindSchema = { // Rule for the finding kind.
  description: "Why this subscription was listed.", // Says the kind names the reason category.
  oneOf: [ // Exactly one kind matches.
    { // The repeating-charge kind.
      const: "recurring", // Marks a subscription that repeats.
      description: "The charges repeat on a cycle.", // Says what recurring means.
    }, // Ends the recurring kind.
    { // The price-rise kind.
      const: "price_rise", // Marks a subscription whose amount went up.
      description: "The amount went up.", // Says what price_rise means.
    }, // Ends the price-rise kind.
    { // The email-only kind.
      const: "check_email_only", // Marks billing mail with no bank post.
      description: "A billing email has no matching bank post.", // Says what check_email_only means.
    }, // Ends the email-only kind.
    { // The bank-only kind.
      const: "bank_only", // Marks a bank subscription with no email.
      description: "A bank subscription has no email, and that is still a valid subscription.", // Says bank_only still counts.
    }, // Ends the bank-only kind.
  ], // Ends the four kinds.
} as const satisfies JsonSchema; // Locks the kind rule to the JSON Schema type.

// Finding fields.
const leakageFindingProperties = { // Field rules for one finding.
  subscription_id: { // Rule for the subscription id.
    type: "string", // The id is a string.
    minLength: 1, // The id cannot be empty.
    description: "Which subscription this finding is about.", // Says the id points at a subscription.
  }, // Ends the id rule.
  kind: leakageKindSchema, // Uses the four-kind rule.
  reason: { // Rule for the one-line explanation.
    type: "string", // The reason is a string.
    minLength: 1, // The reason cannot be empty.
    pattern: "^[^\\n\\r]+$", // Keeps the reason to a single line.
    description: "One line explaining why this finding was raised.", // Says the reason is a single sentence.
  }, // Ends the reason rule.
} as const satisfies Record<keyof LeakageFinding, JsonSchema>; // Requires one rule for every finding field.

// Names a finding must include.
const leakageFindingRequired = [ // Required finding fields.
  "subscription_id", // A finding needs its subscription id.
  "kind", // A finding needs its kind.
  "reason", // A finding needs its one-line reason.
] as const; // Keeps these names as exact literals.

// Fails the check if the finding keys drift.
type _FindingKeys = Expect<KeysCover<LeakageFinding, typeof leakageFindingRequired>>; // Compile-time proof for one finding.

// JSON Schema for an empty leakage-tool input.
export const analyzeLeakageAndHikesInputSchema = { // Input contract for analyze_leakage_and_hikes.
  $schema: "https://json-schema.org/draft/2020-12/schema", // Names the JSON Schema dialect.
  title: "AnalyzeLeakageAndHikesInput", // Names this document after the input type.
  description: "Input for analyze_leakage_and_hikes. This tool takes no fields.", // Says the caller sends an empty object.
  type: "object", // The input is a JSON object.
  properties: {}, // There are no input fields.
  required: [], // Nothing is required, because there are no fields.
  additionalProperties: false, // Blocks any argument the caller might add.
} as const satisfies JsonSchema; // Locks the empty input to the JSON Schema type.

// Fails the check if someone adds a required field to the empty input.
type _AnalyzeInputKeys = Expect<KeysCover<AnalyzeLeakageAndHikesInput, readonly []>>; // Compile-time proof that the leakage tool takes nothing.

// Leakage-tool output fields.
const analyzeOutputProperties = { // Field rules for the finding list.
  findings: { // Rule for the list itself.
    type: "array", // The findings are an array.
    items: { // Each item is one finding.
      type: "object", // A finding is a JSON object.
      properties: leakageFindingProperties, // Uses the finding field rules.
      required: leakageFindingRequired, // Lists the fields a finding must include.
      additionalProperties: false, // Blocks extra fields on a finding.
    }, // Ends the item rule.
    description: "Subscription ids with a kind and a one-line reason. Email with no bank post is check_email_only. A bank subscription with no email is bank_only and is still valid.", // Says how to read the two gap kinds.
  }, // Ends the list rule.
} as const satisfies Record<keyof AnalyzeLeakageAndHikesOutput, JsonSchema>; // Requires one rule for every output field.

// Names the leakage output must include.
const analyzeOutputRequired = [ // Required leakage-output fields.
  "findings", // The output needs the finding list.
] as const; // Keeps the name as an exact literal.

// Fails the check if the leakage output keys drift.
type _AnalyzeOutputKeys = Expect<KeysCover<AnalyzeLeakageAndHikesOutput, typeof analyzeOutputRequired>>; // Compile-time proof for the leakage output.

// JSON Schema for the leakage-tool output.
export const analyzeLeakageAndHikesOutputSchema = { // Output contract for analyze_leakage_and_hikes.
  $schema: "https://json-schema.org/draft/2020-12/schema", // Names the JSON Schema dialect.
  title: "AnalyzeLeakageAndHikesOutput", // Names this document after the output type.
  description: "Output for analyze_leakage_and_hikes. A list of subscription ids, each with kind recurring, price_rise, check_email_only, or bank_only, plus a one-line reason.", // Says what the list contains.
  type: "object", // The output is a JSON object.
  properties: analyzeOutputProperties, // Uses the field rules above.
  required: analyzeOutputRequired, // The findings list must be present.
  additionalProperties: false, // Blocks extra fields.
} as const satisfies JsonSchema; // Locks the output document to the JSON Schema type.

// The leakage tool, input and output together.
export const analyzeLeakageAndHikesTool = { // Tool entry for the leakage check.
  name: "analyze_leakage_and_hikes" as const, // The tool name an MCP client calls.
  description: "List subscription leaks and price rises. Email with no bank post is check_email_only. A bank subscription with no email is bank_only and is still valid.", // Says how the two gap kinds should be read.
  inputSchema: analyzeLeakageAndHikesInputSchema, // The empty input contract.
  outputSchema: analyzeLeakageAndHikesOutputSchema, // The finding-list contract.
}; // Ends the leakage tool.

// Letter-tool input fields.
const advocacyInputProperties = { // Field rules for drafting a letter.
  merchant_name: { // Rule for the shop name.
    type: "string", // The shop name is a string.
    minLength: 1, // The shop name cannot be empty.
    description: "Readable shop name the letter is about.", // Says which shop the letter names.
  }, // Ends the shop-name rule.
  action_type: { // Rule for the letter kind.
    enum: ["cancel", "dispute_hike"], // The letter either cancels or disputes a rise.
    description: "Whether the letter asks the shop to cancel or disputes a price rise.", // Says what the two values mean.
  }, // Ends the letter-kind rule.
} as const satisfies Record<keyof GenerateAdvocacyActionInput, JsonSchema>; // Requires a rule for every letter input field.

// Names the letter tool always needs.
const advocacyInputRequired = [ // Required letter-tool fields.
  "merchant_name", // The shop name is required.
  "action_type", // The letter kind is required.
] as const; // Keeps these names as exact literals.

// Fails the check if the letter input keys drift.
type _AdvocacyInputKeys = Expect<KeysCover<GenerateAdvocacyActionInput, typeof advocacyInputRequired>>; // Compile-time proof for the letter input.

// JSON Schema for the letter-tool input.
export const generateAdvocacyActionInputSchema = { // Input contract for generate_advocacy_action.
  $schema: "https://json-schema.org/draft/2020-12/schema", // Names the JSON Schema dialect.
  title: "GenerateAdvocacyActionInput", // Names this document after the input type.
  description: "Input for generate_advocacy_action. It asks for a shop name and a letter kind of cancel or dispute_hike.", // Says what the tool accepts.
  type: "object", // The input is a JSON object.
  properties: advocacyInputProperties, // Uses the field rules above.
  required: advocacyInputRequired, // Lists the fields that must be present.
  additionalProperties: false, // Blocks extra fields.
} as const satisfies JsonSchema; // Locks the input document to the JSON Schema type.

// Preview fields. Shop, amount, and dates only.
const advocacyPreviewProperties = { // Field rules for the redacted preview.
  shop: { // Rule for the shop name.
    type: "string", // The shop name is a string.
    minLength: 1, // The shop name cannot be empty.
    description: "Readable shop name.", // Says this is the shop in the preview.
  }, // Ends the shop rule.
  amount: { // Rule for the amount.
    type: "number", // The amount is a number.
    minimum: 0, // The amount is zero or more.
    description: "Money amount named in the letter.", // Says this is the amount in the preview.
  }, // Ends the amount rule.
  dates: { // Rule for the date list.
    type: "array", // The dates are an array.
    items: isoDateSchema, // Each item reuses the calendar-date rule.
    description: "Dates named in the letter.", // Says what the list is for.
  }, // Ends the date-list rule.
} as const satisfies Record<keyof AdvocacyPreview, JsonSchema>; // Requires one rule for every preview field.

// Names the preview must include.
const advocacyPreviewRequired = [ // Required preview fields.
  "shop", // The preview needs the shop.
  "amount", // The preview needs the amount.
  "dates", // The preview needs the dates.
] as const; // Keeps these names as exact literals.

// Fails the check if the preview keys drift.
type _PreviewKeys = Expect<KeysCover<AdvocacyPreview, typeof advocacyPreviewRequired>>; // Compile-time proof for the preview.

// Letter-tool output fields. There is no account number.
const advocacyOutputProperties = { // Field rules for the letter result.
  file_path: { // Rule for the letter path.
    type: "string", // The path is a string.
    minLength: 1, // The path cannot be empty.
    description: "Path of the letter file.", // Says this is where the letter would sit.
  }, // Ends the path rule.
  preview: { // Rule for the redacted preview.
    type: "object", // The preview is a JSON object.
    properties: advocacyPreviewProperties, // Uses the shop, amount, and date rules.
    required: advocacyPreviewRequired, // The preview must include shop, amount, and dates.
    additionalProperties: false, // Blocks an account number inside the preview.
    description: "Redacted preview with the shop, the amount, and the dates. It has no account number.", // Says what the preview shows and what it leaves out.
  }, // Ends the preview rule.
} as const satisfies Record<keyof GenerateAdvocacyActionOutput, JsonSchema>; // Requires one rule for every letter output field.

// Names the letter result must include.
const advocacyOutputRequired = [ // Required letter-output fields.
  "file_path", // The result needs the letter path.
  "preview", // The result needs the redacted preview.
] as const; // Keeps these names as exact literals.

// Fails the check if the letter output keys drift.
type _AdvocacyOutputKeys = Expect<KeysCover<GenerateAdvocacyActionOutput, typeof advocacyOutputRequired>>; // Compile-time proof for the letter output.

// JSON Schema for the letter-tool output.
export const generateAdvocacyActionOutputSchema = { // Output contract for generate_advocacy_action.
  $schema: "https://json-schema.org/draft/2020-12/schema", // Names the JSON Schema dialect.
  title: "GenerateAdvocacyActionOutput", // Names this document after the output type.
  description: "Output for generate_advocacy_action. It has the letter file path and a redacted preview of shop, amount, and dates. It has no account number.", // Says what the result includes and leaves out.
  type: "object", // The result is a JSON object.
  properties: advocacyOutputProperties, // Uses the field rules above.
  required: advocacyOutputRequired, // Lists the fields that must be present.
  additionalProperties: false, // Blocks an account number or any other extra field.
} as const satisfies JsonSchema; // Locks the result document to the JSON Schema type.

// The letter tool, input and output together.
export const generateAdvocacyActionTool = { // Tool entry for letter drafting.
  name: "generate_advocacy_action" as const, // The tool name an MCP client calls.
  description: "Describe a cancel or dispute letter. The result is a file path and a redacted preview with the shop, the amount, and the dates. The preview has no account number.", // Says what the tool returns.
  inputSchema: generateAdvocacyActionInputSchema, // The input contract.
  outputSchema: generateAdvocacyActionOutputSchema, // The output contract.
}; // Ends the letter tool.

// The four tools, in the order a reader meets them.
export const mcpTools = [ // The tool list for this step.
  ingestFinancialStatementTool, // The statement summary tool.
  syncBillingCommunicationsTool, // The billing-mail summary tool.
  analyzeLeakageAndHikesTool, // The leakage and price-rise tool.
  generateAdvocacyActionTool, // The letter preview tool.
] as const; // Keeps the list fixed.

// Names every key check so the checker treats those proofs as used.
export type SchemaKeyChecks = // One exported name that gathers the compile-time proofs.
  | _ChargeKeys // Charge fields match.
  | _DescriptorKeys // Descriptor fields match.
  | _SharedKeys // Shared subscription fields match.
  | _RisenKeys // Risen-subscription fields match.
  | _SteadyKeys // Steady-subscription fields match.
  | _SubscriptionSchemaMatchesUnion // The public subscription type is the two branches.
  | _DescriptorListIsArray // The descriptor resource body is a descriptor array.
  | _SubscriptionListIsArray // The ledger resource body is a subscription array.
  | _IngestInputKeys // Statement input fields match.
  | _IngestOutputKeys // Statement summary fields match.
  | _SyncInputKeys // Mail input fields match.
  | _SyncOutputKeys // Mail summary fields match.
  | _FindingKeys // Finding fields match.
  | _AnalyzeInputKeys // The leakage tool still takes no fields.
  | _AnalyzeOutputKeys // Leakage output fields match.
  | _AdvocacyInputKeys // Letter input fields match.
  | _PreviewKeys // Preview fields match.
  | _AdvocacyOutputKeys; // Letter output fields match.
