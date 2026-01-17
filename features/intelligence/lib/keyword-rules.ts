/**
 * Keyword-based Category Matching Rules
 *
 * Fallback rules for categorizing expenses when vendor default
 * and Plaid mapping don't provide a match.
 *
 * Rules are checked in order - first match wins.
 */

export interface KeywordRule {
  patterns: string[]
  categorySlug: string
  confidence: number
}

export const KEYWORD_RULES: KeywordRule[] = [
  // Subscriptions (85% - very reliable patterns)
  {
    patterns: [
      // Streaming
      "netflix",
      "spotify",
      "hulu",
      "disney+",
      "disney plus",
      "hbo",
      "amazon prime",
      "apple music",
      "youtube premium",
      "paramount",
      "peacock",
      "showtime",
      "audible",
      // Productivity SaaS
      "adobe",
      "microsoft 365",
      "office 365",
      "dropbox",
      "google storage",
      "google one",
      "icloud",
      "notion",
      "slack",
      "zoom",
      "figma",
      "canva",
      "mailchimp",
      "hubspot",
      // Cloud/Dev tools
      "aws",
      "azure",
      "google cloud",
      "heroku",
      "vercel",
      "netlify",
      "digitalocean",
      "github",
      "gitlab",
      "bitbucket",
      "jira",
      "confluence",
      "asana",
      "monday.com",
      "linear",
      // Security
      "1password",
      "lastpass",
      "dashlane",
      "nordvpn",
      "expressvpn",
    ],
    categorySlug: "subscriptions",
    confidence: 0.85,
  },

  // Marketing & Ads (80% - no direct Plaid mapping)
  {
    patterns: [
      "facebook ads",
      "meta ads",
      "google ads",
      "google adwords",
      "bing ads",
      "linkedin ads",
      "twitter ads",
      "tiktok ads",
      "pinterest ads",
      "snapchat ads",
      "constant contact",
      "sendgrid",
      "twilio",
      "advertising",
      "marketing",
      "ad spend",
    ],
    categorySlug: "marketing-ads",
    confidence: 0.8,
  },

  // Software & Tools (75%)
  {
    patterns: [
      "app store",
      "google play",
      "apple.com/bill",
      "itunes",
      "software",
      "saas",
      "license",
    ],
    categorySlug: "software-tools",
    confidence: 0.75,
  },

  // Office Supplies (75%)
  {
    patterns: [
      "staples",
      "office depot",
      "officemax",
      "amazon business",
      "office supply",
      "stationery",
    ],
    categorySlug: "office-supplies",
    confidence: 0.75,
  },

  // Professional Services (75%)
  {
    patterns: [
      "law office",
      "attorney",
      "lawyer",
      "accountant",
      "cpa",
      "bookkeeper",
      "consultant",
      "consulting",
      "freelancer",
      "legal",
      "accounting",
      "professional",
    ],
    categorySlug: "professional-services",
    confidence: 0.75,
  },

  // Travel & Transport (80%)
  {
    patterns: [
      // Rideshare
      "uber",
      "lyft",
      "taxi",
      "grab",
      "cabify",
      "bolt",
      // Hotels
      "airbnb",
      "booking.com",
      "expedia",
      "hotels.com",
      "marriott",
      "hilton",
      "hyatt",
      "ihg",
      // Airlines
      "united airlines",
      "american airlines",
      "delta",
      "southwest",
      "jetblue",
      "spirit",
      "frontier",
      // Gas stations
      "shell",
      "chevron",
      "bp",
      "exxon",
      "mobil",
      "texaco",
      "sunoco",
      // Car rental
      "hertz",
      "enterprise",
      "avis",
      "budget",
      "national",
      // Keywords
      "airline",
      "flight",
      "hotel",
      "car rental",
    ],
    categorySlug: "travel-transport",
    confidence: 0.8,
  },

  // Meals & Entertainment (75%)
  {
    patterns: [
      // Delivery
      "doordash",
      "uber eats",
      "grubhub",
      "postmates",
      "seamless",
      "caviar",
      "instacart",
      // Coffee/Fast food
      "starbucks",
      "dunkin",
      "mcdonald",
      "burger king",
      "wendy",
      "chipotle",
      "taco bell",
      "subway",
      // Pizza
      "domino",
      "pizza hut",
      "papa john",
      // Keywords
      "restaurant",
      "cafe",
      "diner",
      "grill",
      "bistro",
      "eatery",
    ],
    categorySlug: "meals-entertainment",
    confidence: 0.75,
  },

  // Utilities (80%)
  {
    patterns: [
      // Telecom
      "comcast",
      "xfinity",
      "spectrum",
      "verizon",
      "at&t",
      "t-mobile",
      "sprint",
      // Energy
      "pge",
      "pg&e",
      "con edison",
      "duke energy",
      "national grid",
      // Keywords
      "electric",
      "power",
      "gas company",
      "water utility",
      "internet",
      "telecom",
    ],
    categorySlug: "utilities",
    confidence: 0.8,
  },

  // Insurance (80%)
  {
    patterns: [
      "geico",
      "progressive",
      "state farm",
      "allstate",
      "liberty mutual",
      "nationwide",
      "farmers",
      "usaa",
      "aetna",
      "cigna",
      "united health",
      "blue cross",
      "kaiser",
      "insurance",
      "premium",
    ],
    categorySlug: "insurance",
    confidence: 0.8,
  },

  // Equipment (70%)
  {
    patterns: [
      "home depot",
      "lowes",
      "menards",
      "ace hardware",
      "best buy",
      "apple store",
      "b&h photo",
      "newegg",
      "equipment",
      "hardware store",
      "electronics",
    ],
    categorySlug: "equipment",
    confidence: 0.7,
  },
]

/**
 * Match merchant/transaction name against keyword rules
 */
export function matchKeywordRules(
  merchantName: string | null | undefined,
  transactionName: string | null | undefined
): { slug: string; confidence: number; matchedKeyword: string } | null {
  const searchText = `${merchantName || ""} ${transactionName || ""}`.toLowerCase()

  for (const rule of KEYWORD_RULES) {
    for (const pattern of rule.patterns) {
      if (searchText.includes(pattern.toLowerCase())) {
        return {
          slug: rule.categorySlug,
          confidence: rule.confidence,
          matchedKeyword: pattern,
        }
      }
    }
  }

  return null
}
