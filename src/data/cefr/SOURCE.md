# CEFR word levels

The level (A1–C2) at which learner materials start using a word, one `word<TAB>level` per line,
level by level, most frequent first. Built by `scripts/build-cefr.ts` from the **CEFRLex** graded
lexicons of UCLouvain's CENTAL (https://cental.uclouvain.be/cefrlex/):

- French: **FLELex** (CRF version), frequencies in textbooks and simplified readers for French as a
  foreign language by level. François, Gala, Watrin & Fairon (2014), *FLELex: a graded lexical
  resource for French foreign learners*, LREC 2014.
- Spanish: **ELELex**, the same for Spanish. François & De Cock (2017), *ELELex: a CEFR-graded
  lexical resource for Spanish as a foreign language*.

License: Creative Commons Attribution-NonCommercial-ShareAlike 4.0
(https://creativecommons.org/licenses/by-nc-sa/4.0/). Non-commercial: this app is personal; if it
is ever sold, these files must go.

Changes: a word's level is the first level with a frequency of at least 10 per million (FLELex) or
use in three or more documents (ELELex), the earliest of its parts of speech; tokenizer spacing undone
(`c' est - à - dire` → `c'est-à-dire`, `a_menudo` → `a menudo`); frequencies dropped.
