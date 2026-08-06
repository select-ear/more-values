// Default classic 8values test preset configuration using vector SVG images
export const DEFAULT_8VALUES_TEST = {
  id: "8values-classic",
  title: "∞Values",
  description: "∞Values is a political test that attempts to assign percentages for eight different political values across 4 main axes.",
  version: "1.0.0",
  theme: {
    background: "#dddddd",
    headings: "#222222",
    text: "#444444",
    lines: "#b0b0b0",
    containerBg: "#eeeeee",
    border: "#eeeeee",
    resultsBarBg: "#eeeeee",
    resultsBarBorder: "#222222",
    htmlBg: "#bbbbbb",
    centerBg: "#eeeeee"
  },
  axes: [
    {
      id: "econ",
      name: "ECONOMIC",
      left: { name: "Equality", color: "#f44336", icon: "/raw_icons/equality.svg" },
      right: { name: "Markets", color: "#00897b", icon: "/raw_icons/markets.svg" },
      tiers: [
        { threshold: 90, name: "Communist" },
        { threshold: 75, name: "Socialist" },
        { threshold: 60, name: "Social" },
        { threshold: 40, name: "Centrist" },
        { threshold: 25, name: "Market" },
        { threshold: 10, name: "Capitalist" },
        { threshold: 0, name: "Laissez-Faire" }
      ]
    },
    {
      id: "dipl",
      name: "DIPLOMATIC",
      left: { name: "Nation", color: "#ff9800", icon: "/raw_icons/nation.svg" },
      right: { name: "Globe", color: "#03a9f4", icon: "/raw_icons/globe.svg" },
      tiers: [
        { threshold: 90, name: "Chauvinist" },
        { threshold: 75, name: "Nationalist" },
        { threshold: 60, name: "Patriotic" },
        { threshold: 40, name: "Balanced" },
        { threshold: 25, name: "Peaceful" },
        { threshold: 10, name: "Internationalist" },
        { threshold: 0, name: "Cosmopolitan" }
      ]
    },
    {
      id: "govt",
      name: "CIVIL",
      left: { name: "Liberty", color: "#ffeb3b", icon: "/raw_icons/liberty.svg" },
      right: { name: "Authority", color: "#3f51b5", icon: "/raw_icons/authority.svg" },
      tiers: [
        { threshold: 90, name: "Anarchist" },
        { threshold: 75, name: "Libertarian" },
        { threshold: 60, name: "Liberal" },
        { threshold: 40, name: "Moderate" },
        { threshold: 25, name: "Statist" },
        { threshold: 10, name: "Authoritarian" },
        { threshold: 0, name: "Totalitarian" }
      ]
    },
    {
      id: "scty",
      name: "SOCIETAL",
      left: { name: "Tradition", color: "#8e24aa", icon: "/raw_icons/tradition.svg" },
      right: { name: "Progress", color: "#e91e63", icon: "/raw_icons/progress.svg" },
      tiers: [
        { threshold: 90, name: "Reactionary" },
        { threshold: 75, name: "Very Traditional" },
        { threshold: 60, name: "Traditional" },
        { threshold: 40, name: "Neutral" },
        { threshold: 25, name: "Progressive" },
        { threshold: 10, name: "Very Progressive" },
        { threshold: 0, name: "Revolutionary" }
      ]
    }
  ],
  questions: [
    {
      id: 1,
      text: "Oppression by corporations is more of a concern than oppression by governments.",
      effects: { econ: 10, govt: 5 }
    },
    {
      id: 2,
      text: "It is necessary for the government to intervene in the economy to protect consumers.",
      effects: { econ: 10 }
    },
    {
      id: 3,
      text: "The freer the market, the freer the people.",
      effects: { econ: -10 }
    },
    {
      id: 4,
      text: "From each according to his ability, to each according to his need.",
      effects: { econ: 15 }
    },
    {
      id: 5,
      text: "A balanced budget is more important than ensuring welfare for all citizens.",
      effects: { econ: -10 }
    },
    {
      id: 6,
      text: "My nation's interests should come first before global issues.",
      effects: { dipl: 10 }
    },
    {
      id: 7,
      text: "International cooperation is preferable to national independence.",
      effects: { dipl: -10 }
    },
    {
      id: 8,
      text: "Wars between nations are rarely justified.",
      effects: { dipl: -10 }
    },
    {
      id: 9,
      text: "Military spending is a waste of resources.",
      effects: { dipl: -10, govt: 5 }
    },
    {
      id: 10,
      text: "Individual freedom must be protected at all costs.",
      effects: { govt: 10 }
    },
    {
      id: 11,
      text: "Government surveillance is necessary to keep society safe.",
      effects: { govt: -10 }
    },
    {
      id: 12,
      text: "The state should enforce public morality.",
      effects: { govt: -10, scty: 5 }
    },
    {
      id: 13,
      text: "Traditions should be preserved for their own sake.",
      effects: { scty: 10 }
    },
    {
      id: 14,
      text: "Reason and scientific progress are more important than tradition.",
      effects: { scty: -10 }
    },
    {
      id: 15,
      text: "All religions should be treated with equal respect by the state.",
      effects: { scty: -5, govt: 5 }
    }
  ],
  ideologies: [
    {
      name: "Social Democracy",
      description: "Balanced mixed economy, civil liberties, progressive values, and international cooperation.",
      criteria: { econ: [60, 100], govt: [50, 100], scty: [55, 100] }
    },
    {
      name: "Libertarian Capitalism",
      description: "Strong belief in free markets, minimal government, and individual liberty.",
      criteria: { econ: [0, 40], govt: [60, 100] }
    },
    {
      name: "Authoritarian Socialism",
      description: "State-controlled economy with strong authority to enforce social equality.",
      criteria: { econ: [65, 100], govt: [0, 40] }
    },
    {
      name: "Traditional Nationalism",
      description: "Focus on national sovereignty, preservation of tradition, and state order.",
      criteria: { dipl: [60, 100], scty: [60, 100] }
    },
    {
      name: "Centrist",
      description: "Balanced view across economic, civil, and social perspectives.",
      criteria: {}
    }
  ]
};
