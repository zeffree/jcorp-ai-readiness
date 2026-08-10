/**
 * JCorp AI Readiness Assessment — assessment framework.
 *
 * Structure follows the McKinsey AI Individual & Organizational Assessment:
 *   2 pillars -> 10 categories -> 22 sub-dimensions -> 44 statements.
 *
 * Statement wording is drafted for JCorp to reflect the framework's constructs;
 * it is not reproduced from any proprietary instrument. Edit the `text` fields
 * freely, but keep the `id` values stable once responses have been collected.
 */

export type PillarId = "personal" | "organizational";

export interface AssessmentItem {
  id: string;
  text: string;
  subDimensionId: string;
  categoryId: string;
  pillarId: PillarId;
}

export interface SubDimension {
  id: string;
  label: string;
  items: { id: string; text: string }[];
}

export interface Category {
  id: string;
  label: string;
  subDimensions: SubDimension[];
}

export interface Pillar {
  id: PillarId;
  label: string;
  question: string;
  categories: Category[];
}

export const SCALE_MIN = 1;
export const SCALE_MAX = 6;

/** 6-point agreement scale with no neutral midpoint. */
export const SCALE_OPTIONS = [
  { value: 1, label: "Strongly disagree", short: "SD" },
  { value: 2, label: "Disagree", short: "D" },
  { value: 3, label: "Somewhat disagree", short: "sd" },
  { value: 4, label: "Somewhat agree", short: "sa" },
  { value: 5, label: "Agree", short: "A" },
  { value: 6, label: "Strongly agree", short: "SA" },
] as const;

export interface ReadinessBand {
  id: string;
  label: string;
  min: number;
  max: number;
  description: string;
  color: string;
}

/** 0-100 index bands used consistently across respondent and admin views. */
export const READINESS_BANDS: ReadinessBand[] = [
  {
    id: "nascent",
    label: "Nascent",
    min: 0,
    max: 39.999,
    description:
      "Little foundation in place. AI is largely absent from how work is understood, resourced and led.",
    color: "#b91c1c",
  },
  {
    id: "emerging",
    label: "Emerging",
    min: 40,
    max: 54.999,
    description:
      "Early signals of intent, but enablers, fluency and organisational shifts are inconsistent.",
    color: "#ea580c",
  },
  {
    id: "developing",
    label: "Developing",
    min: 55,
    max: 69.999,
    description:
      "Real momentum in parts of the organisation, with clear gaps that limit scale.",
    color: "#ca8a04",
  },
  {
    id: "advanced",
    label: "Advanced",
    min: 70,
    max: 84.999,
    description:
      "Strong and broadly consistent readiness. Focus shifts to depth, redesign and sustained behaviour change.",
    color: "#0d9488",
  },
  {
    id: "leading",
    label: "Leading",
    min: 85,
    max: 100,
    description:
      "Readiness is a genuine strength. The organisation is positioned to operate in an agentic way.",
    color: "#15803d",
  },
];

