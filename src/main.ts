// Load the calm layout before any words are drawn.
import "./style.css";

// A place the helper can read.
type SourceCard = {
  // The name on the card.
  title: string;
  // What you give that place.
  gives: string;
  // Why that place is needed.
  why: string;
};

// One shop in the sample list.
type SubscriptionRow = {
  // The shop a person would recognize.
  shop: string;
  // What was noticed about it.
  noticed: string;
  // True when the price went up.
  priceJump: boolean;
  // The next likely charge, in plain words.
  next: string;
};

// One kind of leak the helper can spot.
type Finding = {
  // A short name.
  title: string;
  // One sentence of meaning.
  detail: string;
};

// One pressable action.
type ActionCard = {
  // The words on the button.
  label: string;
  // What that action means.
  detail: string;
};

// One small build step.
type BuildStep = {
  // The step name.
  name: string;
  // A plain sentence about the step.
  detail: string;
  // True only for the step we do next.
  isNext: boolean;
};

// The product name in the largest type.
const productName: string = "Subconscious";

// The short project nickname.
const projectNickname: string = "LeakLock";

// The two sources, side by side on a wide screen.
const sources: readonly SourceCard[] = [
  // The file you drop in from the bank.
  {
    // Card title.
    title: "Bank file",
    // The kinds of file you can drop in.
    gives: "A csv, xlsx, or qfx file you drop in.",
    // Why a bank file is still needed.
    why: "A gym never emails. The charge still shows up here.",
  },
  // The inbox side.
  {
    // Card title.
    title: "Email",
    // What those messages are.
    gives: "Bills and notes that a trial is ending.",
    // Why email is still needed.
    why: "Netflix always emails. The bank name may not say Netflix.",
  },
];

// A sample list, so the flow has a place to land.
const subscriptions: readonly SubscriptionRow[] = [
  // A shop that never writes, so only the bank shows it.
  {
    // Shop name.
    shop: "City Gym",
    // What we noticed.
    noticed: "Comes back every month. No email.",
    // This one is not a price jump.
    priceJump: false,
    // The next likely charge.
    next: "3 Nov · ₹1,200",
  },
  // A shop whose email and bank line agree.
  {
    // Shop name.
    shop: "Netflix",
    // What we noticed.
    noticed: "The bank line and an email agree.",
    // This one is not a price jump.
    priceJump: false,
    // The next likely charge.
    next: "12 Nov · ₹649",
  },
  // A shop that raised its price.
  {
    // Shop name.
    shop: "Photo cloud",
    // What we noticed.
    noticed: "Was ₹149. Now ₹179.",
    // This one is a price jump.
    priceJump: true,
    // The next likely charge.
    next: "21 Nov · ₹179",
  },
  // A bill that has not become a bank charge yet.
  {
    // Shop name.
    shop: "Language app",
    // What we noticed.
    noticed: "The email came. No bank charge yet.",
    // This one is not a price jump.
    priceJump: false,
    // Nothing to forecast until money moves.
    next: "Waiting",
  },
];

// The three things the helper figures out.
const findings: readonly Finding[] = [
  // A charge the person forgot.
  {
    // Finding name.
    title: "Forgotten subscriptions",
    // What that means.
    detail: "A charge that keeps coming back after you stopped noticing it.",
  },
  // A higher price for the same shop.
  {
    // Finding name.
    title: "Price jumps",
    // A concrete example.
    detail: "The same shop charged ₹149. Later it charged ₹179.",
  },
  // Mail without a matching recent charge.
  {
    // Finding name.
    title: "A bill with no bank charge",
    // What that means.
    detail: "The email arrived. No recent bank line matches that bill.",
  },
];

// The four moves in a match, in order.
const matchSteps: readonly string[] = [
  // Step one.
  "Read one bank line.",
  // Step two.
  "Clean the shop name.",
  // Step three.
  "Look for an email from that shop around that date and that amount.",
  // Step four.
  "Save one subscription with the next likely charge date.",
];

// The only facts chat may see.
const chatMaySee: readonly string[] = [
  // The shop.
  "Shop name",
  // The day.
  "Date",
  // The money.
  "Amount",
];

