import { analyzeText } from './reading'
import { textForms } from './textForms'
import type { Tense } from './tenses'
import type { TargetLanguage } from './types'

/** A text the learner owns, or a pile of sentences: where the examples of a lesson are looked for. */
export interface OwnSource {
  title: string
  text: string
}

/** A sentence of the learner's own that shows what a lesson teaches, with the stretch that shows it. */
export interface OwnExample {
  sentence: string
  source: string
  /** The part of the sentence that is the lesson's point (character offsets), when it is known. */
  mark?: { start: number; end: number }
}

/** A word-bounded pattern (the letters of every language count as letters, unlike `\b`). */
const words = (src: string) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${src})(?![\\p{L}\\p{N}])`, 'iu')

/**
 * What a pattern can see of the topics that are not a tense: a word, a frame, an ending. They are rough on purpose
 * (a sentence shown for the wrong reason is a small miss; a topic with no pattern shows nothing), so a lesson only
 * lists topics a pattern finds right most of the time. A topic missing here has no "your own sentences" section.
 */
const PATTERNS: Record<string, RegExp> = {
  // French
  negation_fr: words("n(?:e|')\\s*(?:\\p{L}+\\s+){0,3}?(?:plus|jamais|rien|personne|aucune?|guère)"),
  basics_fr_negation: words("n(?:e|')\\s*(?:\\p{L}+\\s+){0,3}?(?:pas|plus|jamais|rien|personne|aucune?|guère)"),
  pronoms_y_en: words("(?:je|j'|tu|il|elle|on|nous|vous|ils|elles)\\s*(?:ne\\s+|n')?(?:en|y)\\s+(?!a\\b|avait\\b|aura\\b)\\p{L}+"),
  pronoms_relatifs: words("dont|lequel|laquelle|lesquel(?:le)?s|auquel|duquel|auxquel(?:le)?s|desquel(?:le)?s"),
  conn_fr: words('pourtant|cependant|néanmoins|toutefois|bien que|quoique|puisque|afin que|tandis que|alors que|malgré'),
  discours_indirect_fr: words("(?:il|elle|ils|elles|je|on)\\s+(?:a|ont|avait|avaient)?\\s*(?:dit|demandé|répondu|expliqué|affirmé|annoncé)\\s+(?:que|qu'|de|si)"),
  basics_fr_depuis: words("depuis|il y a|pendant|ça fait"),
  basics_fr_passif: words("(?:est|sont|était|étaient|a été|ont été|sera|seront)\\s+\\p{L}+(?:é|és|ée|ées|i|is|ie|ies|u|us)\\s+par"),
  basics_fr_gerondif: words("en\\s+\\p{L}+ant"),
  basics_fr_participe_gerondif: words("en\\s+\\p{L}+ant"),
  basics_fr_si_concordance: words("si\\s+(?:je|j'|tu|il|elle|on|nous|vous|ils|elles)"),
  basics_fr_c_est_vs_il_est: words("c'est|ce sont|il est|elle est"),
  basics_fr_comparaison: words("(?:plus|moins|aussi)\\s+\\p{L}+\\s+(?:que|qu')"),
  inversion: words("\\p{L}+-(?:t-)?(?:il|elle|on|ils|elles|je|nous|vous)"),
  basics_fr_etre_avoir: words("(?:je|tu|il|elle|on|nous|vous|ils|elles)\\s+(?:suis|es|est|sommes|êtes|sont|ai|as|a|avons|avez|ont)|j'ai"),
  articles_quantite: words("(?:du|de la|de l')\\s*\\p{L}+|(?:beaucoup|peu|trop|assez|plus|moins|pas|un peu|autant)\\s+(?:de|d')\\s*\\p{L}+|(?:un kilo|une bouteille|un verre|une tasse|un morceau|une tranche)\\s+(?:de|d')\\s*\\p{L}+"),
  prep_fr: words("(?:besoin|envie|peur|habitude|l'intention|le droit|la chance|le temps)\\s+(?:de|d')\\s*\\p{L}+|(?:commenc|continu|appren|aid|invit|réussi|hésit)\\p{L}*\\s+à\\s+\\p{L}+|(?:décid|essay|oubli|refus|fini|rêv|accept|permet|promet)\\p{L}*\\s+(?:de|d')\\s*\\p{L}+"),
  basics_fr_possessifs: words("(?:mon|ma|mes|ton|ta|tes|son|sa|ses|notre|nos|votre|vos|leurs?|cet|cette|ces)\\s+\\p{L}+|ce\\s+(?!qui\\b|que\\b|qu'|n')\\p{L}+"),
  basics_fr_nombres: words("(?:vingt|trente|quarante|cinquante|soixante|quatre-vingts?|cent|mille)(?:-\\p{L}+)*|(?:il est|à)\\s+\\p{L}+\\s+heures?"),
  basics_fr_questions: words("(?:où|quand|comment|pourquoi|combien|est-ce que|qu'est-ce que|qu'est-ce qui|quel(?:le)?s?)(?=[^?]*\\?)"),
  basics_fr_lieux: words("chez\\s+\\p{L}+|(?:à côté|près|loin)\\s+(?:de|du|des|d')|(?:devant|derrière|sous|sur|dans|entre)\\s+(?:la|le|l'|les|un|une|mon|ma|mes|ton|ta|son|sa)\\b|(?:en|au|aux)\\s+(?:France|Espagne|Italie|Allemagne|Angleterre|Suisse|Belgique|Turquie|Chine|Inde|Russie|Grèce|Pologne|Portugal|Japon|Maroc|Canada|Brésil|Mexique|États-Unis|Argentine|Algérie|Tunisie|Égypte)"),
  basics_fr_prepositions_geographie: words("(?:en|au|aux)\\s+(?:France|Espagne|Italie|Allemagne|Angleterre|Suisse|Belgique|Turquie|Chine|Inde|Russie|Grèce|Pologne|Portugal|Japon|Maroc|Canada|Brésil|Mexique|États-Unis|Argentine|Algérie|Tunisie|Égypte)|à\\s+(?:Paris|Lyon|Marseille|Madrid|Londres|Rome|Berlin|Istanbul|Ankara|Genève|Bruxelles|Montréal|Nice|Toulouse|Lille|Bordeaux)"),
  basics_fr_pronominaux: words("(?:je\\s+me|tu\\s+te|(?:il|elle|on|ils|elles)\\s+se|nous\\s+nous|vous\\s+vous)\\s+(?!le\\b|la\\b|les\\b|l')\\p{L}+|je\\s+m'(?!en\\b|y\\b)\\p{L}+|(?:il|elle|on|ils|elles)\\s+s'(?!il\\b|ils\\b)\\p{L}+"),
  basics_fr_ordre_pronoms: words("(?:me|te|nous|vous)\\s+(?:le|la|les)\\s+\\p{L}+|(?:me|te|nous|vous)\\s+l'\\p{L}+|(?:le|la|les)\\s+(?:lui|leur)\\s+\\p{L}+"),
  basics_fr_double_pronoms_imperatif: words("\\p{L}+-(?:le|la|les)-(?:moi|toi|lui|nous|vous|leur)|\\p{L}+-(?:moi|toi|nous|lui|leur)-(?:en|y)|ne\\s+(?:me|te|nous|vous)\\s+(?:le|la|les)\\s+\\p{L}+\\s+pas"),
  basics_fr_adverbes: words("(?!(?:moment|gouvernement|appartement|vêtement|département|document|sentiment|logement|bâtiment|changement|mouvement|traitement|établissement|développement|environnement|enseignement|médicament|événement|instrument|argument|élément|fonctionnement|comportement|règlement|monument|paiement|jugement)(?![\\p{L}]))\\p{L}{3,}ment"),
  basics_fr_concession: words("quoique|encore que|bien que|même si|quand bien même|tout\\s+\\p{L}+\\s+qu(?:e|')"),
  basics_fr_mise_en_relief: words("c'est\\s+(?:\\p{L}+\\s+){1,4}?(?:qui|que|qu')|ce\\s+(?:qui|que|qu')\\s*(?:\\p{L}+\\s+){0,4}?c'est"),
  basics_fr_cause_consequence: words("étant donné que|faute de|si bien que|de sorte que|puisque|parce que|c'est pourquoi|grâce à|à cause de|en raison de|par conséquent|du fait que"),
  basics_fr_demonstratifs: words("celui|celle|ceux|celles|ceci|cela|celui-ci|celle-ci|ceux-ci|celles-ci|celui-là|celle-là"),
  basics_fr_faire_causatif: words("(?:fait|faire|faisons|font|fais|faisait|fera|laisse|laisser|laissé|laissent)\\s+(?:\\p{L}+\\s+)?\\p{L}+(?:er|ir|re)"),
  basics_fr_ne_expletif: words("(?:avant que|à moins que|de peur que|de crainte que|je crains que|il a peur que|empêcher que)\\s+\\p{L}+\\s+ne\\b"),
  basics_fr_verbes_prepositions_a_de: words("(?:pense|penses|pensons|pensez|pensent|pensait|penser|jouer|joue|joues|jouons|jouez|jouent|joué|parle|parles|parlons|parlez|parlent|parler)\\s+(?:à|au|aux|de|du|des)\\s+\\p{L}+"),
  basics_fr_tout_tous_usages: words("tout|toute|tous|toutes"),
  basics_fr_accords_pronominaux_cod: words("(?:je\\s+me\\s+suis|tu\\s+t'es|(?:il|elle|on)\\s+s'est|nous\\s+nous\\s+sommes|vous\\s+vous\\s+êtes|(?:ils|elles)\\s+se\\s+sont)\\s+\\p{L}+"),
  basics_fr_subjonctif_conjonctions: words("bien que|pour que|avant que|afin que|à condition que|jusqu'à ce que|quoique|sans que|pourvu que|à moins que|de peur que|en attendant que|il faut que|il faudrait que|je veux que|je voudrais que"),
  basics_fr_pronoms_relatifs_composes: words("lequel|laquelle|lesquels|lesquelles|auquel|auxquels|auxquelles|duquel|desquels|desquelles"),
  basics_fr_questions_inversion: words("\\p{L}+-(?:t-)?(?:il|elle|on|ils|elles|je|nous|vous)"),
  basics_fr_savoir_connaitre: words('sais|sait|savons|savez|savent|connais|connaît|connaissons|connaissez|connaissent'),
  basics_fr_infinitif_passe: words("après\\s+(?:avoir|être|s'être)\\s+\\p{L}+"),
  basics_fr_connecteurs_argumentation: words("en effet|en revanche|d'ailleurs|en outre|de surcroît|certes|dès lors|en définitive|par conséquent"),
  // Spanish
  por_para: words('por|para'),
  ser_estar: words('es|son|era|eran|fue|fueron|soy|eres|somos|está|están|estaba|estaban|estoy|estás|estamos|estuvo'),
  relativos_es: words('quien|quienes|cuy[oa]s?|lo cual|el cual|la cual|los cuales|las cuales|lo que|el que|la que|los que|las que'),
  basics_es_que_quien_el_que: words('quien|quienes|cuy[oa]s?|lo cual|el cual|la cual|los cuales|las cuales|lo que|el que|la que|los que|las que'),
  comparativos_es: words('(?:más|menos)\\s+\\p{L}+\\s+que|tan\\s+\\p{L}+\\s+como|tantos?\\s+\\p{L}+\\s+como|tantas?\\s+\\p{L}+\\s+como'),
  conn_es: words('sin embargo|aunque|a pesar de|por lo tanto|ya que|puesto que|no obstante|de modo que|así que|mientras que'),
  perifrasis: words('(?:voy|vas|va|vamos|van|tengo|tienes|tiene|tenemos|tienen|acabo|acabas|acaba|acabamos|acaban|empiezo|empieza|empiezan|suelo|sueles|suele|solemos|suelen)\\s+(?:a\\s+|que\\s+|de\\s+)?\\p{L}+(?:ar|er|ir)'),
  se_pasivo: words('se\\s+(?:vende|venden|habla|hablan|dice|dicen|puede|pueden|prohíbe|prohíben|necesita|necesitan|permite|permiten|busca|buscan|alquila|alquilan)'),
  estilo_indirecto: words('dijo|dijeron|preguntó|preguntaron|explicó|contestó|respondió|aseguró'),
  basics_es_gustar: words('(?:me|te|le|nos|os|les)\\s+(?:gusta|gustan|encanta|encantan|interesa|interesan|molesta|molestan|duele|duelen|parece|parecen|importa|importan)'),
  basics_es_negacion: words('nunca|nadie|nada|tampoco|ningún|ninguno|ninguna|jamás'),
  basics_es_hace_desde: words('desde hace|hace\\s+\\p{L}+\\s+(?:años|meses|días|semanas|horas|minutos)|desde'),
  basics_es_hay_estar: words('hay|había|habrá'),
  basics_es_adverbios_mente: words('\\p{L}{4,}mente'),
  basics_es_gerundio: words('\\p{L}+(?:ando|iendo|yendo)'),
  basics_es_orden_pronombres: words('(?:se|me|te|nos)\\s+(?:lo|la|los|las)'),
  basics_es_pronombres_dobles_se_lo: words('(?:se|me|te|nos)\\s+(?:lo|la|los|las)'),
  basics_es_pronombres: words('yo|tú|él|ella|usted|nosotros|nosotras|vosotros|vosotras|ellos|ellas|ustedes|conmigo|contigo|consigo|para mí'),
  basics_es_posesivos: words('(?:mi|mis|tu|tus|su|sus|nuestr[oa]s?|vuestr[oa]s?|est[ea]s?|es[ea]s?|aquel|aquell[ao]s?)\\s+\\p{L}+'),
  basics_es_numeros_hora: words('son las\\s+\\p{L}+|es la una|a las\\s+\\p{L}+|(?:veinte|treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa|cien|ciento|mil|doscientos|trescientos|quinientos)(?:\\s+y\\s+\\p{L}+)?'),
  basics_es_preguntas: words('(?:qué|cuál|cuáles|quién|quiénes|dónde|cuándo|cómo|cuánto|cuánta|cuántos|cuántas|por qué)(?=[^?]*\\?)'),
  basics_es_reflexivos: words('(?:me|te|se|nos|os)\\s+(?:levant|llam|duch|acuest|acost|despiert|despert|divert|divirt|preocup|aburr|quej|ban[oa]|pein|afeit|sient[oa]s?|sent[aó]|vest|visto|marcha|queda)\\p{L}*'),
  basics_es_a_personal: words('(?:veo|vi|vemos|conozco|conoce|conocemos|busco|busca|buscamos|llamo|llama|amo|quiero|escucho|visito|visita|ayudo|ayuda|invito|espero|esperamos|miro|mira)\\s+a\\s+\\p{L}+'),
  basics_es_gustar_familia: words('(?:me|te|le|nos|os|les)\\s+(?:gusta|gustan|encanta|encantan|interesa|interesan|molesta|molestan|duele|duelen|parece|parecen|importa|importan|fascina|fascinan|apetece|apetecen|falta|faltan)'),
  basics_es_finales_concesivas: words('para que|a fin de que|aunque|a pesar de que|pese a que|aun cuando|por más que|por mucho que'),
  basics_es_marcadores: words('no obstante|por consiguiente|en cambio|sin embargo|por lo tanto|además|asimismo|en definitiva|por otra parte|por un lado|por otro lado|en conclusión|es decir|o sea|de hecho|en resumen|por el contrario|dado que|ya que'),
  basics_es_verbos_cambio: words('(?:me|te|se|nos|os)\\s+(?:pon(?:go|es|e|emos|éis|en)|puse|pusiste|puso|pusimos|pusieron|vuelv(?:o|es|e|en)|volvió|volvieron|hac(?:e|en)|hizo|hicieron|queda|quedó|quedan|quedaron)'),
  basics_es_temporales: words('cuando|en cuanto|tan pronto como|hasta que|después de que|antes de que|mientras|apenas|siempre que|cada vez que'),
  basics_es_lo_neutro: words('lo\\s+(?:que|bueno|malo|mejor|peor|importante|interesante|difícil|fácil|más|mismo|cual)'),
  basics_es_oraciones_hendidas: words('fue\\s+\\p{L}+\\s+(?:quien|el que|la que|el cual|la cual|quienes|los que|las que)|es\\s+\\p{L}+\\s+(?:quien|el que|la que)|lo\\s+que\\s+(?:\\p{L}+\\s+){1,4}?es'),
  basics_es_registro_formal: words('usted|ustedes|le agradecería|atentamente|estimad[oa]|me dirijo a|quedo a su disposición|le saluda|cordialmente|adjunto|con respecto a'),
  basics_es_condicion_alternativa: words('en caso de que|a no ser que|a menos que|con tal de que|siempre y cuando|con tal de|de haberlo|de haber'),
  pronombres_atonos: words('(?:se|me|te|nos)\\s+(?:lo|la|los|las)\\s+\\p{L}+|(?:lo|la|los|las)\\s+(?:he|has|ha|hemos|han|voy|vas|va|vamos|van|quiero|quieres|quiere|puedo|puedes|puede)\\s+\\p{L}+'),
  basics_es_perifrasis_inicio_fin: words('(?:pongo|pones|pone|ponemos|ponen|puse|puso|empiezo|empiezas|empieza|empezamos|empiezan|dejo|dejas|deja|dejamos|dejan|dejó|acabo|acabas|acaba|acabamos|acaban|sigo|sigues|sigue|seguimos|siguen|termina|terminó)\\s+(?:a|de)\\s+\\p{L}+|sigue\\s+\\p{L}+(?:ando|iendo)'),
  basics_es_subjuntivo_deseo_sentimiento: words('(?:quiero|quieres|quiere|queremos|quieren|espero|esperamos|deseo|me alegra|me gusta|me molesta|me sorprende|es posible|es importante|es necesario|dudo|dudamos|no creo|no pienso|temo|tengo miedo de)\\s+que\\s+\\p{L}+|ojalá\\s+\\p{L}+'),
  basics_es_para_que_subjuntivo: words('para que\\s+\\p{L}+|con el fin de que|a fin de que'),
  basics_es_aunque_indicativo_subjuntivo: words('aunque\\s+\\p{L}+'),
  basics_es_si_condicionales_subjuntivo: words('si\\s+(?:\\p{L}+\\s+)?\\p{L}+(?:ara|iera|aras|ieras|áramos|iéramos|aran|ieran|ase|iese)'),
  basics_es_saber_conocer: words('sé|sabes|sabe|sabemos|saben|supe|conozco|conoces|conoce|conocemos|conocen|conocí'),
  basics_es_se_accidental: words('se\\s+(?:me|te|le|nos|os|les)\\s+(?:cayó|cayeron|olvidó|olvidaron|rompió|rompieron|perdió|perdieron|acabó|acabaron)'),
  basics_es_como_si_ojala: words('ojalá|como si'),
  basics_es_conectores_dele: words('asimismo|en cambio|de ahí que|por consiguiente|si bien|siempre y cuando'),
  // English
  present_perfect: words("(?:have|has|'ve)\\s+(?:never\\s+|already\\s+|just\\s+|ever\\s+|not\\s+)?(?:\\p{L}+ed|been|done|gone|seen|made|taken|had|got|come|become|known|written|read|met|said|told|found|lost|won|begun|left|kept|felt|heard|thought)"),
  basics_en_present_perfect_continuous: words("(?:have|has|'ve)\\s+been\\s+\\p{L}+ing"),
  basics_en_past_perfect: words("had\\s+(?:\\p{L}+ed|been|done|gone|seen|made|taken|had|come|known|written|said|told|found)"),
  basics_en_past_continuous: words('(?:was|were)\\s+\\p{L}+ing'),
  basics_en_present_continuous: words("(?:am|is|are|'m|'re)\\s+\\p{L}+ing"),
  basics_en_future: words("will\\s+\\p{L}+|going to\\s+\\p{L}+"),
  basics_en_used_to: words('used to'),
  basics_en_there_is: words('there\\s+(?:is|are|was|were)'),
  basics_en_question_tags: words("(?:isn't|aren't|don't|doesn't|didn't|won't|wasn't|weren't|haven't|hasn't|can't|couldn't|wouldn't)\\s+\\p{L}+(?=\\?)"),
  passive_en: words('(?:is|are|was|were|been|being|be)\\s+(?:\\p{L}+ly\\s+)?\\p{L}+(?:ed|en)'),
  modals_en: words("must|mustn't|can't|couldn't|needn't|should|shouldn't|ought to|have to|has to|had to"),
  basics_en_obligation: words("must|mustn't|should|shouldn't|ought to|have to|has to|had to|need to|needn't"),
  relatives_en: words('who|whom|whose|which'),
  basics_en_conditionals: words("if\\s+\\p{L}+"),
  conn_en: words('however|although|though|despite|in spite of|whereas|therefore|nevertheless|moreover|furthermore|consequently|even though'),
  reported_speech: words('(?:said|told|asked|explained|replied|answered)\\s+(?:\\p{L}+\\s+)?(?:that|if|whether|to)'),
  gerund_infinitive: words('(?:enjoy|avoid|suggest|mind|finish|keep|stop|remember|try)\\s+\\p{L}+ing|(?:want|decide|hope|plan|agree|refuse|manage)\\s+to\\s+\\p{L}+'),
  basics_en_comparatives: words('(?:more|less)\\s+\\p{L}+\\s+than|\\p{L}+er\\s+than|as\\s+\\p{L}+\\s+as'),
  basics_en_to_be: words("I\\s+am|I'm|you\\s+are|you're|he\\s+is|she\\s+is|it\\s+is|he's|she's|it's|we\\s+are|we're|they\\s+are|they're|isn't|aren't|wasn't|weren't"),
  basics_en_present_simple: words("(?:he|she|it)\\s+(?!is\\b|was\\b|has\\b|does\\b|always\\b)\\p{L}+s\\b|(?:do|does)(?:n't|\\s+not)\\s+\\p{L}+"),
  basics_en_past_simple: words("did(?:n't|\\s+not)\\s+\\p{L}+|yesterday|last\\s+(?:night|week|month|year|summer|weekend)|\\d+\\s+\\p{L}+\\s+ago|went|saw|came|took|made|said|knew|thought|told|found|gave|bought|ate|wrote"),
  basics_en_plurals_quantifiers: words('(?:much|many|a lot of|lots of|a few|a little|few|little|some|any|enough|too many|too much|several|plenty of)\\s+\\p{L}+'),
  prep_en: words('(?:interested|good|bad|afraid|proud|tired|worried|angry|excited|fond|keen|capable|responsible|famous|different|similar)\\s+(?:in|at|of|about|with|for|from|to|by)\\s+\\p{L}+|(?:depends?|depended|relies|relied|listens?|listened|waits?|waited|thinks|talks?|talked|believes?|worries|agrees?|agreed|belongs?)\\s+(?:on|to|for|at|about|in|of|with)\\s+\\p{L}+'),
  mixed_conditionals: words('if\\s+(?:\\p{L}+\\s+){1,4}?had\\s+[^,.;?!]*?,?\\s+(?:\\p{L}+\\s+){0,3}?would\\s+(?!have\\b)\\p{L}+'),
  participle_clauses: words("^(?!(?:during|morning|evening|according|including|regarding|concerning|following|something|nothing|anything|everything|king|thing|spring|bring|string|ring|sing|wing)\\b)(?:having\\s+\\p{L}+|\\p{L}+ing|\\p{L}+ed|\\p{L}+en)\\s+(?:\\p{L}+\\s+){0,5}?\\p{L}+,"),
  basics_en_pronouns: words('mine|yours|hers|ours|theirs|myself|yourself|himself|herself|themselves|ourselves|itself'),
  basics_en_time_prepositions: words('(?:in|on|at)\\s+(?:the\\s+)?(?:morning|afternoon|evening|night|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|weekends?|\\d{1,2}(?::\\d{2})?|\\d{4}|noon|midnight|christmas|summer|winter|spring|autumn)\\b'),
  basics_en_place_prepositions: words('(?:next to|in front of|between|behind|opposite|under|above|across|along|into|through|towards?)\\s+(?:the|a|an|my|your|his|her|our|their)\\s+\\p{L}+'),
  basics_en_ability: words("(?:can|cannot|can't|could|couldn't)\\s+\\p{L}+|(?:am|is|are|was|were|be|been|isn't|aren't|wasn't|weren't)\\s+(?:not\\s+)?able\\s+to"),
  basics_en_third_conditional: words('would\\s+have\\s+\\p{L}+|wish(?:ed)?\\s+\\p{L}+\\s+had|if only'),
  basics_en_future_perfect: words("will\\s+(?:not\\s+)?have\\s+\\p{L}+|will\\s+be\\s+\\p{L}+ing|won't\\s+have\\s+\\p{L}+|won't\\s+be\\s+\\p{L}+ing"),
  basics_en_future_continuous: words("will\\s+be\\s+\\p{L}+ing|won't\\s+be\\s+\\p{L}+ing"),
  basics_en_future_perfect_continuous: words('will\\s+have\\s+been\\s+\\p{L}+ing'),
  basics_en_causative: words("(?:have|has|had|get|gets|got|having|getting)\\s+(?:my|your|his|her|our|their|the|a)\\s+\\p{L}+\\s+\\p{L}+(?:ed|en|t|ne)\\b"),
  basics_en_causatives_advanced: words("(?:have|has|had|get|gets|got|having|getting)\\s+(?:my|your|his|her|our|their|the|a)\\s+\\p{L}+\\s+\\p{L}+(?:ed|en|t|ne)\\b|(?:make|made|makes|let|lets)\\s+(?:me|you|him|her|us|them)\\s+\\p{L}+"),
  basics_en_hedging: words("whereas|nonetheless|albeit|notwithstanding|nevertheless|apparently|arguably|seems? to|appears? to|tends? to|might|perhaps|presumably|to some extent|it could be argued"),
  basics_en_preferences: words("would rather|had better|prefer(?:s|red)?|'d rather|'d better|would prefer|rather than"),
  basics_en_emphasis: words('so\\s+\\p{L}+\\s+that|such\\s+(?:a|an)?\\s*\\p{L}+(?:\\s+\\p{L}+)?\\s+that'),
  basics_en_ellipsis: words("(?:so|neither|nor)\\s+(?:do|am|have|can|will|did|does|would)\\s+(?:I|we|you|they|he|she)|I\\s+(?:think|hope|guess|suppose|believe)\\s+so|I\\s+(?:hope|think)\\s+not"),
  basics_en_phrasal_verbs: words('(?:give|gave|given|take|took|taken|turn|put|pick|set|look|get|got|go|went|come|came|find|found|work|break|broke|bring|brought|carry|call|check|cut|fill|figure|hand|hold|held|keep|kept|make|made|run|ran|show|sit|sat|stand|stood|throw|threw|try|wake|woke|write|wrote)(?:s|ed|ing|n)?\\s+(?:up|down|out|off|on|in|over|away|back|around|through)'),
  basics_en_future_in_past: words('(?:was|were)\\s+going\\s+to\\s+\\p{L}+|was\\s+about\\s+to\\s+\\p{L}+|(?:said|thought|knew|promised|hoped|expected)\\s+(?:that\\s+)?(?:\\p{L}+\\s+)?would\\s+\\p{L}+'),
  basics_en_past_perfect_continuous: words('had\\s+been\\s+\\p{L}+ing'),
  basics_en_unreal_past: words("it's\\s+(?:high\\s+)?time\\s+\\p{L}+|as\\s+(?:if|though)\\s+\\p{L}+|suppose\\s+\\p{L}+|I\\s+wish\\s+\\p{L}+|if only"),
  basics_en_discourse_markers: words("actually|anyway|mind you|by the way|you know|I mean|to be honest|speaking of which|come to think of it|for what it's worth|at least|after all"),
  basics_en_articles_institutions: words('(?:in|at|to|from)\\s+(?:the\\s+)?(?:school|hospital|prison|church|university|college|bed)\\b'),
  basics_en_cleft_variations: words("it\\s+(?:is|was)\\s+(?:\\p{L}+\\s+){1,4}?(?:that|who|which)\\s+\\p{L}+|(?:all|what)\\s+(?:I|we|you|they|he|she)\\s+(?:\\p{L}+\\s+){0,2}?(?:is|was)\\b"),
  basics_en_double_comparatives: words('the\\s+(?:more|less|\\p{L}+er)\\s+[^,.;]{1,40},?\\s+the\\s+(?:more|less|\\p{L}+er)|more and more|less and less|\\p{L}+er and \\p{L}+er'),
  basics_en_prepositional_verbs: words('(?:look|looks|looked|looking|come|comes|came|get|gets|got|put|puts|go|goes|went|run|ran|catch|caught|keep|kept|cut|cuts|face|faces|faced|stand|stands|stood|walk|walked)\\s+(?:up|out|forward|down|away|back|along|on|off)\\s+(?:to|with|for|of|at|into|from)\\s+\\p{L}+'),
  basics_en_inversion_conditionals: words("(?:had\\s+(?:I|we|you|he|she|it|they)\\s+\\p{L}+|were\\s+(?:I|we|you|he|she|it|they)\\s+to\\s+\\p{L}+|should\\s+(?:you|he|she|it|they|we|I)\\s+\\p{L}+|never\\s+(?:have|had|did|do|does)\\s+(?:I|we|you|he|she|it|they)|hardly\\s+had|rarely\\s+(?:do|does|did|have|has))(?![^?]*\\?)"),
  basics_en_subjunctive_mandative: words('(?:suggest|recommend|insist|demand|propose|require|request|ask|advise|order)\\p{L}*\\s+that\\s+\\p{L}+'),
  basics_en_participle_advanced: words("^(?!(?:during|morning|evening|according|including|regarding|concerning|following|something|nothing|anything|everything|king|thing|spring|bring|string|ring|sing|wing)\\b)(?:having\\s+\\p{L}+|\\p{L}+ing|\\p{L}+ed|\\p{L}+en)\\s+(?:\\p{L}+\\s+){0,5}?\\p{L}+,"),
  basics_en_punctuation_flow: words('however|therefore|on the contrary|in addition|as a result|in contrast|on the other hand|for instance|for example|in conclusion|thus|hence|whereby|consequently'),
  basics_en_so_such_too_enough: words('(?:so|such)\\s+(?:a\\s+|an\\s+)?\\p{L}+\\s+that|too\\s+\\p{L}+\\s+to\\s+\\p{L}+|\\p{L}+\\s+enough\\s+to'),
  basics_en_modals_past_deduction: words("(?:must|can't|couldn't|might|may|should|shouldn't|needn't)\\s+have\\s+\\p{L}+"),
  basics_en_correlative_conjunctions: words('no sooner|hardly\\s+had|scarcely\\s+had|not only'),
}

/** Topics that have a pattern (the others have no "your own sentences" section unless they teach a tense). */
export const hasPattern = (topic: string): boolean => topic in PATTERNS

/** The words of a sentence worth showing: not a fragment, not a paragraph. */
const FIT = { minWords: 4, maxWords: 30, maxChars: 200 }

const fits = (sentence: string): boolean => {
  const n = sentence.split(/\s+/).length
  return n >= FIT.minWords && n <= FIT.maxWords && sentence.length <= FIT.maxChars
}

/** The most text of one source that is read (a book is long; the first pages show what a lesson needs). */
const MAX_CHARS = 20_000
/** The most text read for one lesson in all: a search that finds nothing must not read a whole library. */
const MAX_TOTAL = 120_000

/**
 * Sentences of the learner's own texts that show a lesson: for a lesson that teaches a tense the sentences with a form of
 * that tense (the text analysed as the reader does), for a topic with a pattern the sentences the pattern finds. Sources
 * are read in the order given (newest first is the way to ask) and the search stops at `max`; a sentence is never shown twice.
 */
export function ownExamples(language: TargetLanguage, topic: string, tense: Tense | undefined, sources: readonly OwnSource[], max = 3): OwnExample[] {
  const pattern = PATTERNS[topic]
  const byTense = !!tense && language !== 'en'
  if (!byTense && !pattern) return []
  const out: OwnExample[] = []
  const seen = new Set<string>()
  let scanned = 0
  for (const source of sources) {
    if (scanned >= MAX_TOTAL) break
    scanned += Math.min(source.text.length, MAX_CHARS)
    const analysis = analyzeText(source.text.slice(0, MAX_CHARS), language, [], [], new Set())
    const sentences = analysis.paragraphs.flat().map((s) => s.text.trim())
    const hits = new Map<number, string>()
    if (byTense) for (const f of textForms(language as 'fr' | 'es', analysis)) if (f.tense === tense && !hits.has(f.sentence)) hits.set(f.sentence, f.form)
    for (let i = 0; i < sentences.length && out.length < max; i++) {
      const sentence = sentences[i]!
      if (!fits(sentence) || seen.has(sentence.toLocaleLowerCase(language))) continue
      let mark: OwnExample['mark']
      if (byTense) {
        const form = hits.get(i)
        if (form === undefined) continue
        const at = sentence.toLocaleLowerCase(language).replace(/’/g, "'").indexOf(form)
        if (at >= 0) mark = { start: at, end: at + form.length }
      } else {
        const m = pattern!.exec(sentence.replace(/’/g, "'"))
        if (!m) continue
        mark = { start: m.index, end: m.index + m[0].length }
      }
      seen.add(sentence.toLocaleLowerCase(language))
      out.push({ sentence, source: source.title, ...(mark ? { mark } : {}) })
    }
    if (out.length >= max) break
  }
  return out
}
