# Tense tables

Built by `scripts/build-tenses.ts` (instructions at its top). Every form is checked against
several sources; a verb that can't be vouched for is left out.

- **French** (`fr.json`, 4,103 verbs from Lexique): [french-verbs](https://github.com/RosaeNLG/rosaenlg)
  and french-verbs-lefff (Apache-2.0; data from the Lefff lexicon by Benoît Sagot). Compared with
  UniMorph: the differences were spelling-reform variants (céderai/cèderai, both accepted) and
  UniMorph errors.
- **Spanish** (`es.json`, 1,208 verbs): forms in order of trust from the learner's own audit
  (`scripts/es-overrides.json`, from the diloloji project), Fred Jehle's Conjugated Spanish Verb
  Database (637 verbs, CC BY-NC-SA 3.0, compiled by B. Ghidinelli), UniMorph (CC BY-SA), the
  family's base verb (obtener like tener), and spanish-verbs (Apache-2.0) only where it proved
  reliable (-ar verbs, the imperfect, regular futures).

Stored: French imparfait, futur, subjonctif présent, participe passé and auxiliary; Spanish
indefinido, imperfecto, futuro, participio and presente de subjuntivo (1,170 verbs: from Jehle,
UniMorph, the audit and base verbs only; the library got stem-changing verbs wrong, so it is not
used for it). Compound tenses and the conditional (futur stem + imparfait endings) are put
together at runtime (src/engine/tenses.ts). French subjonctif and conditionnel were compared
with UniMorph: the differences were 1990-reform spellings (accepted), UniMorph's reflexive
pronouns and UniMorph errors (aillions, éxagère, mortifierois).
Because of the Jehle data, the Spanish table is for non-commercial use (CC BY-NC-SA).

## Example sentences

`es-sentences.json` (4,847 sentences, 834 verbs; condicional and subjuntivo included) is built by `scripts/build-tense-sentences.ts`
from the diloloji project's example sentences, which were written with AI help. A sentence is
kept only when exactly one form of the verb in that tense (from the tables above) appears in it
once and the form belongs to no other tense; the Turkish translations were sample-read and
the slips found are corrected in the script (TR_FIXES).