// The four actions, shown as buttons.
const actions: readonly ActionCard[] = [
  // Bring a bank file onto the computer.
  {
    // Button label.
    label: "Import a statement",
    // What it means.
    detail: "Drop in a bank file from this computer.",
  },
  // Look through mail for bills and trials.
  {
    // Button label.
    label: "Check email",
    // What it means.
    detail: "Read bills and notes that a trial is ending.",
  },
  // Look for forgotten charges and higher prices.
  {
    // Button label.
    label: "Find leaks and price jumps",
    // What it means.
    detail: "Show forgotten charges, and prices that went up.",
  },
  // Draft a letter and keep it as a file.
  {
    // Button label.
    label: "Write a cancel or dispute letter",
    // What it means, including that it is not sent.
    detail: "Saved as a file on this computer. Nothing is sent.",
  },
];

// Nine small build steps. The first one is next.
const buildSteps: readonly BuildStep[] = [
  // Step 1.
  {
    // Step name.
    name: "Types",
    // Plain meaning.
    detail: "Agree on the words we keep: shop, date, amount, and the next charge.",
    // This is the step we do next.
    isNext: true,
  },
  // Step 2.
  {
    // Step name.
    name: "Privacy filter",
    // Plain meaning.
    detail: "Hold back balances, full account numbers, and everyday purchases.",
    // Later.
    isNext: false,
  },
  // Step 3.
  {
    // Step name.
    name: "Bank import",
    // Plain meaning.
    detail: "Read a csv, xlsx, or qfx file you drop in.",
    // Later.
    isNext: false,
  },
  // Step 4.
  {
    // Step name.
    name: "Shop-name cleanup",
    // Plain meaning.
    detail: "Turn a messy bank label into a shop a person would recognize.",
    // Later.
    isNext: false,
  },
  // Step 5.
  {
    // Step name.
    name: "Email check",
    // Plain meaning.
    detail: "Read bills and notes that a trial is ending.",
    // Later.
    isNext: false,
  },
  // Step 6.
  {
    // Step name.
    name: "Matching",
    // Plain meaning.
    detail: "Pair one bank line with an email from that shop, near that date and amount.",
    // Later.
    isNext: false,
  },
  // Step 7.
  {
    // Step name.
    name: "Price-jump check",
    // Plain meaning.
    detail: "Notice when the same shop costs more than last time.",
    // Later.
    isNext: false,
  },
  // Step 8.
  {
    // Step name.
    name: "Letters",
    // Plain meaning.
    detail: "Write a cancel or dispute letter and save it as a file.",
    // Later.
    isNext: false,
  },
  // Step 9.
  {
    // Step name.
    name: "Connect to chat",
    // Plain meaning.
    detail: "Let chat see only the shop name, the date, and the amount.",
    // Later.
    isNext: false,
  },
];

// Make an element that already has its class.
function make<K extends keyof HTMLElementTagNameMap>(
  // The kind of element to create.
  tag: K,
  // The class the stylesheet expects.
  className: string,
  // The matching element comes back.
): HTMLElementTagNameMap[K] {
  // Create it in this document.
  const node: HTMLElementTagNameMap[K] = document.createElement(tag);
  // Attach the class.
  node.className = className;
  // Hand it back.
  return node;
}

// Put a text element inside a parent and return it.
function addText<K extends keyof HTMLElementTagNameMap>(
  // Where the new element goes.
  parent: HTMLElement,
  // The kind of element.
  tag: K,
  // Its class.
  className: string,
  // The words to show.
  text: string,
  // The new element comes back.
): HTMLElementTagNameMap[K] {
  // Create the element.
  const node: HTMLElementTagNameMap[K] = make(tag, className);
  // Set the words as text, not as markup.
  node.textContent = text;
  // Place it in the parent.
  parent.append(node);
  // Hand it back.
  return node;
}

