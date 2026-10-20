// One calendar date written as YYYY-MM-DD.
export type IsoDate = string; // A calendar date in ISO form, with the year, month, and day.

// A three-letter currency code such as USD.
export type CurrencyCode = string; // The currency of a money amount, written as three capital letters.

// Money only leaves the account in this step.
export type ChargeDirection = "out"; // This step stores spend lines only, so the direction is always out.

// Where one imported money line came from.
export type ChargeSource = // The origin of a single charge.
  | "bank" // The line was read from a bank statement.
  | "email"; // The line was read from a billing message.

// How often a subscription repeats.
export type BillingCycle = // The repeat period for a subscription.
  | "weekly" // The shop charges about once a week.
  | "monthly" // The shop charges about once a month.
  | "annual"; // The shop charges about once a year.

// Which evidence backs a subscription.
export type SubscriptionSource = // Where the subscription match found its support.
  | "bank" // Only bank lines support this subscription.
  | "email" // Only billing mail supports this subscription.
  | "both"; // Bank lines and billing mail both support this subscription.

// How sure the match is.
export type SubscriptionConfidence = // Whether the match is still a guess or is already trusted.
  | "candidate" // The match is a guess and still needs a look.
  | "active"; // The match is trusted enough to treat as a live subscription.

// Where a subscription sits in its life.
export type SubscriptionStatus = // The current life stage of a subscription.
  | "trial" // The shop is still in a free or intro trial.
  | "active" // The subscription is running and can charge.
  | "paused" // The subscription is on hold.
  | "cancelled"; // The subscription has been stopped.

// One digit, used to build a four-digit card ending.
export type Digit = // A single decimal character.
  | "0" // The digit zero.
  | "1" // The digit one.
  | "2" // The digit two.
  | "3" // The digit three.
  | "4" // The digit four.
  | "5" // The digit five.
  | "6" // The digit six.
  | "7" // The digit seven.
  | "8" // The digit eight.
  | "9"; // The digit nine.

// Exactly four digits, such as 4242.
export type CardLastFour = `${Digit}${Digit}${Digit}${Digit}`; // The last four card digits, with no extra characters.

// Stable id for one charge.
export type ChargeId = string; // The id of one money line.

// Stable id for one subscription.
export type SubscriptionId = string; // The id of one repeating payment.

// Stable id for one billing message.
export type EmailId = string; // The id of one email that can support a match.

// One money line after import.
export type Charge = { // A single spend line kept from a bank file or a billing email.
  id: ChargeId; // Stable id for this charge.
  merchantRawText: string; // Shop text exactly as the source wrote it.
  merchantDisplayName: string; // Shop name rewritten so a person can read it.
  amount: number; // Money amount of this line, as a plain number.
  currency: CurrencyCode; // Currency of that amount.
  date: IsoDate; // Calendar date of the line.
  direction: ChargeDirection; // Always out in this step, because the line is spend.
  source: ChargeSource; // Whether the line came from a bank file or from email.
  rowHash: string; // Fingerprint used to recognize the same line on a later import.
}; // Ends the charge shape.

// Raw bank text paired with a readable shop name.
export type Descriptor = { // A name pair used to turn bank text into a shop name.
  rawBankText: string; // The shop text exactly as the bank printed it.
  displayName: string; // The readable shop name for that bank text.
}; // Ends the descriptor shape.

// Fields shared by a subscription whether or not the price rose.
export type SubscriptionBase = { // The part of a subscription that does not change with a price rise.
  id: SubscriptionId; // Stable id for this subscription.
  merchantName: string; // Readable shop name for this subscription.
  amount: number; // Current money amount charged each cycle.
  currency: CurrencyCode; // Currency of that amount.
  cycle: BillingCycle; // How often the shop charges.
  source: SubscriptionSource; // Whether bank lines, email, or both support the match.
  lastChargeDate: IsoDate; // Date of the most recent supporting charge.
  nextPredictedDate: IsoDate; // Date the next charge is expected.
  confidence: SubscriptionConfidence; // Whether the match is a guess or is trusted.
  status: SubscriptionStatus; // Whether the subscription is in trial, active, paused, or cancelled.
  trialEndDate: IsoDate | null; // Trial end date, or null when there is no trial end.
  cardLastFour: CardLastFour | null; // Last four card digits, or null when they are unknown.
  chargeIds: ChargeId[]; // Ids of the charges that support this match.
  emailIds: EmailId[]; // Ids of the emails that support this match.
}; // Ends the shared subscription fields.

