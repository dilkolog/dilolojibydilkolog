/**
 * Lessons that were merged into another: the old topic (what saved progress, links and bookmarks still call it) →
 * the lesson that stays. The English `cleft` and `subjunctive` lessons repeated `basics_en_cleft_variations` and
 * `basics_en_subjunctive_mandative`; the kept lessons also teach the grammar topics of the same names.
 */
export const LESSON_ALIASES: Readonly<Record<string, string>> = {
  cleft: 'basics_en_cleft_variations',
  subjunctive: 'basics_en_subjunctive_mandative',
}

/** The topic a lesson is kept under now. */
export const canonicalTopic = (topic: string): string => LESSON_ALIASES[topic] ?? topic