// Draw the two lines that join into one list.
function makeMerge(): SVGSVGElement {
  // Create an SVG drawing.
  const svg: SVGSVGElement = document.createElementNS(
    // The SVG namespace.
    "http://www.w3.org/2000/svg",
    // The SVG tag.
    "svg",
  );
  // A wide, short canvas that lines up with the two cards.
  svg.setAttribute("viewBox", "0 0 600 72");
  // The class that shows this only on a wide screen.
  svg.setAttribute("class", "merge");
  // Hide it from screen readers; the meet line says the same thing.
  svg.setAttribute("aria-hidden", "true");
  // One path for both arms and the arrow.
  const path: SVGPathElement = document.createElementNS(
    // The SVG namespace again.
    "http://www.w3.org/2000/svg",
    // A path tag.
    "path",
  );
  // Left card down, across, right card down, then a center arrow.
  path.setAttribute(
    // The path data attribute.
    "d",
    // The actual line and arrow.
    "M150 2 V28 H450 V2 M300 28 V56 M291 46 L300 58 L309 46",
  );
  // No fill, only the stroke.
  path.setAttribute("fill", "none");
  // Use the green from the CSS color.
  path.setAttribute("stroke", "currentColor");
  // A clear stroke.
  path.setAttribute("stroke-width", "2");
  // Soft ends.
  path.setAttribute("stroke-linecap", "round");
  // Soft corners.
  path.setAttribute("stroke-linejoin", "round");
  // Put the path in the drawing.
  svg.append(path);
  // Hand the drawing back.
  return svg;
}

// Build the opening: nickname, name, and the one sentence.
function buildHero(page: HTMLElement): void {
  // The opening block.
  const hero: HTMLElement = make("header", "hero");
  // The project nickname.
  addText(hero, "p", "nickname", projectNickname);
  // The product name as the page title.
  addText(hero, "h1", "product-name", productName);
  // The purpose sentence, with one phrase marked.
  const purpose: HTMLParagraphElement = make("p", "purpose");
  // The first half of the sentence, as text.
  purpose.append(
    // A text node, so no markup sneaks in.
    document.createTextNode(
      // The opening of the one sentence.
      "Subconscious is a local helper that finds subscriptions ",
    ),
  );
  // The phrase that carries the point.
  const marked: HTMLElement = make("em", "");
  // The marked words.
  marked.textContent = "quietly taking your money.";
  // Add the marked phrase to the sentence.
  purpose.append(marked);
  // Put the sentence in the hero.
  hero.append(purpose);
  // A short line about where it lives.
  addText(hero, "p", "stay", "It stays on your computer.");
  // Add the hero to the page.
  page.append(hero);
}

// Build the two sources and the one list they feed.
function buildSources(page: HTMLElement): void {
  // The band for this section.
  const band: HTMLElement = make("section", "band");
  // Name the section for assistive tech.
  band.setAttribute("aria-labelledby", "sources-title");
  // The small section number.
  addText(band, "p", "kicker", "Two sources");
  // The section title.
  const title: HTMLHeadingElement = addText(band, "h2", "", "You need both.");
  // Tie the section label to this title.
  title.id = "sources-title";
  // One line on why a single source is not enough.
  addText(
    // Parent.
    band,
    // Tag.
    "p",
    // Class.
    "lede",
    // Words.
    "Each one catches shops the other misses.",
  );
  // The picture: two cards, a join, then the list.
  const flow: HTMLDivElement = make("div", "flow");
  // The pair of source cards.
  const sourceRow: HTMLDivElement = make("div", "sources");
  // One card per source.
  sources.forEach((source: SourceCard): void => {
    // The card.
    const card: HTMLElement = make("article", "source");
    // The source name.
    addText(card, "h3", "", source.title);
    // What you give it.
    addText(card, "p", "gives", source.gives);
    // Why it is needed.
    addText(card, "p", "why", source.why);
    // Add the card to the row.
    sourceRow.append(card);
  });
  // Put the two cards into the picture.
  flow.append(sourceRow);
  // The lines that merge on a wide screen.
  flow.append(makeMerge());
  // The words that explain the picture.
  addText(flow, "p", "meet", "Both pour into one subscription list.");
  // The list card.
  const listCard: HTMLElement = make("article", "subs");
  // The list name.
  addText(listCard, "h3", "", "Subscriptions");
  // A hint that these rows are a picture, not live data.
  addText(listCard, "p", "note", "A picture of the list. Not your real charges.");
  // The rows.
  const list: HTMLUListElement = make("ul", "sub-list");
  // One row per sample shop.
  subscriptions.forEach((row: SubscriptionRow): void => {
    // The row item.
    const item: HTMLLIElement = make("li", "sub");
    // The shop.
    addText(item, "p", "shop", row.shop);
    // The note, with an extra class when the price jumped.
    addText(
      // Parent.
      item,
      // Tag.
      "p",
      // Class, plus jump when needed.
      row.priceJump ? "noticed jump" : "noticed",
      // Words.
      row.noticed,
    );
    // The next charge.
    addText(item, "p", "next", row.next);
    // Add the row.
    list.append(item);
  });
  // Put the rows in the card.
  listCard.append(list);
  // Put the card under the join.
  flow.append(listCard);
  // Put the picture in the band.
  band.append(flow);
  // Put the band on the page.
  page.append(band);
}

