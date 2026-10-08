import type { TargetLanguage } from '../engine/types'

export type ClassicCategory = 'fable' | 'fairy-tale' | 'story'

export interface ClassicReading {
  id: string
  language: TargetLanguage
  title: string
  author: string
  category: ClassicCategory
  level: 'A1-A2' | 'A2-B1' | 'B1-B2'
  summary: string
  text: string
}

export const CATEGORY_LABELS: Record<ClassicCategory, string> = {
  fable: 'Fabl',
  'fairy-tale': 'Masal',
  story: 'Kısa Öykü',
}

/**
 * Public domain classic reading collection: timeless fables, fairy tales, and short stories
 * curated for language learners across English, French, and Spanish. Available offline.
 */
export const CLASSIC_READINGS: readonly ClassicReading[] = [
  // --- ENGLISH ---
  {
    id: 'classic-en-tortoise-hare',
    language: 'en',
    title: 'The Tortoise and the Hare',
    author: 'Aesop',
    category: 'fable',
    level: 'A1-A2',
    summary: 'Ağırbaşlı kaplumbağa ile kendine aşırı güvenen tavşanın ünlü yarışı.',
    text: `A Hare was making fun of the Tortoise one day for being so slow.

"Do you ever get anywhere?" he asked with a mocking laugh.

"Yes," replied the Tortoise, "and I get there sooner than you think. Run with me and I will prove it."

The Hare was much amused at the idea of running a race with the Tortoise, but for the fun of the thing he agreed. So the Fox, who had consented to act as judge, marked the distance and started the runners off.

The Hare was soon far out of sight, and to make the Tortoise feel very deeply how ridiculous it was for him to try a race with a Hare, he lay down beside the course to take a nap until the Tortoise should catch up.

The Tortoise meanwhile kept going slowly but steadily, and, after a time, passed the place where the Hare was sleeping. But the Hare slept on very peacefully; and when at last he did wake up, the Tortoise was near the goal. The Hare now ran his swiftest, but he could not overtake the Tortoise in time.

Slow and steady wins the race.`,
  },
  {
    id: 'classic-en-cried-wolf',
    language: 'en',
    title: 'The Boy Who Cried Wolf',
    author: 'Aesop',
    category: 'fable',
    level: 'A1-A2',
    summary: 'Köylülere şaka yapan ama gerçek kurt geldiğinde kimseyi inandıramayan çoban.',
    text: `There once was a shepherd boy who watched over a flock of sheep near a dark forest not far from the village. Soon he found the days in the pasture very dull. There was no one to talk to and nothing to do except play with his dog or play on his pipe.

One day, as he sat watching the sheep and thinking of what he would do in case he saw a wolf, he thought of a plan to amuse himself. His master had told him to call for help if a wolf should attack the flock, and the villagers would drive it away.

So though he had not seen anything that even looked like a wolf, he ran toward the village shouting with all his might, "Wolf! Wolf!"

As he expected, the villagers who heard the cry dropped their work and ran in great excitement toward the pasture. But when they got there, they found the boy doubled up with laughter at the trick he had played on them.

A few days later the shepherd boy again shouted, "Wolf! Wolf!" Once more the villagers ran to help him, only to be laughed at again.

Then one evening as the sun was setting behind the forest and the shadows were creeping over the pasture, a real wolf sprang from the woods and attacked the sheep. In terror the boy ran toward the village shouting, "Wolf! Wolf!"

But though the villagers heard the cry, they did not run to help him as they had before. "He cannot fool us again," they said.

The wolf killed many of the sheep and slipped back into the forest.

Nobody believes a liar, even when he tells the truth.`,
  },
  {
    id: 'classic-en-wind-sun',
    language: 'en',
    title: 'The North Wind and the Sun',
    author: 'Aesop',
    category: 'fable',
    level: 'A1-A2',
    summary: 'Yolcunun paltosunu çıkarmak için rüzgâr ile güneşin girdiği iddia.',
    text: `The North Wind and the Sun had a quarrel about which of the two was the stronger. While they were disputing with much heat and bluster, a traveler came along the road winding himself in a warm cloak.

"Let us agree," said the Sun, "that he is the stronger who can first strip that traveler of his cloak."

"Very well," growled the North Wind, and at once sent a cold, howling blast against the traveler.

With the first gust of wind the ends of the cloak whipped about the traveler's body. But he immediately wrapped it tighter around him, and the harder the wind blew, the more closely he held it. In great rage the North Wind tore at the cloak, but all his efforts were in vain.

Then the Sun began to shine. At first his beams were gentle, and in the pleasant warmth after the bitter cold of the North Wind, the traveler unfastened his cloak and let it hang loosely about his shoulders. The Sun's rays grew warmer and warmer. The man took off his cap and wiped his brow. At last he became so heated that he could bear the cloak no longer, and sat down in the shade of a tree to rest.

Gentleness and persuasion are often more powerful than force and bluster.`,
  },
  {
    id: 'classic-en-happy-prince',
    language: 'en',
    title: 'The Happy Prince',
    author: 'Oscar Wilde',
    category: 'story',
    level: 'B1-B2',
    summary: 'Şehrin tepesindeki altından Mutlu Prens heykeli ile küçük kırlangıcın dokunaklı dostluğu.',
    text: `High above the city, on a tall column, stood the statue of the Happy Prince. He was gilded all over with thin leaves of fine gold, for eyes he had two bright sapphires, and a large red ruby glowed on his sword hilt. He was very much admired indeed.

One night there flew over the city a little Swallow. His friends had gone away to Egypt six weeks before, but he had stayed behind.

"Where shall I put up?" he said; "I hope the town has made preparations."

Then he saw the statue on the tall column. "I will put up there," he cried; "it is a fine position with plenty of fresh air." So he alighted just between the feet of the Happy Prince.

"I have a golden bedroom," he whispered softly to himself as he looked round, and he prepared to go to sleep; but just as he was putting his head under his wing a large drop of water fell on him.

"What a curious thing!" he cried; "there is not a single cloud in the sky, the stars are quite clear and bright, and yet it is raining."

Then another drop fell. "What is the use of a statue if it cannot keep the rain off?" he said; "I must look for a good chimney pot."

But before he had opened his wings, a third drop fell, and he looked up, and saw—Ah! what did he see?

The eyes of the Happy Prince were filled with tears, and tears were running down his golden cheeks. His face was so beautiful in the moonlight that the little Swallow was filled with pity.

"Who are you?" he asked.
"I am the Happy Prince."
"Why are you weeping then?" asked the Swallow; "you have quite drenched me."

"When I was alive and had a human heart," answered the statue, "I did not know what tears were, for I lived in the Palace of Sans-Souci, where sorrow is not allowed to enter. My courtiers called me the Happy Prince, and happy indeed I was, if pleasure be happiness. So I lived, and so I died. And now that I am dead they have set me up here so high that I can see all the ugliness and all the misery of my city, and though my heart is made of lead yet I cannot choose but weep."`,
  },

  // --- FRENCH ---
  {
    id: 'classic-fr-corbeau-renard',
    language: 'fr',
    title: 'Le Corbeau et le Renard',
    author: 'Jean de La Fontaine',
    category: 'fable',
    level: 'A2-B1',
    summary: 'Ağzında peynir tutan karga ile ona övgüler yağdıran kurnaz tilki.',
    text: `Maître Corbeau, sur un arbre perché,
Tenait en son bec un fromage.
Maître Renard, par l'odeur alléché,
Lui tint à peu près ce langage :
« Hé ! bonjour, Monsieur du Corbeau.
Que vous êtes joli ! que vous me semblez beau !
Sans mentir, si votre ramage
Se rapporte à votre plumage,
Vous êtes le Phénix des hôtes de ces bois. »

À ces mots le Corbeau ne se sent pas de joie ;
Et pour montrer sa belle voix,
Il ouvre un large bec, laisse tomber sa proie.

Le Renard s'en saisit, et dit : « Mon bon Monsieur,
Apprenez que tout flatteur
Vit aux dépens de celui qui l'écoute :
Cette leçon vaut bien un fromage, sans doute. »

Le Corbeau, honteux et confus,
Jura, mais un peu tard, qu'on ne l'y prendrait plus.`,
  },
  {
    id: 'classic-fr-cigale-fourmi',
    language: 'fr',
    title: 'La Cigale et la Fourmi',
    author: 'Jean de La Fontaine',
    category: 'fable',
    level: 'A2-B1',
    summary: 'Yaz boyunca şarkı söyleyen ağustosböceği ile kışa hazırlanan çalışkan karınca.',
    text: `La Cigale, ayant chanté
Tout l'été,
Se trouva fort dépourvue
Quand la bise fut venue.
Pas un seul petit morceau
De mouche ou de vermisseau.

Elle alla crier famine
Chez la Fourmi sa voisine,
La priant de lui prêter
Quelque grain pour subsister
Jusqu'à la saison nouvelle.

« Je vous paierai, lui dit-elle,
Avant l'août, foi d'animal,
Intérêt et principal. »

La Fourmi n'est pas prêteuse :
C'est là son moindre défaut.
« Que faisiez-vous au temps chaud ?
Dit-elle à cette emprunteuse.

— Nuit et jour à tout venant
Je chantais, ne vous déplaise.

— Vous chantiez ? j'en suis fort aise.
Eh bien ! dansez maintenant. »`,
  },
  {
    id: 'classic-fr-chaperon-rouge',
    language: 'fr',
    title: 'Le Petit Chaperon Rouge',
    author: 'Charles Perrault',
    category: 'fairy-tale',
    level: 'A2-B1',
    summary: 'Büyükannesine çörek götüren Kırmızı Başlıklı Kız ile ormanda karşılaştığı kurt.',
    text: `Il était une fois une petite fille de village, la plus jolie qu'on eût su voir ; sa mère en était folle, et sa mère-grand plus folle encore. Cette bonne femme lui fit faire un petit chaperon rouge, qui lui seyait si bien que partout on l'appelait le Petit Chaperon rouge.

Un jour, sa mère, ayant cuit et fait des galettes, lui dit : « Va voir comme se porte ta mère-grand, car on m'a dit qu'elle était malade ; porte-lui une galette et ce petit pot de beurre. »

Le Petit Chaperon rouge partit aussitôt pour aller chez sa mère-grand, qui demeurait dans un autre village.

En passant dans un bois, elle rencontra compère le Loup, qui eut bien envie de la manger ; mais il n'osa, à cause de quelques bûcherons qui étaient dans la forêt. Il lui demanda où elle allait. La pauvre enfant, qui ne savait pas qu'il est dangereux de s'arrêter à écouter un loup, lui dit : « Je vais voir ma mère-grand, et lui porter une galette avec un petit pot de beurre que ma mère lui envoie.

— Demeure-t-elle bien loin ? lui dit le Loup.

— Oh ! oui, dit le Petit Chaperon rouge, c'est par delà le moulin que vous voyez tout là-bas, à la première maison du village.

— Eh bien, dit le Loup, je veux l'aller voir aussi ; je m'y en vais par ce chemin-ci, et toi par ce chemin-là, et nous verrons qui plus tôt y sera. »

Le Loup se mit à courir de toute sa force par le chemin qui était le plus court, et la petite fille s'en alla par le chemin le plus long, s'amusant à cueillir des noisettes, à courir après des papillons, et à faire des bouquets des petites fleurs qu'elle trouvait.`,
  },
  {
    id: 'classic-fr-grenouille-boeuf',
    language: 'fr',
    title: 'La Grenouille qui veut se faire aussi grosse que le Bœuf',
    author: 'Jean de La Fontaine',
    category: 'fable',
    level: 'A2-B1',
    summary: 'Öküz kadar büyük olmaya çalışıp şişen kurbağanın ibretlik hikayesi.',
    text: `Une Grenouille vit un Bœuf
Qui lui sembla de belle taille.
Elle, qui n'était pas grosse en tout comme un œuf,
Envieuse, s'étend, et s'enfle, et se travaille,
Pour égaler l'animal en grosseur,
Disant : « Regardez bien, ma sœur ;
Est-ce assez ? dites-moi ; n'y suis-je point encore ?

— Nenni.
— M'y voici donc ?
— Point du tout.
— M'y voilà ?
— Vous n'en approchez point. »

La chétive pécore
S'enfla si bien qu'elle creva.

Le monde est plein de gens qui ne sont pas plus sages :
Tout bourgeois veut bâtir comme les grands seigneurs,
Tout petit prince a des ambassadeurs,
Tout marquis veut avoir des pages.`,
  },

  // --- SPANISH ---
  {
    id: 'classic-es-zorra-uvas',
    language: 'es',
    title: 'La zorra y las uvas',
    author: 'Félix María de Samaniego',
    category: 'fable',
    level: 'A1-A2',
    summary: 'Ulaşamadığı olgun üzümlere koruk diyen tilkinin klasik masalı.',
    text: `Es voz común que a más del mediodía,
en ayunas la Zorra iba cazando;
halla una parra, quédese mirando
de la alta vid la dulce frutería.

Causábale mil ansias y congojas
no alcanzar a las uvas con la garra,
al mostrar a sus dientes la parra
los racimos colgando entre las hojas.

Miró, saltó y anduvo en probaturas,
pero viendo el trabajo infructuoso,
dijo: «No las quiero, no están maduras.»

No por eso te muestres desdeñoso
cuando la suerte no te sea propicia;
no digas que es defecto en la delicia
lo que sólo en tus fuerzas es menguado.`,
  },
  {
    id: 'classic-es-cigarra-hormiga',
    language: 'es',
    title: 'La cigarra y la hormiga',
    author: 'Félix María de Samaniego',
    category: 'fable',
    level: 'A1-A2',
    summary: 'Yazı şarkıyla geçiren ağustosböceği ve kışın kapısını çaldığı ihtiyatlı karınca.',
    text: `Cantando la Cigarra
pasó el verano entero,
sin hacer provisiones
allá para el invierno;
los fríos la obligaron
a guardar el silencio
y a acogerse al abrigo
de su estrecho aposento.

Viose desproveída
del preciso sustento:
sin mosca, sin gusano,
sin trigo y sin centeno.
Habitaba la Hormiga
allí cerca, y con ruego
adonde ella marchó
a pedirle alimento.

«Prestame —le decía—,
para pasar el invierno,
que yo te pagaré
con ganancias y precio.»

La codiciosa Hormiga
respondió con denuedo,
ocultando a la espalda
las llaves del granero:
«¡Yo prestar lo que gano
con un trabajo inmenso!
Dime, pues, holgazana:
¿qué has hecho en el buen tiempo?»

«Yo —dijo la Cigarra—,
a todo pasajero
cantaba alegremente,
sin cesar un momento.»

«¡Hola! ¿conque cantabas
cuando yo andaba al remo?
Pues ahora que yo como,
baila, pese a tu cuerpo.»`,
  },
  {
    id: 'classic-es-pastor-mentiroso',
    language: 'es',
    title: 'El pastor mentiroso',
    author: 'Esopo',
    category: 'fable',
    level: 'A1-A2',
    summary: 'Köylülere sürekli yalandan kurt alarmı veren çobanın acı sonu.',
    text: `Apacentando un joven pastor su rebaño no muy lejos de una aldea, le dio por gastar una broma a sus vecinos. Se puso a gritar con todas sus fuerzas: «¡El lobo! ¡Socorro, que viene el lobo y ataca a las ovejas!»

Los aldeanos, oyendo sus gritos lastimeros, salieron armados con palos y piedras para ayudarle. Pero al llegar a la colina, encontraron al pastor riéndose a carcajadas de su ingenuidad.

Pocos días después, el pastor repitió la misma broma. Nuevamente los campesinos acudieron presurosos a prestarle socorro, y nuevamente fueron el blanco de sus burlas.

Pero un atardecer, un lobo hambriento se acercó de verdad al rebaño y comenzó a devorar a las ovejas. El muchacho, aterrorizado, corrió gritando: «¡El lobo! ¡Viene el lobo, ayúdenme por favor!»

Sin embargo, los aldeanos, creyendo que se trataba de otra de sus bromas, no le hicieron caso y continuaron con sus labores.

Así fue como el pastor perdió todo su rebaño. Nadie cree a un mentiroso, ni siquiera cuando dice la verdad.`,
  },
  {
    id: 'classic-es-tortuga-gigante',
    language: 'es',
    title: 'La tortuga gigante',
    author: 'Horacio Quiroga',
    category: 'story',
    level: 'B1-B2',
    summary: 'Ormanda birbirinin hayatını kurtaran bir insan ile dev kaplumbağanın dostluğu.',
    text: `Había una vez un hombre que vivía en Buenos Aires, y estaba muy contento porque era un hombre sano y trabajador. Pero un día se enfermó, y los médicos le dijeron que solamente yéndose al campo podría curarse.

El hombre no quería ir, porque tenía hermanos chicos a quienes daba de comer; pero un amigo suyo, que era director del Jardín Zoológico, le dijo:
—Andate al monte; cazá bichos y mandame los cueros, y yo te daré plata adelantada para tus hermanos.

El hombre aceptó, y se fue a vivir al monte, lejos, más allá de Misiones todavía. Hacía mucho calor, y eso le hacía bien. Vivía solo en el bosque, y él mismo se cocinaba. Comía pájaros y venados que cazaba con la escopeta.

Un día que tenía mucha hambre, vio a un tigre enorme que quería comerse a una gran tortuga. El hombre apuntó con su escopeta y mató al tigre.

Luego vio que la pobre tortuga estaba muy herida. Aunque tenía hambre y la carne de tortuga es rica, el hombre tuvo lástima de ella y la llevó a su choza. La curó con vendas y agua fresca todos los días.

Poco después, el hombre cayó enfermo con fiebre muy alta en medio de la selva. No podía levantarse ni buscar comida o agua.

Entonces la tortuga agradecida lo cuidó, le trajo agua en su caparazón y raíces para comer, y cuando vio que el hombre se moría si no llegaba a la ciudad, lo cargó sobre su lomo y caminó días y noches por la selva hasta llegar a Buenos Aires para salvarle la vida.`,
  },
]

/**
 * Filter classics by language and optional category.
 */
export function classicsFor(language: TargetLanguage, category?: ClassicCategory): ClassicReading[] {
  return CLASSIC_READINGS.filter((c) => c.language === language && (!category || c.category === category))
}

/**
 * Find a specific classic by its unique ID.
 */
export function findClassic(id: string): ClassicReading | undefined {
  return CLASSIC_READINGS.find((c) => c.id === id)
}
