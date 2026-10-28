/* ============================================================
   content.js — All copy, timelines, quiz options & thresholds.
   Edit this file to change content without touching logic.
   ============================================================ */

// eslint-disable-next-line no-unused-vars
const CONTENT = {

  brand: "Be Bodywise",
  appName: "Progress Companion",
  heroMessage: "Most people quit because they can't tell if it's working.",
  emphasis: "progress",

  /* ---- Survey stats (small sample of 7) ---- */
  stats: {
    sampleSize: 7,
    sampleNote: "From our small survey of 7 customers",
    expectedTooFast: "4 of 7",
    stoppedBecauseSlow: "3 of 3",
    cantMeasure: "6 of 7",
    quotes: [
      { text: "I wasn\u2019t sure if it was doing anything, so I stopped buying", id: "q1" },
      { text: "I expected something in two weeks. When I saw nothing, I quit", id: "q2" },
      { text: "I had no idea what changes to look for", id: "q3" }
    ],
    stageMapping: [
      { stage: "Set up",    finding: "4 of 7 had vague goals. Clear markers make change visible" },
      { stage: "Timeline",  finding: "4 of 7 expected results too fast. Honest timelines set realistic pace" },
      { stage: "Check-in",  finding: "3 of 3 who quit lost motivation. Daily logs build momentum" },
      { stage: "Results",   finding: "6 of 7 couldn\u2019t tell if products worked. Tracking shows trends" },
      { stage: "Next step", finding: "Knowing your stage helps you decide whether to continue or talk to a doctor" }
    ]
  },

  /* ---- Concern configs ---- */
  concerns: {

    hair: {
      label: "Hair",
      primaryRatingLabel: "How is your hair shedding right now?",
      secondaryRatingLabel: "How does your hair feel overall?",
      earlyWindowWeeks: 6,
      fullWindowWeeks: 12,
      why: "Hair grows in cycles of months. Follicles need time to cycle before visible changes typically appear.",
      goalSuggestions: ["Less hair fall", "Thicker-looking hair", "Stronger hair", "Less breakage"],
      markers: ["Hair on your comb", "Hair in the shower drain", "How your hair feels"],
      adjustTips: [
        "Apply serum directly to scalp at the same time each day",
        "Use 2 to 3 drops per area rather than spreading too thin",
        "Massage gently with fingertips for 1 minute",
        "Pair with nutritional support if hair shedding feels high"
      ],
      milestones: [
        { fromWeek: 1,  toWeek: 2,  title: "Getting started",        text: "Scalp adjusts to new routine. Normal not to see changes yet" },
        { fromWeek: 3,  toWeek: 6,  title: "Building foundation",    text: "Nutrients reach hair follicles. Many notice less shedding around now" },
        { fromWeek: 7,  toWeek: 10, title: "Changes underway",       text: "New growth starts appearing. Hair often feels stronger and fuller" },
        { fromWeek: 11, toWeek: 12, title: "Visible results",        text: "Most people see noticeable improvement with consistent daily care" }
      ]
    },

    skin: {
      label: "Face",
      primaryRatingLabel: "How clear is your skin right now?",
      secondaryRatingLabel: "How does your skin texture feel?",
      earlyWindowWeeks: 4,
      fullWindowWeeks: 8,
      why: "Skin renews every 4 to 6 weeks. Ingredients need a full renewal cycle to show visible changes.",
      goalSuggestions: ["Fewer breakouts", "Smoother texture", "Even skin tone", "Less oiliness"],
      markers: ["New breakouts this week", "How your skin feels after washing", "Skin tone evenness"],
      adjustTips: [
        "Wash face with lukewarm water before applying actives",
        "Apply sunscreen daily even when staying indoors",
        "Give products 30 seconds to absorb before moisturising",
        "Reduce usage to every other day if skin feels tight"
      ],
      milestones: [
        { fromWeek: 1, toWeek: 2, title: "Adjusting",         text: "Skin adjusts to ingredients. Mild initial adjustment is normal" },
        { fromWeek: 3, toWeek: 4, title: "Early signs",       text: "Many people notice fewer breakouts or smoother texture around now" },
        { fromWeek: 5, toWeek: 6, title: "Building momentum", text: "Improvements become steadier as skin renewal cycles continue" },
        { fromWeek: 7, toWeek: 8, title: "Visible progress",  text: "Most people see meaningful improvement with steady use" }
      ]
    },

    bodyskin: {
      label: "Body skin",
      primaryRatingLabel: "How does the affected area look right now?",
      secondaryRatingLabel: "How does the skin texture feel in that area?",
      earlyWindowWeeks: 6,
      fullWindowWeeks: 12,
      why: "Body skin cells renew slower than facial skin. Texture and pigmentation changes happen gradually over weeks.",
      goalSuggestions: ["Less pigmentation", "Smoother skin", "More even tone", "Softer texture"],
      markers: ["How the area looks next to nearby skin", "How smooth it feels", "How dry it feels"],
      adjustTips: [
        "Apply immediately after showering while skin is damp",
        "Use the roll-on once daily on clean, dry underarms",
        "Exfoliate 2 to 3 times weekly, not every day",
        "Moisturise with lotion on non-scrub days"
      ],
      milestones: [
        { fromWeek: 1,  toWeek: 3,  title: "Getting started", text: "Body skin cells renew slowly. Products work under the surface" },
        { fromWeek: 4,  toWeek: 6,  title: "Early changes",   text: "Many notice smoother texture. Pigmentation changes happen gradually" },
        { fromWeek: 7,  toWeek: 9,  title: "Steady progress", text: "Visible changes in tone and texture often become apparent" },
        { fromWeek: 10, toWeek: 12, title: "Visible results", text: "Most people see clearer, smoother skin with steady routine" }
      ]
    },

    pcos: {
      label: "PCOS and hormones",
      primaryRatingLabel: "How would you rate your symptom comfort right now?",
      secondaryRatingLabel: "How is your daily energy and balance?",
      earlyWindowWeeks: 8,
      fullWindowWeeks: 16,
      why: "Hormonal balance is gradual. Daily support often needs several months to show consistent changes in how you feel.",
      goalSuggestions: ["More regular cycles", "Less acne", "Better energy", "More predictable mood"],
      markers: ["Cycle regularity", "Energy most days", "Skin or hair changes"],
      adjustTips: [
        "Take balance capsules with meals for better absorption",
        "Aim for a consistent sleep schedule to support hormones",
        "Stay hydrated throughout your day",
        "Track your cycle days in your calendar alongside ratings"
      ],
      milestones: [
        { fromWeek: 1,  toWeek: 4,  title: "Building foundation", text: "Body adjusts to nutritional and lifestyle support gradually" },
        { fromWeek: 5,  toWeek: 8,  title: "Internal shifts",     text: "Many notice steadier energy and subtle internal shifts" },
        { fromWeek: 9,  toWeek: 12, title: "Emerging patterns",   text: "Cycle patterns often start feeling more predictable" },
        { fromWeek: 13, toWeek: 16, title: "Clearer picture",     text: "Most people see clearer changes in overall well-being" }
      ]
    },

    period: {
      label: "Period and hygiene",
      primaryRatingLabel: "How would you rate your comfort during your cycle?",
      secondaryRatingLabel: "How regular does your cycle feel?",
      earlyWindowWeeks: 8,
      fullWindowWeeks: 12,
      why: "Period care needs 2 to 3 menstrual cycles to show consistent differences. Meaningful changes take 8 to 12 weeks.",
      goalSuggestions: ["Less discomfort", "More regular cycle", "Better hygiene routine", "Less bloating"],
      markers: ["Comfort during your period", "Cycle timing", "Bloating"],
      adjustTips: [
        "Use relief roll-on at the first sign of discomfort",
        "Keep intimate wash external only and use gentle water",
        "Take iron chewables consistently with water",
        "Log cycle changes week by week"
      ],
      milestones: [
        { fromWeek: 1,  toWeek: 4,  title: "First cycle",        text: "First cycle is for adjustment. Few changes visible yet" },
        { fromWeek: 5,  toWeek: 8,  title: "Second cycle",       text: "Second cycle often brings subtle differences in comfort" },
        { fromWeek: 9,  toWeek: 10, title: "Third cycle begins", text: "Patterns typically become clearer by third cycle" },
        { fromWeek: 11, toWeek: 12, title: "Clearer picture",    text: "Most people get a clear picture of improvement" }
      ]
    },

    wellness: {
      label: "General wellness",
      primaryRatingLabel: "How do you feel day to day right now?",
      secondaryRatingLabel: "How is your energy level?",
      earlyWindowWeeks: 4,
      fullWindowWeeks: 8,
      why: "Nutrients need 4 to 8 weeks of daily use to absorb steadily and support daily energy.",
      goalSuggestions: ["More energy", "Better sleep", "Improved immunity", "General well-being"],
      markers: ["Energy by afternoon", "Sleep quality", "How you feel day to day"],
      adjustTips: [
        "Take multivitamins at breakfast for regular absorption",
        "Maintain a fixed bedtime to evaluate sleep quality fairly",
        "Drink plenty of water across morning and afternoon",
        "Note down days with high work or travel stress"
      ],
      milestones: [
        { fromWeek: 1, toWeek: 2, title: "Getting started", text: "Nutrients absorb into body. Normal not to feel differences yet" },
        { fromWeek: 3, toWeek: 4, title: "Early shifts",    text: "Many notice slight lifts in morning energy" },
        { fromWeek: 5, toWeek: 6, title: "Building on it",  text: "Daily improvements feel steadier and more predictable" },
        { fromWeek: 7, toWeek: 8, title: "Settling in",     text: "Most feel meaningful difference in overall daily energy" }
      ]
    }
  },

  /* ---- Quiz options ---- */
  quiz: {
    concerns: [
      { value: "hair",     label: "Hair" },
      { value: "skin",     label: "Face" },
      { value: "bodyskin", label: "Body skin" },
      { value: "pcos",     label: "PCOS and hormones" },
      { value: "period",   label: "Period and hygiene" },
      { value: "wellness", label: "General wellness" }
    ],
    duration: [
      { value: "under3m", label: "Under 3 months" },
      { value: "3to12m",  label: "3 to 12 months" },
      { value: "over1y",  label: "Over a year" }
    ],
    startBuckets: [
      { value: "notYet",    title: "Not yet",        sub: "Starting today" },
      { value: "under1m",   title: "Under 1 month",  sub: "Just started" },
      { value: "1to3m",     title: "1 to 3 months",  sub: "Getting going" },
      { value: "over3m",    title: "3+ months",      sub: "Well in" }
    ],
    expectationBuckets: [
      { value: "under2w", title: "Under 2 weeks",  weeks: 2 },
      { value: "1m",      title: "About 1 month",  weeks: 4 },
      { value: "2to3m",   title: "2 to 3 months",  weeks: 10 },
      { value: "over6m",  title: "6 months or more", weeks: 26 },
      { value: "noIdea",  title: "No idea",        weeks: null }
    ],
    trackingMethods: [
      "I take photos or notes",
      "I go by feel",
      "I can't really tell",
      "I haven't tried"
    ],
    hardestOptions: [
      "Choosing the right product",
      "Not knowing how long it takes",
      "Remembering to use it",
      "Can't tell if it's working",
      "Results feel slow",
      "Side effects",
      "Nothing so far"
    ],
    triedBefore: {
      hair:     ["Home remedies", "OTC shampoos or oils", "Supplements", "Prescription treatment", "Nothing yet"],
      skin:     ["Home remedies", "OTC creams or face wash", "Supplements", "Prescription treatment", "Nothing yet"],
      bodyskin: ["Home remedies", "OTC creams or lotions", "Salon treatments", "Prescription treatment", "Nothing yet"],
      pcos:     ["Supplements", "Lifestyle changes", "Prescription medication", "Nothing yet"],
      period:   ["Home remedies", "Supplements", "Prescription medication", "Nothing yet"],
      wellness: ["Supplements", "Lifestyle changes", "Diet changes", "Nothing yet"]
    },
    routineTime: [
      { value: "morning", label: "Morning" },
      { value: "night",   label: "Night" },
      { value: "both",    label: "Both morning and night" }
    ]
  },

  /* ---- Product catalog (modelled on real range, verified) ---- */
  catalog: {
    hair: [
      { id: "hair-1", name: "Advanced hair growth serum (roll-on)", verify: true },
      { id: "hair-2", name: "Biotin hair gummies", verify: true },
      { id: "hair-3", name: "Hair growth pack", verify: true },
      { id: "hair-4", name: "Post-pregnancy hair gummies", verify: true }
    ],
    skin: [
      { id: "skin-1", name: "Acne care gel", verify: true },
      { id: "skin-2", name: "Niacinamide serum", verify: true },
      { id: "skin-3", name: "Gentle foaming face wash", verify: true },
      { id: "skin-4", name: "De-tan sunscreen lotion SPF 50", verify: true }
    ],
    bodyskin: [
      { id: "bodyskin-1", name: "Roll-on for underarm care", verify: true },
      { id: "bodyskin-2", name: "Salicylic acid body wash", verify: true },
      { id: "bodyskin-3", name: "Exfoliating AHA body scrub", verify: true },
      { id: "bodyskin-4", name: "Urea body lotion", verify: true }
    ],
    pcos: [
      { id: "pcos-1", name: "PCOS balance capsules", verify: true },
      { id: "pcos-2", name: "Plant protein powder", verify: true },
      { id: "pcos-3", name: "Inositol hormonal balance drink", verify: true }
    ],
    period: [
      { id: "period-1", name: "Period pain relief roll-on", verify: true },
      { id: "period-2", name: "Intimate foaming wash", verify: true },
      { id: "period-3", name: "Iron and folate daily chewables", verify: true }
    ],
    wellness: [
      { id: "wellness-1", name: "Daily multivitamin gummies", verify: true },
      { id: "wellness-2", name: "Plant omega-3 capsules", verify: true },
      { id: "wellness-3", name: "Vitamin C glowing skin effervescent", verify: true }
    ]
  },

  /* ---- Starter routine recommendations ---- */
  starterRoutines: {
    hair: [
      { productId: "hair-1", reason: "because you want to address hair shedding directly" },
      { productId: "hair-2", reason: "because nutritional support works from inside" },
      { productId: "hair-3", reason: "because a targeted routine supports scalp follicles" }
    ],
    skin: [
      { productId: "skin-1", reason: "because you want clearer skin" },
      { productId: "skin-3", reason: "because a gentle cleanser prepares your skin barrier" },
      { productId: "skin-4", reason: "because sun protection preserves your progress" }
    ],
    bodyskin: [
      { productId: "bodyskin-1", reason: "because it targets underarm care directly" },
      { productId: "bodyskin-2", reason: "because daily body wash helps clear rough skin" }
    ],
    pcos: [
      { productId: "pcos-1", reason: "because it supports hormonal balance" },
      { productId: "pcos-3", reason: "because inositol helps balance daily cycles" }
    ],
    period: [
      { productId: "period-1", reason: "because it eases discomfort during your cycle" },
      { productId: "period-3", reason: "because iron support is useful during periods" }
    ],
    wellness: [
      { productId: "wellness-1", reason: "because daily multivitamins cover nutrient gaps" },
      { productId: "wellness-2", reason: "because plant omega-3 supports overall wellness" }
    ]
  },

  /* ---- Verdict thresholds ---- */
  verdictRules: {
    consistencyLow: 0.6,
    consistencyHigh: 0.7,
    minRatingsForVerdict: 2
  },

  /* ---- Disclaimers ---- */
  disclaimers: {
    medical:  "Not medical advice. See a doctor if worried",
    settings: "Not medical advice. Does not diagnose or treat any condition",
    data:     "Saved on this device only",
    starter:  "Starting point, not a prescription"
  },

  /* ---- Verdict / stage messages ---- */
  stageMessages: {
    tooEarly:         "Normal so far. Most people need {weeks}+ weeks.",
    consistencyFirst: "{done} of {total} days done. Aim for steady.",
    onTrack:          "On track. Keep going.",
    doctorUnusual:    "You flagged something unusual. Check with a doctor.",
    doctorNoProgress: "Steady routine, no change yet. A doctor can help.",
    checkInAgain:     "Check in next week for your first verdict.",
    pastWindow:       "Past the usual window. A doctor can help if nothing's changed."
  },

  /* ---- Verdict names ---- */
  verdictNames: {
    tooEarly:    "Too early to tell",
    onTrack:     "On track",
    consistency: "Needs steadier routine",
    doctor:      "Talk to a doctor",
    checkIn:     "Keep going"
  },

  /* ---- Stage encouragement (max 14 words each) ---- */
  stageEncouragement: {
    tooEarly: "Early days often feel slow. Routine works under the surface.",
    onTrack:  "You are building steady momentum. Keep this going week by week.",
    late:     "Sticking with your routine this long brings most meaningful changes."
  },

  /* ---- Decide nudges ---- */
  decideNudges: {
    tooEarly:   "Early in usual window. Running out mid-course risks progress, so plan refill.",
    onTrack:    "On track. Plan refill around {date} to avoid gaps.",
    doctor:     "Before refilling, consider speaking with a doctor about what you see.",
    noVerdict:  "Keep routine going. Plan your refill so you stay consistent.",
    packDone:   "Your pack may have run out."
  },

  version: "2.0.0"
};
