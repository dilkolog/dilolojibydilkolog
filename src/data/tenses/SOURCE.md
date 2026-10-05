# Tense tables

Built by `scripts/build-tenses.ts` (instructions at its top). Every form is checked against
several sources; a verb that can't be vouched for is left out.

- **French** (`fr.json`, 4,103 verbs from Lexique): [french-verbs](https://github.com/RosaeNLG/rosaenlg)
  and french-verbs-lefff (Apache-2.0; data from the Lefff lexicon by Benoît Sagot). Compared with
  UniMorph: the differences were spelling-reform variants (céderai/cèderai, both accepted) and
  UniMorph errors.
- **Spanish** (`es.json`, 1,293 verbs): forms in order of trust from the learner's own audit
  (`scripts/es-overrides.json`, from the diloloji project), Fred Jehle's Conjugated Spanish Verb
  Database (637 verbs, CC BY-NC-SA 3.0, compiled by B. Ghidinelli), UniMorph (CC BY-SA), the
  family's base verb (obtener like tener), and spanish-verbs (Apache-2.0) only where it proved
  reliable (-ar verbs, the imperfect, regular futures). Where Jehle and UniMorph both have a
  verb, their indefinido and imperfecto agree for 1,039 of 1,050 tables; the rest are
  2010-spelling variants (crie/crié, hui/huí) and Jehle rows with only third persons. A few
  -er/-ir verbs no source covers get the regular indefinido (absorbí, partió), but only outside
  every class that breaks it (strong stems, -ducir, vowel stems, -ñir, -ir verbs that change
  their stem); the rule matched all 164 verbs the authorities vouch for. Typos and foreign words
  in the diloloji list (apovar, enlargar) are left out by hand. The last few verbs no source
  covers (concluir, arrepentir, conceder…) were checked against Wiktionary's tables by hand
  (`scripts/es-checked.json`); atardecer is left without a subjunctive table, being impersonal.
Stored: French imparfait, futur, subjonctif présent, participe passé and auxiliary; Spanish
indefinido, imperfecto, futuro, participio and presente de subjuntivo (1,292 verbs: from Jehle,
UniMorph, the audit and base verbs, then the regular subjunctive built from a plain present —
adjunte, rocé → roce — which matched all 967 verbs the authorities vouch for; the library got
stem-changing verbs wrong, so it is not used for it). Compound tenses and the conditional (futur stem + imparfait endings) are put
together at runtime (src/engine/tenses.ts). French subjonctif and conditionnel were compared
with UniMorph: the differences were 1990-reform spellings (accepted), UniMorph's reflexive
pronouns and UniMorph errors (aillions, éxagère, mortifierois).
Because of the Jehle data, the Spanish table is for non-commercial use (CC BY-NC-SA).

## Example sentences

`es-sentences.json` (5,109 sentences, 885 verbs; condicional and subjuntivo included) is built by `scripts/build-tense-sentences.ts`
from the diloloji project's example sentences, which were written with AI help. A sentence is
kept only when exactly one form of the verb in that tense (from the tables above) appears in it
once and the form belongs to no other tense; the Turkish translations were sample-read and
the slips found are corrected in the script (TR_FIXES).

`fr-sentences.json` (5,165 sentences, 2,486 verbs; no présent) is built by
`scripts/build-tense-sentences-fr.ts` from Tatoeba (https://tatoeba.org, CC BY 2.0 FR):
fra_sentences, tur_sentences and fra-tur_links from downloads.tatoeba.org (2026-10-05). Kept
only when one form of the verb, unique to that tense and to that verb, appears once; a subject
pronoun before it must match its person; the subjonctif needs "que". Turkish translations (517)
are kept only when their verb endings fit the tense.

`fr-aspect.json` / `es-aspect.json`: passé composé or imparfait (indefinido or imperfecto)
choice items, built by the same two scripts. Only sentences with time words that settle the
tense (hier, il y a deux ans / autrefois, tous les jours; ayer, de repente / cuando era niño,
todos los días) and none for the other; the cue may not be the verb itself. Weak cues (souvent,
toujours, en 1990, ce matin, une fois que, que d'habitude) are left out on purpose.
