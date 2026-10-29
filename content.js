/* ============================================================
   content.js — All copy, timelines, quiz options & thresholds.
   Edit this file to change content without touching logic.
   ============================================================ */

// eslint-disable-next-line no-unused-vars
const CONTENT = {

  brand: "Be Bodywise",
  appName: "Progress Companion",
  heroMessage: "See your progress, even when it's slow.",
  emphasis: "progress",

  /* ---- Landing flow (L1 & L2) ---- */
  landing: {
    wordmark: "Progress Companion",
    headline: "See your progress, even when it's slow",
    subline: "A daily companion. Set a goal, check in, and watch real change.",
    howItWorks: [
      { step: "1", title: "Set a goal", time: "About 1 minute." },
      { step: "2", title: "Check in daily", time: "10 seconds." },
      { step: "3", title: "See your results", time: "Every week." }
    ],
    benefits: [
      "Know what's normal, week by week",
      "Spot small changes you'd miss",
      "Stay on track, no pressure"
    ],
    privacyBadge: "Private. Saved only on your device.",
    cta: "Get started",
    intro: {
      heading: "Let's set you up",
      subline: "9 quick taps. About 90 seconds.",
      chapters: [
        { title: "About you", text: "Name, concern and your personal goal" },
        { title: "Your routine", text: "When you use it and past experience" },
        { title: "Your expectations", text: "Timeline pace and hardest struggles" }
      ],
      back: "Back",
      continue: "Continue"
    },
    draftPrompt: {
      title: "Pick up where you left off",
      text: "You have unsaved setup answers from earlier.",
      resume: "Continue",
      restart: "Start over"
    },
    placeholder: {
      title: "Set up your routine first",
      text: "Complete your quick setup to unlock this section.",
      cta: "Set up my plan"
    },
    panels: [
      {
        step: "1",
        title: "Set a goal",
        text: "Choose one focus area and a realistic timeframe.",
        detail: "About 1 minute."
      },
      {
        step: "2",
        title: "Check in daily",
        text: "Follow your morning and evening ritual steps.",
        detail: "10 seconds a day."
      },
      {
        step: "3",
        title: "See your results",
        text: "Track tangible micro-markers week by week.",
        detail: "Every week."
      }
    ]
  },

  /* ---- The Smart Fork (Section 1) ---- */
  fork: {
    question: "Do you already have a Bodywise product?",
    why: "We tailor your setup so you never see redundant recommendations.",
    options: [
      {
        id: "owned",
        title: "Yes, I have it with me",
        sub: "Set up your bathroom shelf and start your daily companion."
      },
      {
        id: "exploring",
        title: "No, I am exploring",
        sub: "Discover targeted formulas on the official Be Bodywise website."
      }
    ],
    discoveryHeader: "Curated Bodywise formulas",
    discoverySub: "Explore targeted solutions backed by clinical actives.",
    outboundBtn: "View on Be Bodywise",
    hasOrderedBtn: "I have ordered. Take me to setup."
  },

  /* ---- Curated Discovery Catalog for New Visitors ---- */
  discovery: [
    {
      concern: "hair",
      title: "Hair growth & density",
      product: "Advanced hair growth roll-on serum",
      benefit: "Redensyl and Procapil to target shedding at the root.",
      url: "https://bebodywise.com"
    },
    {
      concern: "skin",
      title: "Clear & balanced skin",
      product: "Niacinamide and Salicylic acid facial serum",
      benefit: "Regulates sebum, clears active acne and calms inflammation.",
      url: "https://bebodywise.com"
    },
    {
      concern: "bodyskin",
      title: "Smoother body texture",
      product: "Exfoliating AHA & BHA body wash",
      benefit: "Gently smooths bumps, strawberry legs, and rough patches.",
      url: "https://bebodywise.com"
    },
    {
      concern: "pcos",
      title: "Hormonal & cycle balance",
      product: "Inositol daily drink & PCOS capsules",
      benefit: "Supports natural ovulatory rhythm and steady daily energy.",
      url: "https://bebodywise.com"
    },
    {
      concern: "wellness",
      title: "Everyday nourishment",
      product: "Biotin hair & daily multivitamin gummies",
      benefit: "Essential micronutrients to build long-term wellness baselines.",
      url: "https://bebodywise.com"
    }
  ],

  /* ---- Daily Mindset & Motivation (14 rotating quotes) ---- */
  mindsetQuotes: [
    {
      quote: "Physical change is cellular before it is visible. Trust the routine.",
      author: "Biology truth"
    },
    {
      quote: "Missing a day does not reset your skin barrier. Pick right up.",
      author: "Gentle reminder"
    },
    {
      quote: "Wellness is a daily relationship with yourself, not a deadline.",
      author: "Steady mindset"
    },
    {
      quote: "Hair follicles take 90 days to rest. Today builds month three.",
      author: "Hair biology"
    },
    {
      quote: "Small daily habits quietly transform cells before mirrors show it.",
      author: "Quiet progress"
    },
    {
      quote: "Consistency over perfection: showing up today protects your baseline.",
      author: "Habit truth"
    },
    {
      quote: "Biology moves on its own clock. Patience is an active ingredient.",
      author: "Honest timeline"
    },
    {
      quote: "Celebrate today's application. Small repetitions build lasting results.",
      author: "Daily win"
    },
    {
      quote: "Skin cells renew every 28 days. You are feeding tomorrow's layer.",
      author: "Cellular renewal"
    },
    {
      quote: "Focus on today's ritual. Let the biological calendar do the rest.",
      author: "Calm focus"
    },
    {
      quote: "Doubt is normal when change is gradual. Keep your hands steady.",
      author: "Patience note"
    },
    {
      quote: "True self-care is quiet and consistent. You are making real progress.",
      author: "Daily reassurance"
    },
    {
      quote: "Hormones respond to gentle stability, not sudden pressure. Stay steady.",
      author: "Hormone harmony"
    },
    {
      quote: "Trust the compounding power of small habits logged every single day.",
      author: "Momentum note"
    }
  ],

  /* ---- Objective Micro-Markers (replacing vague 1-5 feel) ---- */
  microMarkers: {
    hair: [
      {
        id: "drain",
        name: "Shower drain test",
        hint: "Observe loose hair accumulation during washing.",
        options: [
          { val: 1, label: "Noticeable clump", score: 1 },
          { val: 2, label: "A few strands", score: 3 },
          { val: 3, label: "Minimal loose hair", score: 5 }
        ]
      },
      {
        id: "comb",
        name: "Pillow & comb check",
        hint: "Count loose strands on pillow or brush in the morning.",
        options: [
          { val: 1, label: "Many loose strands", score: 1 },
          { val: 2, label: "Occasional 2-3 hairs", score: 3 },
          { val: 3, label: "Clean brush & pillow", score: 5 }
        ]
      }
    ],
    skin: [
      {
        id: "texture",
        name: "Texture touch test",
        hint: "Gently glide fingertips across cheeks and forehead.",
        options: [
          { val: 1, label: "Rough or bumpy", score: 1 },
          { val: 2, label: "Smoothing out", score: 3 },
          { val: 3, label: "Smooth & soft", score: 5 }
        ]
      },
      {
        id: "breakouts",
        name: "Active flare-up count",
        hint: "Count newly emerging tender blemishes this week.",
        options: [
          { val: 1, label: "Active new spots", score: 1 },
          { val: 2, label: "Healing marks only", score: 3 },
          { val: 3, label: "Calm & clear", score: 5 }
        ]
      }
    ],
    bodyskin: [
      {
        id: "texture",
        name: "Body touch feel",
        hint: "Check underarms or thighs for bumps or roughness.",
        options: [
          { val: 1, label: "Bumpy or dry", score: 1 },
          { val: 2, label: "Gradually softening", score: 3 },
          { val: 3, label: "Even & hydrated", score: 5 }
        ]
      }
    ],
    pcos: [
      {
        id: "energy",
        name: "Daily energy stability",
        hint: "Observe mid-afternoon energy levels and crash tendencies.",
        options: [
          { val: 1, label: "Heavy crashes", score: 1 },
          { val: 2, label: "Moderate steady", score: 3 },
          { val: 3, label: "Calm & energized", score: 5 }
        ]
      }
    ],
    wellness: [
      {
        id: "vitality",
        name: "Morning freshness",
        hint: "Note how refreshed you feel waking up.",
        options: [
          { val: 1, label: "Sluggish & groggy", score: 1 },
          { val: 2, label: "Normal wakeup", score: 3 },
          { val: 3, label: "Refreshed & ready", score: 5 }
        ]
      }
    ]
  },

  /* ---- AM / PM Step-by-Step Daily Ritual Templates ---- */
  ritualTemplates: {
    hair: {
      am: [
        { id: "cleanse", text: "Wash scalp with lukewarm water" },
        { id: "serum", text: "Apply roll-on serum to parted thinning zones" },
        { id: "massage", text: "Gentle 60-second finger massage to absorb" }
      ],
      pm: [
        { id: "brush", text: "Gentle wide-tooth comb to clear tangles" },
        { id: "serum_pm", text: "Targeted drop application along hairline" },
        { id: "pillow", text: "Rest on clean pillowcase" }
      ]
    },
    skin: {
      am: [
        { id: "cleanse", text: "Wash with gentle foaming cleanser" },
        { id: "treat", text: "Apply 3-4 drops of active serum" },
        { id: "protect", text: "Layer broad-spectrum sunscreen lotion" }
      ],
      pm: [
        { id: "cleanse_pm", text: "Cleanse away daily dust and sebum" },
        { id: "repair", text: "Apply night barrier treatment cream" },
        { id: "hydrate", text: "Drink a glass of water before sleep" }
      ]
    },
    bodyskin: {
      am: [
        { id: "wash", text: "Use targeted active body cleanser in shower" },
        { id: "moisturize", text: "Smooth urea or ceramide lotion onto damp skin" }
      ],
      pm: [
        { id: "spot", text: "Apply roll-on care to target zones" }
      ]
    },
    pcos: {
      am: [
        { id: "supplement", text: "Take daily inositol or capsules with breakfast" },
        { id: "hydrate", text: "Hydrate with 500ml water" }
      ],
      pm: [
        { id: "winddown", text: "Quiet 10-minute winddown before sleep" }
      ]
    },
    wellness: {
      am: [
        { id: "gummy", text: "Chew daily multivitamin gummy with food" },
        { id: "water", text: "Start day with warm water" }
      ],
      pm: [
        { id: "rest", text: "Maintain regular sleep timing" }
      ]
    }
  },

  /* ---- Bottle Burn-Rate Copy ---- */
  burnRate: {
    title: "Bottle burn rate",
    usedLabel: "Doses used",
    daysLeftLabel: "Estimated days left",
    reorderAlert: "5 days of product left. Time to restock."
  },

  /* ---- Positive customer insights ---- */
  stats: {
    sampleSize: 7,
    sampleNote: "From customer interviews",
    tips: [
      { text: "Small, steady check-ins make change easier to see", id: "t1" },
      { text: "Tracking one clear marker shows real trends", id: "t2" },
      { text: "Patience and consistency build long-term wellness", id: "t3" }
    ],
    stageMapping: [
      { stage: "Set up",    finding: "Clear physical markers make gradual change visible" },
      { stage: "Timeline",  finding: "Honest biology timelines set a realistic, calm pace" },
      { stage: "Check-in",  finding: "Consistent daily tracking builds momentum over time" },
      { stage: "Results",   finding: "Weekly ratings show real progress trends clearly" },
      { stage: "Next step", finding: "Knowing your stage helps you adjust or continue" }
    ]
  },

  /* ---- Concern configs ---- */
  concerns: {

    hair: {
      label: "Hair",
      primaryRatingLabel: "How happy are you with your hair shedding?",
      secondaryRatingLabel: "How happy are you with your hair overall?",
            earlyWindowWeeks: 6,
      fullWindowWeeks: 12,
      typicalBand: [
        { week: 1, low: 1.8, high: 2.5 },
        { week: 4, low: 2.0, high: 2.8 },
        { week: 8, low: 2.3, high: 3.3 },
        { week: 12, low: 2.8, high: 3.9 },
        { week: 16, low: 3.2, high: 4.3 },
        { week: 20, low: 3.5, high: 4.6 },
        { week: 24, low: 3.8, high: 4.9 }
      ],
      verify: true,
      why: "Hair grows in cycles. Visible change needs time to emerge.",
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
      primaryRatingLabel: "How happy are you with your skin clarity?",
      secondaryRatingLabel: "How happy are you with your skin texture?",
      earlyWindowWeeks: 4,
      fullWindowWeeks: 8,
      why: "Skin renews gradually. Ingredients need a full renewal cycle.",
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
      primaryRatingLabel: "How happy are you with the affected area?",
      secondaryRatingLabel: "How happy are you with your skin texture?",
            earlyWindowWeeks: 6,
      fullWindowWeeks: 12,
      typicalBand: [
        { week: 1, low: 1.9, high: 2.5 },
        { week: 3, low: 2.2, high: 3.0 },
        { week: 6, low: 2.7, high: 3.7 },
        { week: 9, low: 3.3, high: 4.3 },
        { week: 12, low: 3.7, high: 4.8 }
      ],
      verify: true,
      why: "Body skin renews gradually. Texture changes take steady weeks.",
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
      primaryRatingLabel: "How happy are you with your symptom comfort?",
      secondaryRatingLabel: "How happy are you with your daily energy?",
            earlyWindowWeeks: 8,
      fullWindowWeeks: 16,
      typicalBand: [
        { week: 1, low: 1.9, high: 2.4 },
        { week: 4, low: 2.1, high: 2.9 },
        { week: 8, low: 2.6, high: 3.6 },
        { week: 12, low: 3.1, high: 4.2 },
        { week: 16, low: 3.6, high: 4.7 }
      ],
      verify: true,
      why: "Hormonal balance takes time. Daily support needs several months.",
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
      primaryRatingLabel: "How happy are you with your cycle comfort?",
      secondaryRatingLabel: "How happy are you with your cycle regularity?",
      earlyWindowWeeks: 8,
      fullWindowWeeks: 12,
      why: "Cycle care takes time. Steady changes emerge across cycles.",
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
      primaryRatingLabel: "How happy are you with your primary goal?",
      secondaryRatingLabel: "How happy are you with your overall balance?",
                        earlyWindowWeeks: 4,
      fullWindowWeeks: 8,
      typicalBand: [
        { week: 1, low: 2.0, high: 2.7 },
        { week: 2, low: 2.3, high: 3.2 },
        { week: 4, low: 2.9, high: 3.9 },
        { week: 6, low: 3.4, high: 4.4 },
        { week: 8, low: 3.8, high: 4.8 }
      ],
      verify: true,
      typicalBand: [
        { week: 1, low: 2.0, high: 2.6 },
        { week: 2, low: 2.2, high: 3.0 },
        { week: 4, low: 2.8, high: 3.8 },
        { week: 6, low: 3.3, high: 4.3 },
        { week: 8, low: 3.7, high: 4.8 }
      ],
      verify: true,
      typicalBand: [
        { week: 1, low: 1.9, high: 2.5 },
        { week: 2, low: 2.2, high: 3.0 },
        { week: 4, low: 2.7, high: 3.7 },
        { week: 6, low: 3.2, high: 4.2 },
        { week: 8, low: 3.7, high: 4.8 }
      ],
      verify: true,
      why: "Nutrients absorb over weeks. Steady energy builds with daily use.",
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

  /* ---- Rating scale labels ---- */
  ratingScaleLabels: ["Not good", "So-so", "Okay", "Good", "Great"],

  /* ---- Quiz options ---- */
  quiz: {
    whyWeAsk: {
      q1: "To greet you and personalize your daily space.",
      q2: "Different parts of the body renew at different speeds.",
      q3: "Helps us place you accurately on your timeline.",
      q4: "A specific change is easier to measure than general feel.",
      q5: "Helps tailor tips for what works best.",
      q6: "Habits stick better when tied to morning or night.",
      q7: "Lets us compare your expectations with biological timelines.",
      q8: "We personalize support around what trips you up.",
      q9: "Guides whether to watch photos, notes or physical signs."
    },
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
    calm:     "For tracking only. Not medical advice.",
    data:     "Saved on this device only",
    starter:  "Starting point, not a prescription"
  },

  /* ---- Verdict / stage messages ---- */
  stageMessages: {
    tooEarly:         "Normal so far. Most people need {weeks}+ weeks.",
    consistencyFirst: "{done} of {total} days done. Aim for steady.",
    onTrack:          "On track. Keep going.",
    closerUnusual:    "You flagged something unusual. Pause and check with a health professional.",
    closerNoProgress: "Steady routine, no change yet. Try changing one thing.",
    checkInAgain:     "Check in next week for your first verdict.",
    pastWindow:       "Past the usual window. Try a different approach."
  },

  /* ---- Verdict names ---- */
  verdictNames: {
    tooEarly:    "Too early to tell",
    onTrack:     "On track",
    consistency: "Needs steadier routine",
    closer:      "Needs a closer look",
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
    closer:     "Consider trying a different approach or speaking with a health professional.",
    noVerdict:  "Keep routine going. Plan your refill so you stay consistent.",
    packDone:   "Your pack may have run out."
  },
  /* ---- Typical band explanations ---- */
  typicalBandExplanation: "Many people see little change early on.",
  typicalBandStatus: {
    inside: "Inside the typical range",
    below: "A bit below typical range",
    above: "Above the typical range"
  },

  /* ---- Line-drawn SVG face scales (1 to 5) ---- */
  faces: [
    { value: 1, label: "Not good" },
    { value: 2, label: "So-so" },
    { value: 3, label: "Okay" },
    { value: 4, label: "Good" },
    { value: 5, label: "Great" }
  ],

  /* ---- Check-in & continuity deck ---- */
  checkin: {
    tapToCheckIn: "Tap to check in",
    doneForToday: "Done for today",
    seeYouTomorrow: "See you tomorrow",
    undo: "Undo",
    takeRestDay: "Take a rest day",
    restDayTaken: "Rest day taken",
    restDaySub: "Streak protected. See you tomorrow",
    addNote: "Add a note",
    saveNote: "Save note",
    notePlaceholder: "A quick note about today...",
    remindMeDaily: "Remind me daily",
    restLimitNotice: "Rest limit reached for this rolling week",
    yesterdayDone: "Yesterday · Done",
    yesterdayRest: "Yesterday · Rest day",
    yesterdayMissed: "Yesterday · Missed",
    yesterdayAddIt: "Add it",
    todayLabel: "Today · Day {day}",
    tomorrowLabel: "Tomorrow · Day {day}. Same time works best",
    welcomeBack: "Welcome back. Pick up today",
    backupNote: "Saved on this device. Back up to keep it safe",
    backupBtn: "Back up my data",
    restoreBtn: "Restore from backup",
    restoreConfirm: "Restore data from this backup? Your current device data will be updated",
    restoreSuccess: "Data restored",
    restoreError: "Could not read this backup file",
    newDayBanner: "New day. Day {day}"
  },

  /* ---- Support flow (Feeling stuck?) ---- */
  support: {
    title: "Feeling stuck?",
    step1Title: "What is making it hard?",
    step1Subtitle: "Choose what fits best right now",
    reasons: [
      { id: "slow", label: "Results feel slow" },
      { id: "cant_tell", label: "Can not tell if it is working" },
      { id: "forgetting", label: "I keep forgetting" },
      { id: "not_feeling_good", label: "I am not feeling good about it" },
      { id: "side_effects", label: "Side effects" },
      { id: "other", label: "Something else" }
    ],
    tailored: {
      slow: {
        title: "Patience takes practice",
        body: "Biological shifts take time. Notice subtle signs around week {week}.",
        action: "See my timeline",
        route: "#/expect"
      },
      cant_tell: {
        title: "Focus on one marker",
        body: "Judging overall change is tricky. Tracking one physical sign makes trends clearer.",
        action: "Pick a marker",
        route: "#/start"
      },
      forgetting: {
        title: "Anchor to your routine",
        body: "Linking your product to a daily habit makes remembering automatic.",
        action: "Remind me daily",
        isReminder: true
      },
      not_feeling_good: {
        title: "Be kind to yourself",
        body: "Progress is gradual. Every check-in counts toward your goal.",
        action: "Keep going",
        route: "#/home"
      },
      side_effects: {
        title: "Safety comes first",
        body: "Pause the product and check with a health professional.",
        action: "Pause routine",
        isPause: true
      },
      other: {
        title: "Adjust your pace",
        body: "Take a pause, review your notes, or continue when you feel ready.",
        action: "Keep going",
        route: "#/home"
      }
    },
    choicesTitle: "Choose your next step",
    choices: {
      keepGoing: "Keep going",
      pauseForNow: "Pause for now",
      imDone: "I am done"
    },
    pauseHeading: "Routine paused",
    pauseBody: "No check-ins expected. Your consistency will not be penalised.",
    resumeBtn: "Resume routine",
    doneHeading: "Your journey summary",
    doneBody: "Here is everything you logged. You can save your progress summary anytime."
  },

  /* ---- Week recap stories ---- */
  recap: {
    title: "Week recap",
    slide1Heading: "Week {week} done",
    slide1Sub: "{count} check-ins logged this week",
    slide1FreshSub: "A fresh week starts today. Every check-in counts",
    consistencyTitle: "Consistency",
    consistencySub: "{pct}% over the last 28 days · Best streak {streak} days",
    markerTitle: "Your marker",
    markerSub: "From {startRating} to {currentRating} out of 5",
    typicalTitle: "Typical range",
    typicalSub: "You are {status} for week {week}",
    memoryTitle: "Why you started",
    nextTitle: "Looking ahead",
    nextSub: "Next milestone: {milestone}",
    close: "Close"
  },

  /* ---- Journey three rings ---- */
  rings: {
    checkin: "Today's check-in",
    review: "Weekly review",
    consistency: "28-day consistency"
  },

  /* ---- Memory cards ---- */
  memory: {
    title: "Memory",
    weeksAgo: "{weeks} weeks ago you wrote",
    scoreChange: "Starting point was {start}/5. Today it is {current}/5"
  },

  /* ---- Closing and Footer ---- */
  closing: {
    title: "Small steps, every day",
    text: "Real change takes time. Your body is doing the quiet work."
  },
  footer: {
    line: "Built for quiet daily consistency.",
    privacy: "Private. Saved only on your device."
  },

  version: "3.0.0"
};
