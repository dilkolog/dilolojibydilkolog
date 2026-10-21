# Word pack

Turkish meanings, pronunciation, recordings, origins, synonyms/antonyms, part of speech, a noun's
gender (French, Spanish) and the word in the other two languages, for the most frequent words of
each language (frequency/SOURCE.md, up to 35 000 entries; a frequency-list form brings in the word it
belongs to), plus a table of those forms (a word of its own that is also a form, like "allons", links on
only to a frequent word) (allons → aller, went → go) for looking them up.
From **Wiktionary** via **Wiktextract** (https://kaikki.org, English edition dumps of 2026-10-03; Turkish
edition, https://kaikki.org/trwiktionary, dump of 2026-09-01).

Recordings for words that Wiktionary has none for: **Lingua Libre** on Wikimedia Commons
(Category:Lingua_Libre_pronunciation-fra, Lingua_Libre_pronunciation-eng, Lingua_Libre_pronunciation-spa,
CC BY-SA; the original files), listed by `scripts/fetch-commons-audio.ts`.

Example sentences (`c`, the 3 000 most frequent words, two each with Turkish): **Tatoeba**
(CC BY 2.0 FR), per-language exports; French and Spanish sentences without a Turkish translation of
their own take their English translation's. Added by `scripts/build-pack-sentences.ts`.

Content license: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/).
Changes: cut down to the fields above; Turkish meanings first from the Turkish Wiktionary's own short
glosses of the word (its main part of speech), then reached through English translation tables, ordered
by the word's own glosses, then from Turkish entries' translation tables (names, abbreviations and
definition-like glosses left out);
translations of senses tagged vulgar/offensive/derogatory left out; part of speech and gender from
the word's main (first) entry.

Built by `scripts/build-wordpack.ts` (version `2026-10-08.2`; 2026-10-20 yamaları elle uygulandı, sürüm `2026-10-20.1`, 2026-10-21'de Türkçe anlam ikinci turuyla `2026-10-21.1`: cinsiyet, Türkçe anlam, bozuk ses, bkz. docs/veri/README.md):
en 27 189 words (Turkish 50 %, recordings 81 %); fr 16 220 (Turkish 68 %, gender 57 %, recordings 95 %);
es 14 443 (Turkish 71 %, gender 59 %, recordings 55 %).