// Build the three findings.
function buildFindings(page: HTMLElement): void {
  // The band.
  const band: HTMLElement = make("section", "band");
  // Name it for assistive tech.
  band.setAttribute("aria-labelledby", "findings-title");
  // The small section number.
  addText(band, "p", "kicker", "What it figures out");
  // The section title.
  const title: HTMLHeadingElement = addText(band, "h2", "", "Three things to catch.");
  // Tie the label to the title.
  title.id = "findings-title";
  // A short lead-in.
  addText(band, "p", "lede", "Nothing clever. Just charges that deserve a look.");
  // The card row.
  const grid: HTMLDivElement = make("div", "findings");
  // One card per finding.
  findings.forEach((finding: Finding): void => {
    // The card.
    const card: HTMLElement = make("article", "finding");
    // The finding name.
    addText(card, "h3", "", finding.title);
    // The sentence.
    addText(card, "p", "", finding.detail);
    // Add the card.
    grid.append(card);
  });
  // Put the cards in the band.
  band.append(grid);
  // Put the band on the page.
  page.append(band);
}

// Build the four numbered match steps.
function buildMatch(page: HTMLElement): void {
  // The band.
  const band: HTMLElement = make("section", "band");
  // Name it for assistive tech.
  band.setAttribute("aria-labelledby", "match-title");
  // The small section number.
  addText(band, "p", "kicker", "How a match works");
  // The section title.
  const title: HTMLHeadingElement = addText(band, "h2", "", "Four plain steps.");
  // Tie the label to the title.
  title.id = "match-title";
  // A short lead-in.
  addText(band, "p", "lede", "One bank line becomes one subscription.");
  // The numbered list.
  const list: HTMLOListElement = make("ol", "matches");
  // Walk the steps in order.
  matchSteps.forEach((sentence: string, index: number): void => {
    // One step.
    const item: HTMLLIElement = make("li", "match");
    // The visible number, starting at 1.
    addText(item, "span", "match-no", String(index + 1));
    // The sentence.
    addText(item, "p", "", sentence);
    // Add the step.
    list.append(item);
  });
  // Put the list in the band.
  band.append(list);
  // Put the band on the page.
  page.append(band);
}

// Build what chat may see, and what stays put.
function buildPrivacy(page: HTMLElement): void {
  // The band.
  const band: HTMLElement = make("section", "band");
  // Name it for assistive tech.
  band.setAttribute("aria-labelledby", "privacy-title");
  // The small section number.
  addText(band, "p", "kicker", "What the chat may see");
  // The section title.
  const title: HTMLHeadingElement = addText(band, "h2", "", "Only three facts.");
  // Tie the label to the title.
  title.id = "privacy-title";
  // A short lead-in.
  addText(band, "p", "lede", "Chat can help with a shop. It does not get the rest.");
  // The card.
  const card: HTMLElement = make("div", "privacy");
  // The three chips.
  const allowed: HTMLUListElement = make("ul", "allowed");
  // One chip per fact.
  chatMaySee.forEach((fact: string): void => {
    // The chip.
    addText(allowed, "li", "", fact);
  });
  // Put the chips in the card.
  card.append(allowed);
  // The promise about what stays on the computer.
  addText(
    // Parent.
    card,
    // Tag.
    "p",
    // Class.
    "privacy-line",
    // Words.
    "Balances, full account numbers, and everyday purchases stay on the computer.",
  );
  // Put the card in the band.
  band.append(card);
  // Put the band on the page.
  page.append(band);
}

