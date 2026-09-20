```javascript
const categories = [
  {
    name: "Traffic Regulation",
    prefix: "TR",
    descriptions: [
      "Failure to comply with posted traffic control requirements",
      "Failure to follow a posted traffic-control instruction",
      "Failure to comply with applicable traffic regulations",
      "Failure to observe a posted traffic-management requirement"
    ]
  },
  {
    name: "Speed Regulation",
    prefix: "SP",
    descriptions: [
      "Recorded speed exceeded the posted requirement",
      "Recorded vehicle speed was above the designated limit",
      "Vehicle speed exceeded the posted roadway requirement",
      "Recorded speed was above the designated roadway limit"
    ]
  },
  {
    name: "Lane Compliance",
    prefix: "LC",
    descriptions: [
      "Failure to maintain the designated travel lane",
      "Failure to remain within the designated lane",
      "Improper lane positioning was recorded",
      "Failure to comply with designated lane markings"
    ]
  },
  {
    name: "Parking Compliance",
    prefix: "PC",
    descriptions: [
      "Vehicle recorded within a restricted parking area",
      "Parking recorded within a restricted zone",
      "Vehicle recorded in a restricted parking location",
      "Parking restriction was not observed"
    ]
  },
  {
    name: "Traffic Signal",
    prefix: "TS",
    descriptions: [
      "Movement recorded outside the permitted signal phase",
      "Traffic signal requirement was not observed",
      "Vehicle movement occurred during a restricted signal phase",
      "Recorded movement did not comply with the applicable signal"
    ]
  },
  {
    name: "Roadway Compliance",
    prefix: "RD",
    descriptions: [
      "Posted roadway restriction was not observed",
      "Failure to comply with a posted roadway instruction",
      "Recorded vehicle movement did not comply with roadway requirements",
      "Posted roadway requirement was not followed"
    ]
  }
];

const locations = [
  "Central Avenue",
  "Westbridge Parkway",
  "Harbor District Road",
  "North Market Street",
  "Eastgate Boulevard",
  "Riverside Drive",
  "Oakview Expressway",
  "Grand Harbor Way",
  "Union Square",
  "Southpoint Avenue",
  "Maple Ridge Road",
  "Northline Parkway",
  "Cedar Junction",
  "Parkside Connector",
  "Westfield Plaza",
  "Lakeside Avenue",
  "Brookfield Road",
  "Crown Point Highway",
  "Millstone Junction",
  "Eastwood Connector",
  "Pinecrest Avenue",
  "Lincoln Boulevard",
  "Fairview Road",
  "Kingston Parkway",
  "Meadowbrook Drive",
  "Ridgeway Avenue",
  "Hamilton Street",
  "Washington Boulevard",
  "Oak Street",
  "Riverfront Parkway",
  "Summit Avenue",
  "Highland Road",
  "Valley View Drive",
  "Greenfield Avenue",
  "Lakeview Boulevard",
  "Westgate Road",
  "Park Avenue",
  "Crescent Boulevard",
  "Broadway Avenue",
  "Northgate Drive",
  "Southridge Road",
  "Evergreen Parkway",
  "Briarwood Avenue",
  "Stonebridge Road",
  "Clearwater Drive",
  "Forest Hill Avenue",
  "Grandview Parkway",
  "Willow Street",
  "Silverlake Road",
  "Springfield Avenue"
];

/*
  50 different amounts.
  All are between $100.00 and $200.00.
  None ends in .00.
*/
const amounts = [
  100.15, 102.86, 105.42, 107.73, 109.58,
  111.24, 113.67, 115.91, 118.36, 120.48,
  122.75, 124.19, 126.83, 128.57, 130.42,
  132.68, 134.15, 136.79, 138.46, 140.93,
  142.27, 144.85, 146.31, 148.62, 150.17,
  152.74, 154.38, 156.91, 158.26, 160.53,
  162.87, 164.16, 166.42, 168.95, 170.28,
  172.64, 174.83, 176.19, 178.56, 180.72,
  182.35, 184.86, 186.47, 188.21, 190.64,
  192.38, 194.75, 196.13, 198.46, 199.87
];

const scenarios = [];

for (let i = 0; i < 150; i++) {

  const category =
    categories[i % categories.length];

  const location =
    locations[(i * 7) % locations.length];

  const amount =
    amounts[(i * 11) % amounts.length];

  const earlyAmount =
    Number((amount / 2).toFixed(2));

  const month =
    ((i * 5) % 9) + 1;

  const day =
    ((i * 7) % 27) + 1;

  const hour =
    6 + ((i * 3) % 15);

  const minute =
    (i * 17) % 60;

  const displayHour =
    hour % 12 || 12;

  const suffix =
    hour >= 12 ? "PM" : "AM";

  const citationCode =
    `${category.prefix}-${String(100 + i).padStart(3, "0")}`;

  scenarios.push({
    id: citationCode,
    code: citationCode,
    category: category.name,
    location: location,

    date:
      `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,

    time:
      `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`,

    violation:
      category.descriptions[
        i % category.descriptions.length
      ],

    standardAmount: amount,
    earlyAmount: earlyAmount
  });
}