// A subscription whose price went up, with the old and new amounts.
export type SubscriptionWithRise = SubscriptionBase & { // Shared fields plus the rise numbers.
  priceRise: true; // True means the price went up.
  oldAmount: number; // Amount before the rise.
  newAmount: number; // Amount after the rise.
  percent: number; // Percent change from the old amount to the new amount.
}; // Ends the risen-price subscription shape.

// A subscription whose price did not rise.
export type SubscriptionSteady = SubscriptionBase & { // Shared fields plus empty rise numbers.
  priceRise: false; // False means the price did not rise.
  oldAmount: null; // No old amount, because there was no rise.
  newAmount: null; // No new amount, because there was no rise.
  percent: null; // No percent, because there was no rise.
}; // Ends the steady-price subscription shape.

// A subscription, with rise numbers only when the price actually rose.
export type Subscription = SubscriptionWithRise | SubscriptionSteady; // One subscription, either risen or steady.

// The whole descriptor list served by the descriptors resource.
export type DescriptorList = Descriptor[]; // Every raw-text and display-name pair.

// The whole subscription list served by the ledger resource.
export type SubscriptionList = Subscription[]; // Every subscription in the ledger.

// Address of the descriptor list resource.
export type DescriptorResourceUri = "leaklock://descriptors"; // The resource that returns every descriptor.

// Address of the subscription list resource.
export type SubscriptionListResourceUri = "leaklock://ledger/subscriptions"; // The resource that returns every subscription.

// Address pattern for one subscription.
export type SubscriptionItemResourceUri = "leaklock://ledger/subscriptions/{id}"; // The resource pattern for one subscription id.

// Input for reading one bank statement file.
export type IngestFinancialStatementInput = { // What the statement tool needs before it can run.
  file_path: string; // Local path of the statement file to read.
  bank_template_hint?: string; // Optional hint about which bank layout the file uses.
}; // Ends the statement-tool input.

// Summary returned after a statement import. It has no balances and no account numbers.
export type IngestFinancialStatementOutput = { // The short result of a statement import.
  file_name: string; // File name only, not the full path.
  rows_kept: number; // How many data rows were kept as charges.
  rows_skipped: number; // How many data rows were ignored.
  merchant_names: string[]; // Readable shop names found in the kept rows.
  earliest_date: IsoDate; // Oldest date among the kept rows.
  latest_date: IsoDate; // Newest date among the kept rows.
}; // Ends the statement-tool summary.

// Which mailbox the mail tool should read.
export type MailProvider = // The mailbox kind, with no login secret stored here.
  | "gmail" // Read through Gmail.
  | "imap"; // Read through a generic IMAP mailbox.

// Input for reading recent billing mail. There is no auth token field.
export type SyncBillingCommunicationsInput = { // What the mail tool needs before it can run.
  provider: MailProvider; // Which mailbox to read.
  days_back: number; // How many days of mail to look through, as a whole number.
}; // Ends the mail-tool input.

// Summary returned after a mail scan.
export type SyncBillingCommunicationsOutput = { // The short result of a billing-mail scan.
  messages_scanned: number; // How many messages were opened during the scan.
  billing_messages_kept: number; // How many of those messages looked like bills.
  earliest_date: IsoDate; // Oldest date among the kept billing messages.
  latest_date: IsoDate; // Newest date among the kept billing messages.
}; // Ends the mail-tool summary.

// What kind of leak or gap a finding describes.
export type LeakageKind = // The four finding kinds this step names.
  | "recurring" // The charges repeat on a cycle.
  | "price_rise" // The amount went up.
  | "check_email_only" // Billing mail has no matching bank post.
  | "bank_only"; // A bank subscription has no email, and that is still valid.