// Build the four action buttons.
function buildActions(page: HTMLElement): void {
  // The band.
  const band: HTMLElement = make("section", "band");
  // Name it for assistive tech.
  band.setAttribute("aria-labelledby", "actions-title");
  // The small section number.
  addText(band, "p", "kicker", "Four actions");
  // The section title.
  const title: HTMLHeadingElement = addText(band, "h2", "", "What you can ask it to do.");
  // Tie the label to the title.
  title.id = "actions-title";
  // A short lead-in.
  addText(band, "p", "lede", "These are the jobs. This page does not run them.");
  // The button grid.
  const grid: HTMLDivElement = make("div", "actions");
  // The line that answers a press.
  const status: HTMLParagraphElement = make("p", "action-status");
  // Tell assistive tech this line will change.
  status.setAttribute("role", "status");
  // The quiet starting line.
  status.textContent = "Press an action to read what it would do. Nothing runs from this page.";
  // One button per action.
  actions.forEach((action: ActionCard): void => {
    // The button.
    const button: HTMLButtonElement = make("button", "action");
    // It does not submit a form.
    button.type = "button";
    // The name, in a strong line.
    addText(button, "strong", "", action.label);
    // The explanation.
    addText(button, "span", "", action.detail);
    // When pressed, repeat the meaning in the status line.
    button.addEventListener("click", (): void => {
      // Say what the action would do, and that it is not running.
      status.textContent = action.label + ". " + action.detail + " Not running on this page.";
    });
    // Add the button.
    grid.append(button);
  });
  // Put the buttons in the band.
  band.append(grid);
  // Put the status under the buttons.
  band.append(status);
  // Put the band on the page.
  page.append(band);
}

// Build the nine-step plan, with step 1 marked next.
function buildPlan(page: HTMLElement): void {
  // The band.
  const band: HTMLElement = make("section", "band");
  // Name it for assistive tech.
  band.setAttribute("aria-labelledby", "plan-title");
  // The small section number.
  addText(band, "p", "kicker", "How we will build it");
  // The section title.
  const title: HTMLHeadingElement = addText(band, "h2", "", "Nine small steps.");
  // Tie the label to the title.
  title.id = "plan-title";
  // Say where we start.
  addText(band, "p", "lede", "We start at step 1.");
  // The list.
  const list: HTMLOListElement = make("ol", "steps");
  // Walk the plan in order.
  buildSteps.forEach((step: BuildStep, index: number): void => {
    // The row, with an extra class when it is next.
    const item: HTMLLIElement = make("li", step.isNext ? "step is-next" : "step");
    // The number and the name share one line.
    const head: HTMLDivElement = make("div", "step-head");
    // The visible number.
    addText(head, "span", "step-no", String(index + 1));
    // The name, which may include a Next mark.
    const nameRow: HTMLDivElement = make("div", "step-name");
    // The step name as text.
    nameRow.append(document.createTextNode(step.name));
    // Add the Next mark only on the first step.
    if (step.isNext) {
      // The mark.
      addText(nameRow, "span", "next-pill", "Next");
    }
    // Put the name beside the number.
    head.append(nameRow);
    // Put that line in the row.
    item.append(head);
    // The plain sentence under the name.
    addText(item, "p", "step-detail", step.detail);
    // Add the row.
    list.append(item);
  });
  // Put the list in the band.
  band.append(list);
  // Put the band on the page.
  page.append(band);
}

// Fill the empty shell with the explainer.
function render(): void {
  // Name the browser tab.
  document.title = "Subconscious — LeakLock";
  // Find the shell from the HTML file.
  const root: HTMLElement | null = document.querySelector("#app");
  // Stop if the shell is missing.
  if (root === null) {
    // Leave a visible note on the page body.
    document.body.textContent = "This page could not find its shell.";
    // Leave the function.
    return;
  }
  // Clear anything already in the shell.
  root.replaceChildren();
  // The centered column.
  const page: HTMLElement = make("main", "page");
  // Section 1, the one-sentence purpose.
  buildHero(page);
  // Section 2, the two sources and the list.
  buildSources(page);
  // Section 3, the three findings.
  buildFindings(page);
  // Section 4, the match steps.
  buildMatch(page);
  // Section 5, what chat may see.
  buildPrivacy(page);
  // Section 6, the four actions.
  buildActions(page);
  // Section 7, the build list.
  buildPlan(page);
  // A quiet close.
  addText(page, "p", "foot", "Subconscious · LeakLock · This page only explains the idea.");
  // Put the column in the shell.
  root.append(page);
}

// Draw the page now.
render();