export const FRAMEWORK: Pillar[] = [
  {
    id: "personal",
    label: "Personal readiness",
    question:
      "Do individual employees feel supported, able, and willing to work differently with AI?",
    categories: [
      {
        id: "enablers",
        label: "Enablers",
        subDimensions: [
          {
            id: "understanding-conviction",
            label: "Understanding and conviction",
            items: [
              {
                id: "P-ENB-UC-1",
                text: "I clearly understand why my organisation is investing in AI and what it is trying to achieve.",
              },
              {
                id: "P-ENB-UC-2",
                text: "I believe AI will make a meaningful positive difference to the work my team does.",
              },
            ],
          },
          {
            id: "leader-commitment",
            label: "Leader commitment",
            items: [
              {
                id: "P-ENB-LC-1",
                text: "My immediate leaders visibly champion the use of AI in our day-to-day work.",
              },
              {
                id: "P-ENB-LC-2",
                text: "Senior leadership in my organisation has made AI adoption a clear and consistent priority.",
              },
            ],
          },
          {
            id: "tools-systems",
            label: "Tools and systems",
            items: [
              {
                id: "P-ENB-TS-1",
                text: "I have access to the AI tools I need to do my job well.",
              },
              {
                id: "P-ENB-TS-2",
                text: "The AI tools available to me work reliably and connect to the systems and data I use.",
              },
            ],
          },
          {
            id: "support-training",
            label: "Support and training",
            items: [
              {
                id: "P-ENB-ST-1",
                text: "I have been given enough training to use AI tools effectively in my role.",
              },
              {
                id: "P-ENB-ST-2",
                text: "When I get stuck with an AI tool, I know where to go for help and I get it quickly.",
              },
            ],
          },
          {
            id: "daily-work-adaptation",
            label: "Daily work adaptation",
            items: [
              {
                id: "P-ENB-DW-1",
                text: "I have been given time and space to change how I work in order to use AI.",
              },
              {
                id: "P-ENB-DW-2",
                text: "My team's processes and ways of working have been adjusted to make room for AI.",
              },
            ],
          },
          {
            id: "risk-compliance",
            label: "Risk and compliance",
            items: [
              {
                id: "P-ENB-RC-1",
                text: "I am clear on what I am and am not allowed to do with AI at work.",
              },
              {
                id: "P-ENB-RC-2",
                text: "Our AI policies and approval processes are practical and do not unnecessarily block useful work.",
              },
            ],
          },
          {
            id: "experimentation",
            label: "Experimentation",
            items: [
              {
                id: "P-ENB-EX-1",
                text: "I am encouraged to experiment with AI, even when some attempts will fail.",
              },
              {
                id: "P-ENB-EX-2",
                text: "In my team, mistakes made while genuinely trying new AI approaches are treated as learning, not failure.",
              },
            ],
          },
          {
            id: "trust-in-organization",
            label: "Trust in the organization",
            items: [
              {
                id: "P-ENB-TR-1",
                text: "I trust my organisation to use AI in a way that is fair to employees.",
              },
              {
                id: "P-ENB-TR-2",
                text: "I believe my organisation is being open and honest about how AI will affect jobs and roles.",
              },
            ],
          },
        ],
      },
      {
        id: "fluency",
        label: "Fluency",
        subDimensions: [
          {
            id: "self-efficacy",
            label: "Self-efficacy",
            items: [
              {
                id: "P-FLU-SE-1",
                text: "I am confident in my ability to get good results from AI tools.",
              },
              {
                id: "P-FLU-SE-2",
                text: "I can judge when an AI output is good enough to use and when it needs to be challenged.",
              },
            ],
          },
          {
            id: "ai-usage",
            label: "AI usage",
            items: [
              {
                id: "P-FLU-AU-1",
                text: "I use AI tools regularly as part of my normal working week.",
              },
              {
                id: "P-FLU-AU-2",
                text: "I use AI for substantive parts of my work, not just simple or one-off tasks.",
              },
            ],
          },
          {
            id: "responsible-ai-usage",
            label: "Responsible AI usage",
            items: [
              {
                id: "P-FLU-RA-1",
                text: "I always check AI outputs for accuracy, bias and sensitivity before acting on them.",
              },
              {
                id: "P-FLU-RA-2",
                text: "I am careful about what information I put into AI tools and follow our data protection rules.",
              },
            ],
          },
        ],
      },
      {
        id: "intention",
        label: "Intention",
        subDimensions: [
          {
            id: "intention-to-use-ai",
            label: "Intention to use AI",
            items: [
              {
                id: "P-INT-IU-1",
                text: "I intend to increase my use of AI in my work over the coming year.",
              },
              {
                id: "P-INT-IU-2",
                text: "I actively look for new ways to apply AI to the problems I work on.",
              },
            ],
          },
          {
            id: "readiness-for-ai-centric-work",
            label: "Readiness for AI-centric work",
            items: [
              {
                id: "P-INT-RW-1",
                text: "I am willing to significantly change how I do my job as AI capabilities advance.",
              },
              {
                id: "P-INT-RW-2",
                text: "I am prepared to learn new skills and take on a different kind of role in an AI-driven organisation.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "organizational",
    label: "Organizational readiness",
    question:
      "Do leaders perceive their organization as ready to make the shifts needed for an agentic future?",
    categories: [
      {
        id: "strategy",
        label: "Strategy",
        subDimensions: [
          {
            id: "road-map",
            label: "Road map",
            items: [
              {
                id: "O-STR-RM-1",
                text: "My organisation has a clear, documented AI roadmap with defined priorities and milestones.",
              },
              {
                id: "O-STR-RM-2",
                text: "Our AI roadmap is directly tied to the business outcomes we are accountable for.",
              },
            ],
          },
          {
            id: "resource-allocation",
            label: "Resource allocation",
            items: [
              {
                id: "O-STR-RA-1",
                text: "My organisation has committed enough funding and people to deliver on its AI ambitions.",
              },
              {
                id: "O-STR-RA-2",
                text: "We reallocate resources decisively towards AI initiatives that are working.",
              },
            ],
          },
        ],
      },
      {
        id: "workflows",
        label: "Workflows",
        subDimensions: [
          {
            id: "workflow-redesign",
            label: "Workflow redesign",
            items: [
              {
                id: "O-WFL-WR-1",
                text: "My organisation is genuinely redesigning end-to-end workflows around AI, not just adding AI to existing steps.",
              },
              {
                id: "O-WFL-WR-2",
                text: "We have redesigned at least one core process so that AI does substantial work within it.",
              },
            ],
          },
        ],
      },
      {
        id: "talent",
        label: "Talent",
        subDimensions: [
          {
            id: "strategic-workforce-planning",
            label: "Strategic workforce planning",
            items: [
              {
                id: "O-TAL-WP-1",
                text: "My organisation has a clear view of how AI will change the roles and skills we need.",
              },
              {
                id: "O-TAL-WP-2",
                text: "We have a concrete plan to reskill, redeploy or hire for the capabilities an AI-driven organisation requires.",
              },
            ],
          },
        ],
      },
      {
        id: "structure",
        label: "Structure",
        subDimensions: [
          {
            id: "organizational-redesign",
            label: "Organizational redesign",
            items: [
              {
                id: "O-STC-OR-1",
                text: "My organisation is willing to change its structure and reporting lines to capture value from AI.",
              },
              {
                id: "O-STC-OR-2",
                text: "Decision rights and team structures have been adjusted so AI-enabled work can move quickly.",
              },
            ],
          },
          {
            id: "governance",
            label: "Governance",
            items: [
              {
                id: "O-STC-GV-1",
                text: "We have clear governance covering AI risk, data, and accountability for AI-driven decisions.",
              },
              {
                id: "O-STC-GV-2",
                text: "Our AI governance enables progress at pace rather than slowing good initiatives down.",
              },
            ],
          },
        ],
      },
      {
        id: "leadership",
        label: "Leadership",
        subDimensions: [
          {
            id: "leader-fluency",
            label: "Leader fluency",
            items: [
              {
                id: "O-LDR-LF-1",
                text: "Leaders in my organisation are personally fluent enough in AI to make sound decisions about it.",
              },
              {
                id: "O-LDR-LF-2",
                text: "Our leaders use AI in their own work and set the example they expect from others.",
              },
            ],
          },
        ],
      },
      {
        id: "culture-and-skills",
        label: "Culture and skills",
        subDimensions: [
          {
            id: "behavior-shifts",
            label: "Behavior shifts",
            items: [
              {
                id: "O-CUL-BS-1",
                text: "The behaviours needed for an AI-driven organisation — experimentation, data-led decisions, fast learning — are visibly rewarded here.",
              },
              {
                id: "O-CUL-BS-2",
                text: "My organisation is changing how people actually behave day to day, not just what it says about AI.",
              },
            ],
          },
        ],
      },
      {
        id: "hr-and-talent-system",
        label: "HR and talent system",
        subDimensions: [
          {
            id: "hr-transformation",
            label: "HR transformation",
            items: [
              {
                id: "O-HRT-HT-1",
                text: "Our HR processes — hiring, performance, progression, reward — have been updated to reflect AI-enabled ways of working.",
              },
              {
                id: "O-HRT-HT-2",
                text: "HR is an active driver of the AI transition in my organisation, not a bystander.",
              },
            ],
          },
        ],
      },
    ],
  },
];

/** Flat list of all 44 statements, each carrying its full lineage. */
export const ALL_ITEMS: AssessmentItem[] = FRAMEWORK.flatMap((pillar) =>
  pillar.categories.flatMap((category) =>
    category.subDimensions.flatMap((subDimension) =>
      subDimension.items.map((item) => ({
        id: item.id,
        text: item.text,
        subDimensionId: subDimension.id,
        categoryId: category.id,
        pillarId: pillar.id,
      })),
    ),
  ),
);

export const ALL_ITEM_IDS: string[] = ALL_ITEMS.map((item) => item.id);

export const ITEM_BY_ID: Record<string, AssessmentItem> = Object.fromEntries(
  ALL_ITEMS.map((item) => [item.id, item]),
);

export interface FlatSubDimension extends SubDimension {
  categoryId: string;
  categoryLabel: string;
  pillarId: PillarId;
  pillarLabel: string;
}

export const ALL_SUB_DIMENSIONS: FlatSubDimension[] = FRAMEWORK.flatMap(
  (pillar) =>
    pillar.categories.flatMap((category) =>
      category.subDimensions.map((subDimension) => ({
        ...subDimension,
        categoryId: category.id,
        categoryLabel: category.label,
        pillarId: pillar.id,
        pillarLabel: pillar.label,
      })),
    ),
);

export interface FlatCategory extends Category {
  pillarId: PillarId;
  pillarLabel: string;
}

export const ALL_CATEGORIES: FlatCategory[] = FRAMEWORK.flatMap((pillar) =>
  pillar.categories.map((category) => ({
    ...category,
    pillarId: pillar.id,
    pillarLabel: pillar.label,
  })),
);

export const SUB_DIMENSION_BY_ID: Record<string, FlatSubDimension> =
  Object.fromEntries(ALL_SUB_DIMENSIONS.map((sub) => [sub.id, sub]));

export const CATEGORY_BY_ID: Record<string, FlatCategory> = Object.fromEntries(
  ALL_CATEGORIES.map((category) => [category.id, category]),
);

export const PILLAR_LABELS: Record<PillarId, string> = {
  personal: "Personal readiness",
  organizational: "Organizational readiness",
};

/**
 * Questionnaire screens. Categories are grouped into balanced screens of four
 * to eight statements so no single page feels like a wall of text.
 */
const SCREEN_PLAN: {
  id: string;
  title: string;
  subDimensionIds: string[];
}[] = [
  {
    id: "enablers-1",
    title: "Enablers — understanding, leadership and tools",
    subDimensionIds: [
      "understanding-conviction",
      "leader-commitment",
      "tools-systems",
      "support-training",
    ],
  },
  {
    id: "enablers-2",
    title: "Enablers — how you work and how it feels",
    subDimensionIds: [
      "daily-work-adaptation",
      "risk-compliance",
      "experimentation",
      "trust-in-organization",
    ],
  },
  {
    id: "fluency",
    title: "Fluency",
    subDimensionIds: ["self-efficacy", "ai-usage", "responsible-ai-usage"],
  },
  {
    id: "intention",
    title: "Intention",
    subDimensionIds: ["intention-to-use-ai", "readiness-for-ai-centric-work"],
  },
  {
    id: "strategy-workflows",
    title: "Strategy and workflows",
    subDimensionIds: ["road-map", "resource-allocation", "workflow-redesign"],
  },
  {
    id: "talent-structure",
    title: "Talent and structure",
    subDimensionIds: [
      "strategic-workforce-planning",
      "organizational-redesign",
      "governance",
    ],
  },
  {
    id: "leadership-culture-hr",
    title: "Leadership, culture and HR",
    subDimensionIds: ["leader-fluency", "behavior-shifts", "hr-transformation"],
  },
];

export const QUESTION_SCREENS = SCREEN_PLAN.map((screen) => {
  const subs = screen.subDimensionIds.map((id) => {
    const sub = SUB_DIMENSION_BY_ID[id];
    if (!sub) throw new Error(`Unknown sub-dimension in screen plan: ${id}`);
    return sub;
  });

  return {
    id: screen.id,
    title: screen.title,
    pillarId: subs[0].pillarId,
    pillarLabel: subs[0].pillarLabel,
    items: subs.flatMap((sub) =>
      sub.items.map((item) => ({
        id: item.id,
        text: item.text,
        subDimensionLabel: sub.label,
        categoryLabel: sub.categoryLabel,
      })),
    ),
  };
});

export function bandFor(score: number): ReadinessBand {
  const clamped = Math.max(0, Math.min(100, score));
  return (
    READINESS_BANDS.find(
      (band) => clamped >= band.min && clamped <= band.max,
    ) ?? READINESS_BANDS[0]
  );
}