// One finding from the leakage check.
export type LeakageFinding = { // One subscription called out by the leakage tool.
  subscription_id: SubscriptionId; // Which subscription this finding is about.
  kind: LeakageKind; // Which kind of leak, rise, or evidence gap this is.
  reason: string; // One line explaining why this finding was raised.
}; // Ends one finding.

// The leakage tool takes no input fields.
export type AnalyzeLeakageAndHikesInput = { // An empty object, because this tool reads the ledger it already has.
}; // Ends the empty leakage-tool input.

// The leakage tool returns a list of findings.
export type AnalyzeLeakageAndHikesOutput = { // The list wrapper for leakage findings.
  findings: LeakageFinding[]; // Every recurring charge, price rise, email-only gap, and bank-only gap.
}; // Ends the leakage-tool output.

// Which letter a person wants drafted.
export type AdvocacyActionType = // The two letter kinds this step names.
  | "cancel" // A letter asking the shop to cancel.
  | "dispute_hike"; // A letter disputing a price rise.

// Input for drafting one letter.
export type GenerateAdvocacyActionInput = { // What the letter tool needs before it can run.
  merchant_name: string; // Readable shop name the letter is about.
  action_type: AdvocacyActionType; // Whether the letter cancels or disputes a rise.
}; // Ends the letter-tool input.

// The redacted letter preview. It has the shop, the amount, and the dates, and no account number.
export type AdvocacyPreview = { // The safe snippet shown before a letter is used.
  shop: string; // Readable shop name.
  amount: number; // Money amount named in the letter.
  dates: IsoDate[]; // Dates named in the letter.
}; // Ends the redacted preview.

// Where the letter file would be, plus the redacted preview.
export type GenerateAdvocacyActionOutput = { // The short result of drafting a letter.
  file_path: string; // Path of the letter file.
  preview: AdvocacyPreview; // Redacted shop, amount, and dates, with no account number.
}; // Ends the letter-tool output.

// A JSON Schema document, written as data so a later step can hand it to an MCP client.
export type JsonSchema = { // The subset of JSON Schema these tool and resource contracts use.
  readonly $schema?: string; // Which JSON Schema dialect this document follows.
  readonly $id?: string; // Optional id for this schema document.
  readonly title?: string; // Short name of the shape.
  readonly description?: string; // Plain explanation of the shape.
  readonly type?: // The JSON kind, or a list of kinds when null is allowed.
    | "object" // A JSON object.
    | "array" // A JSON array.
    | "string" // A JSON string.
    | "number" // A JSON number, whole or fractional.
    | "integer" // A whole number.
    | "boolean" // True or false.
    | "null" // JSON null.
    | readonly ( // A list of kinds, used when a field may be null.
        | "object" // Object is one allowed kind.
        | "array" // Array is one allowed kind.
        | "string" // String is one allowed kind.
        | "number" // Number is one allowed kind.
        | "integer" // Integer is one allowed kind.
        | "boolean" // Boolean is one allowed kind.
        | "null" // Null is one allowed kind.
      )[]; // Ends the list of allowed kinds.
  readonly properties?: Readonly<Record<string, JsonSchema>>; // Field schemas for an object.
  readonly required?: readonly string[]; // Field names that must be present.
  readonly additionalProperties?: boolean; // Whether fields outside the list are allowed.
  readonly items?: JsonSchema; // Schema for each item in an array.
  readonly enum?: readonly (string | number | boolean | null)[]; // The only values allowed.
  readonly const?: string | number | boolean | null; // The single value allowed.
  readonly format?: string; // A named string format such as date.
  readonly pattern?: string; // A regular expression the string must match.
  readonly minLength?: number; // Smallest allowed string length.
  readonly maxLength?: number; // Largest allowed string length.
  readonly minimum?: number; // Smallest allowed number.
  readonly exclusiveMinimum?: number; // Numbers must be greater than this.
  readonly minItems?: number; // Smallest allowed array length.
  readonly uniqueItems?: boolean; // Whether array items must be unique.
  readonly oneOf?: readonly JsonSchema[]; // Exactly one of these schemas must match.
  readonly anyOf?: readonly JsonSchema[]; // At least one of these schemas must match.
  readonly allOf?: readonly JsonSchema[]; // Every one of these schemas must match.
}; // Ends the JSON Schema shape.
