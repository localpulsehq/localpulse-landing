export type BlogPost = {
  slug: string;
  title: string;
  date: string;
  category: string;
  excerpt: string;
  readingTime: string;
};

export const posts: BlogPost[] = [
  {
    slug: "turn-customer-feedback-into-weekly-fixes",
    title: "Turn customer feedback into weekly fixes",
    date: "2026-01-06",
    category: "Customer feedback",
    excerpt: "A simple way to read reviews and choose one fix each week.",
    readingTime: "4 min read",
  },
  {
    slug: "interpret-competitor-rating-gap",
    title: "How to interpret your competitor rating gap",
    date: "2026-01-03",
    category: "Local competition",
    excerpt: "When a 0.2 rating gap matters, and when it does not.",
    readingTime: "3 min read",
  },
];
