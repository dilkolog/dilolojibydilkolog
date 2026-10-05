# Conjugation data

Present indicative forms from **UniMorph** (Kirov et al.; Batsuren et al. 2022), CC BY-SA 3.0:
https://github.com/unimorph/fra and https://github.com/unimorph/spa

Spanish verbs UniMorph lacks (alentar) come from Fred Jehle's Conjugated Spanish Verb Database
(CC BY-NC-SA 3.0), as in `../tenses/SOURCE.md`.

Only verbs a learner is likely to meet are kept (French: verbs in Lexique 3.83, see
`../lexicon/SOURCE.md`; Spanish: infinitives in the frequency list and every verb in
`../tenses/es.json`, whose present would otherwise come from the rules: consolo for consuelo), and only where the hand
tables and safe rules in `src/engine/conjugation.ts` don't already give the same forms.
Rebuild with `scripts/build-conjugations.ts` (instructions at its top), before `scripts/build-tenses.ts`.