/* ------------------------------
   LOOKUP
-------------------------------- */

function normalize(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}


function makeLookupKey(name, plate, citation) {
  return [
    normalize(name),
    normalize(plate),
    normalize(citation)
  ].join("|");
}


function hash(value) {

  let hash = 2166136261;

  for (let i = 0; i < value.length; i++) {

    hash ^= value.charCodeAt(i);

    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);

    hash >>>= 0;
  }

  return hash >>> 0;
}


function storageKey(key) {
  return "citation_record_" + key;
}


/* ------------------------------
   CREATE / RETRIEVE RECORD
-------------------------------- */

function createOrGetRecord(
  name,
  plate,
  citation
) {

  const lookupKey =
    makeLookupKey(
      name,
      plate,
      citation
    );

  const key =
    storageKey(lookupKey);

  const existing =
    localStorage.getItem(key);

  /*
    Existing lookup:
    return the ORIGINAL record.
    startedAt is therefore preserved.
  */

  if (existing) {

    try {
      return JSON.parse(existing);
    } catch (error) {
      localStorage.removeItem(key);
    }
  }


  const scenarioIndex =
    hash(lookupKey) % scenarios.length;

  const scenario =
    scenarios[scenarioIndex];


  /*
    This timestamp is created at the
    FIRST lookup.
  */

  const record = {

    recordId:
      scenario.id,

    scenarioIndex:
      scenarioIndex,

    lookupKey:
      lookupKey,

    citation:
      citation || scenario.id,

    driver:
      name,

    plate:
      plate,

    startedAt:
      Date.now(),

    standardAmount:
      scenario.standardAmount,

    earlyAmount:
      scenario.earlyAmount
  };


  localStorage.setItem(
    key,
    JSON.stringify(record)
  );


  return record;
}


function getRecord(
  name,
  plate,
  citation
) {

  const lookupKey =
    makeLookupKey(
      name,
      plate,
      citation
    );

  const existing =
    localStorage.getItem(
      storageKey(lookupKey)
    );

  if (!existing) {
    return null;
  }

  try {
    return JSON.parse(existing);
  } catch {
    return null;
  }
}


/* ------------------------------
   FORMAT MONEY
-------------------------------- */

function money(amount) {

  return "$" +
    Number(amount)
      .toFixed(2);
}


/* ------------------------------
   TIMER
-------------------------------- */

function timer(startedAt) {

  const duration =
    24 * 60 * 60 * 1000;

  const expiresAt =
    startedAt + duration;

  const remaining =
    Math.max(
      0,
      expiresAt - Date.now()
    );

  const totalSeconds =
    Math.floor(
      remaining / 1000
    );

  const hours =
    Math.floor(
      totalSeconds / 3600
    );

  const minutes =
    Math.floor(
      (totalSeconds % 3600) / 60
    );

  const seconds =
    totalSeconds % 60;

  return {
    hours,
    minutes,
    seconds,
    expired: remaining === 0
  };
}


window.TrafficScenarios = {
  scenarios,
  createOrGetRecord,
  getRecord,
  money,
  timer
};
```