# CEFR word levels

The level (A1–C2) at which learner materials start using a word, one `word<TAB>level` per line,
level by level, most frequent first:

- English (`en.txt`):
  - A1–B2: **CEFR-J Vocabulary Profile (Version 1.5)**, compiled by Yukio Tono at Tokyo University
    of Foreign Studies (`http://www.cefr-j.org/`), distributed via Open Language Profiles
    (`openlanguageprofiles/olp-en-cefrj`, free for research and commercial use with attribution).
  - C1–C2: **Octanove Vocabulary Profile C1/C2 (Version 1.0)** by Octanove Labs, Creative Commons
    Attribution-ShareAlike 4.0 (`CC BY-SA 4.0`).
  - Within each level, headwords are ordered by frequency rank in `src/data/frequency/en.txt`;
    slash-separated British/American spellings (`airplane/aeroplane`) are expanded, and the earliest
    level across parts of speech is kept.
- French (`fr.txt`): **FLELex** (CRF version), frequencies in textbooks and simplified readers for
  French as a foreign language by level (UCLouvain CENTAL, https://cental.uclouvain.be/cefrlex/).
  François, Gala, Watrin & Fairon (2014), *FLELex: a graded lexical resource for French foreign
  learners*, LREC 2014.
- Spanish (`es.txt`): **ELELex**, the same for Spanish (UCLouvain CENTAL). François & De Cock
  (2017), *ELELex: a CEFR-graded lexical resource for Spanish as a foreign language*.

License note for `fr.txt` and `es.txt`: Creative Commons Attribution-NonCommercial-ShareAlike 4.0
(https://creativecommons.org/licenses/by-nc-sa/4.0/). Non-commercial: this app is personal; if it
is ever sold, `fr.txt` and `es.txt` must be replaced (`en.txt` carries no non-commercial clause).

Changes on FLELex / ELELex (`scripts/build-cefr.ts`): a word's level is the first level with a
frequency of at least 10 per million (FLELex) or use in three or more documents (ELELex), the
earliest of its parts of speech; tokenizer spacing undone (`c' est - à - dire` → `c'est-à-dire`,
`a_menudo` → `a menudo`); frequencies dropped.
