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
  {
    id: 'classic-en-fox-crow',
    language: 'en',
    title: 'The Fox and the Crow',
    author: 'Aesop',
    category: 'fable',
    level: 'A1-A2',
    summary: 'Ağzındaki peynirle ağaçta duran karga ve onun sesini öven kurnaz tilki.',
    text: `One day a Crow sat on a high branch of a tree, holding a piece of cheese in her beak. A hungry Fox smelled the cheese and came running to the foot of the tree.

"Good day, noble Crow!" said the Fox in his sweetest voice. "How beautiful your feathers are! How bright your eyes! Surely a bird with such lovely feathers must have a voice sweeter than all others. If you would only sing for me, I would hail you as the Queen of Birds."

The Crow was deeply flattered by this praise. Wanting to prove she could sing, she lifted her head and opened her beak wide to utter a loud "Caw!"

Down fell the piece of cheese directly into the Fox's waiting mouth. He caught it, swallowed it with a grin, and walked away laughing.

Do not trust flatterers.`,
  },
  {
    id: 'classic-en-ant-grasshopper',
    language: 'en',
    title: 'The Ant and the Grasshopper',
    author: 'Aesop',
    category: 'fable',
    level: 'A1-A2',
    summary: 'Güneşli yaz günlerini eğlenerek geçiren ağustosböceği ile kışa buğday biriktiren karınca.',
    text: `On a warm summer day, a Grasshopper was hopping about in a field, chirping and singing to his heart's content. An Ant passed by, bearing along with great effort an ear of corn he was taking to the nest.

"Why not come and chat with me," asked the Grasshopper, "instead of toiling and moiling in that way?"

"I am helping to lay up food for the winter," said the Ant, "and recommend you to do the same."

"Why bother about winter?" said the Grasshopper. "We have got plenty of food at present."

But the Ant went on its way and continued its toil. When the winter came the Grasshopper had no food and found itself dying of hunger, while it saw the ants distributing every day corn and grain from the stores they had collected in the summer.

It is best to prepare for days of need.`,
  },
  {
    id: 'classic-en-town-country-mouse',
    language: 'en',
    title: 'The Town Mouse and the Country Mouse',
    author: 'Aesop',
    category: 'fable',
    level: 'A2-B1',
    summary: 'Zenginliğin tehlikeleri ile sade yaşamın huzurunu kıyaslayan iki farenin hikayesi.',
    text: `A Town Mouse once visited his cousin in the country. The Country Mouse offered him wheat stalks, acorns, and cold water from a brook. The Town Mouse turned up his nose.

"My poor cousin," said he, "you live here like an ant. Come with me to the city, and you shall feast on honey, cakes, and cheese every night."

The Country Mouse agreed, and they set out together. When they reached the city mansion, the dining table was laden with leftover pastries, jellies, and fine cheeses. But just as the Country Mouse began to nibble a sweet crumb, the doors burst open. Two fierce mastiffs rushed in, barking loudly.

The mice scrambled into a dark hole behind the baseboard, trembling with fear. When all was quiet again, the Country Mouse took his little travel bag.

"You may have your dainties and grand rooms," said he, "but I prefer my simple acorn in peace to a banquet in fear."

Better beans in freedom than cake in fear.`,
  },
  {
    id: 'classic-en-crow-pitcher',
    language: 'en',
    title: 'The Crow and the Pitcher',
    author: 'Aesop',
    category: 'fable',
    level: 'A1-A2',
    summary: 'Susuzluktan ölmek üzere olan karganın taşlar atarak testideki suyu yükseltmesi.',
    text: `A Crow, half-dead with thirst, came upon a Pitcher which had once been full of water. But when the Crow put his beak into the mouth of the Pitcher, he found that only very little water was left in it, and that he could not reach far enough down to get at it. He tried and he tried, but at last had to give up in despair.

Then a thought came to him. He took a pebble and dropped it into the Pitcher. Then he took another pebble and dropped it into the Pitcher. Then he took another, and another, and another.

At last, at last, the water rose to the brim, and the Crow was able to quench his thirst.

Little by little does the trick.`,
  },
  {
    id: 'classic-en-fox-grapes',
    language: 'en',
    title: 'The Fox and the Grapes',
    author: 'Aesop',
    category: 'fable',
    level: 'A1-A2',
    summary: 'Asılı duran üzümlere ulaşamayınca üzümlerin koruk olduğunu söyleyen tilki.',
    text: `A Fox one day spied a beautiful bunch of ripe grapes hanging from a vine trained along the branches of a tree. The grapes seemed ready to burst with juice, and the Fox's mouth watered as he gazed longingly at them.

The bunch hung from a high branch, and the Fox had to jump for it. The first time he jumped he missed it by a long way. So he walked off a short distance and took a running leap at it, only to fall short once more. Again and again he tried, but in vain.

Now he sat down and looked at the grapes in disgust.

"What a fool I am," he said. "Here I am wearing myself out to get a bunch of sour grapes that are not worth gaping for."

And off he walked very proudly with his head held high.

It is easy to despise what you cannot get.`,
  },
  {
    id: 'classic-en-star-talers',
    language: 'en',
    title: 'The Star Money',
    author: 'Brothers Grimm',
    category: 'fairy-tale',
    level: 'A2-B1',
    summary: 'Elindeki her şeyi yoksullara veren küçük kızın gökten yağan yıldızlarla ödüllendirilmesi.',
    text: `There was once a little girl whose father and mother were dead, and she was so poor that she no longer had any little room to live in, or bed to sleep in, and at last nothing but the clothes on her back and a little piece of bread in her hand. She was, however, good and pious.

As she went out into the field, a poor man met her and said, "Give me something to eat, I am so hungry." She gave him the whole piece of bread, and said, "May God bless it to you," and went on.

Then came a child who wept and said, "My head is so cold, give me something to cover it." So she took off her hood and gave it to him. And when she had walked a little farther, she met another child who had no jacket and was freezing, so she gave him her jacket.

At last she arrived in a forest, and it was already dark, and there came yet another child who asked for a little shirt. The good girl thought to herself, "It is a dark night and no one sees you, you can very well give your shirt away," and she took it off and gave that also away.

As she stood there and had not one thing left, suddenly some stars fell from the sky, and they were hard round pieces of silver money. And though she had just given her shirt away, she now had on a new one of the finest linen. Then she gathered together the money into it, and was rich all the days of her life.`,
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
  {
    id: 'classic-fr-lievre-tortue',
    language: 'fr',
    title: 'Le Lièvre et la Tortue',
    author: 'Jean de La Fontaine',
    category: 'fable',
    level: 'A2-B1',
    summary: 'Kendine güvenip oyalanan tavşan ile azimle yoluna devam eden kaplumbağa.',
    text: `Rien ne sert de courir ; il faut partir à point.
Le Lièvre et la Tortue en sont un témoignage.
« Gageons, dit celle-ci, que vous n'atteindrez point
Si tôt que moi ce but. — Si tôt ? Êtes-vous sage ?
Repartit l'animal léger.
Ma commère, il vous faut purger
Avec quatre grains d'ellébore.
— Sage ou non, je parie encore. »
Ainsi fut fait : et de tous deux
On mit la récompense auprès du but.

Le Lièvre n'avait que quatre pas à faire ;
J'entends de ceux qu'il fait lorsque prêt d'être atteint
Il s'éloigne des chiens. Il s'amuse à brouter,
À dormir, et à écouter d'où vient le vent.
La Tortue va son train ; elle part, elle s'évertue,
Elle se hâte avec lenteur.
Lui cependant méprise une telle victoire.

Quand il vit que la Tortue approchait du terme,
Il partit comme un trait ; mais les élans qu'il fit
Furent vains : la Tortue arriva la première.
« Eh bien ! lui cria-t-elle, avais-je pas raison ?
De quoi vous sert votre vitesse ?
Moi, l'emporter ! et que serait-ce
Si vous portiez une maison ? »`,
  },
  {
    id: 'classic-fr-loup-agneau',
    language: 'fr',
    title: "Le Loup et l'Agneau",
    author: 'Jean de La Fontaine',
    category: 'fable',
    level: 'A2-B1',
    summary: 'Duru bir dereden su içen masum kuzu ile onu suçlayacak bahane arayan aç kurt.',
    text: `La raison du plus fort est toujours la meilleure :
Nous l'allons montrer tout à l'heure.

Un Agneau se désaltérait
Dans le courant d'une onde pure.
Un Loup survient à jeun, qui cherchait aventure,
Et que la faim en ces lieux attirait.
« Qui te rend si hardi de troubler mon breuvage ?
Dit cet animal plein de rage :
Tu seras châtié de ta témérité.
— Sire, répond l'Agneau, que votre Majesté
Ne se mette pas en colère ;
Mais plutôt qu'elle considère
Que je me vas désaltérant
Dans le courant,
Plus de vingt pas au-dessous d'Elle ;
Et que par conséquent, en aucune façon,
Je ne puis troubler sa boisson.
— Tu la troubles, reprit cette bête cruelle,
Et je sais que de moi tu médis l'an passé.
— Comment l'aurais-je fait si je n'étais pas né ?
Reprit l'Agneau. — Si ce n'est toi, c'est donc ton frère.
— Je n'en ai point. — C'est donc quelqu'un des tiens :
Car vous ne m'épargnez guère,
Vous, vos bergers, et vos chiens. »

Là-dessus, au fond des forêts
Le Loup l'emporte, et puis le mange,
Sans autre forme de procès.`,
  },
  {
    id: 'classic-fr-lion-rat',
    language: 'fr',
    title: 'Le Lion et le Rat',
    author: 'Jean de La Fontaine',
    category: 'fable',
    level: 'A2-B1',
    summary: 'Küçük bir farenin hayatını bağışlayan ormanlar kralı aslan ve farenin gösterdiği vefa.',
    text: `Il faut, autant qu'on peut, obliger tout le monde :
On a souvent besoin d'un plus petit que soi.
De cette vérité deux fables feront foi,
Tant la chose en preuves abonde.

Entre les pattes d'un Lion,
Un Rat sortit de terre assez à l'étourdie.
Le Roi des animaux, en cette occasion,
Montra sa générosité,
Et lui donna la vie.
Ce bienfait ne fut pas perdu.

Quelqu'un aurait-il jamais cru
Qu'un Lion d'un Rat eût affaire ?
Cependant il advint qu'au sortir des forêts
Ce Lion fut pris dans des rets,
Dont ses rugissements ne le purent défaire.
Sire Rat accourut, et fit tant par ses dents
Qu'une maille rongée emporta tout l'ouvrage.

Patience et longueur de temps
Font plus que force ni que rage.`,
  },
  {
    id: 'classic-fr-renard-raisins',
    language: 'fr',
    title: 'Le Renard et les Raisins',
    author: 'Jean de La Fontaine',
    category: 'fable',
    level: 'A1-A2',
    summary: 'Erişemediği olgun üzümlere bakıp ekşi olduklarını iddia eden aç tilki.',
    text: `Certain Renard gascon, d'autres disent normand,
Mourant presque de faim, vit au haut d'une treille
Des raisins mûrs apparemment,
Et couverts d'une peau vermeille.
Le galant en eût fait volontiers un repas ;
Mais comme il n'y pouvait atteindre :
« Ils sont trop verts, dit-il, et bons pour des goujats. »

Fit-il pas mieux que de se plaindre ?`,
  },
  {
    id: 'classic-fr-chene-roseau',
    language: 'fr',
    title: 'Le Chêne et le Roseau',
    author: 'Jean de La Fontaine',
    category: 'fable',
    level: 'A2-B1',
    summary: 'Rüzgâr karşısında kırılmayıp eğilen kamış ile gücüne güvenip kökünden sökülen meşe.',
    text: `Le Chêne un jour dit au Roseau :
« Vous avez bien sujet d'accuser la nature ;
Un roitelet pour vous est un pesant fardeau ;
Le moindre vent qui d'aventure
Fait rider la face de l'eau
Vous oblige à baisser la tête.
Cependant que mon front, au Caucase pareil,
Non content d'arrêter les rayons du soleil,
Brave l'effort de la tempête. »

Le Roseau répondit : « Votre compassion
Part d'un bon naturel ; mais quittez ce souci :
Les vents me sont moins qu'à vous redoutables.
Je plie, et ne romps pas. Vous avez jusqu'ici
Contre leurs coups épouvantables
Résisté sans courber le dos ;
Mais attendons la fin. »

Comme il disait ces mots,
Du bout de l'horizon accourt avec furie
Le plus terrible des enfants
Que le Nord eût portés jusque-là dans ses flancs.
L'arbre tient bon ; le roseau plie.
Le vent redouble ses efforts,
Et fait si bien qu'il déracine
Celui de qui la tête au ciel était voisine,
Et dont les pieds touchaient à l'empire des morts.`,
  },
  {
    id: 'classic-fr-poule-oeufs-or',
    language: 'fr',
    title: "La Poule aux œufs d'or",
    author: 'Jean de La Fontaine',
    category: 'fable',
    level: 'A1-A2',
    summary: 'Her gün altın yumurtlayan tavuğunu daha çok zengin olmak için kesip her şeyini kaybeden adam.',
    text: `L'Avarice perd tout en voulant tout gagner.
Je ne veux, pour le témoigner,
Que celui dont la Poule, à ce que dit la fable,
Pondait tous les jours un œuf d'or.
Il crut que dans son corps elle avait un trésor.
Il la tua, l'ouvrit, et la trouva semblable
À celles dont les œufs ne lui rapportaient rien,
S'étant lui-même ôté le plus beau de son bien.

Belle leçon pour les gens chiches :
Pendant ces derniers temps, combien en a-t-on vus
Qui du soir au matin sont pauvres devenus
Pour vouloir trop tôt être riches ?`,
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
  {
    id: 'classic-es-leon-raton',
    language: 'es',
    title: 'El león y el ratón',
    author: 'Félix María de Samaniego',
    category: 'fable',
    level: 'A1-A2',
    summary: 'Ufacık bir farenin canını bağışlayan ve sonra onun sayesinde ağlardan kurtulan aslan.',
    text: `Dormía plácidamente un león en el bosque cuando unos ratoncillos del campo se pusieron a jugar a su alrededor. Uno de ellos, sin querer, despertó al soberbio animal saltando sobre su garra.

El rey de la selva lo atrapó al instante entre sus uñas. El infeliz ratón suplicó clemencia:
—¡Perdóname, señor! Deja que viva, y tal vez algún día pueda devolverte este favor.

Rió el león con gran soberbia al pensar que un animal tan diminuto pudiera serle útil, pero compadecido de su pequeñez, lo dejó marchar.

Poco tiempo después, el león cayó en una red tendida por cazadores. Rugía con tanta furia que los montes retumbaban, sin poder soltar las cuerdas. Al oír sus lamentos acudió el ratón, y con sus afilados dientes royó la red hasta romper los nudos y poner en libertad al fiero león.

Los pequeños amigos pueden prestar grandes servicios.`,
  },
  {
    id: 'classic-es-lechera',
    language: 'es',
    title: 'La lechera',
    author: 'Félix María de Samaniego',
    category: 'fable',
    level: 'A1-A2',
    summary: 'Başındaki süt testisini satıp zengin olma hayalleri kurarken testiyi deviren sütçü kız.',
    text: `Llevaba en la cabeza
una lechera el cántaro al mercado,
con aquella presteza,
aquel aire sencillo y desahogado,
que bien mostraba sus risueñas mañas.

Iba la muchacha diciendo entre sí:
«Por esta leche me darán dinero;
con él compraré cien huevos;
sacaré de ellos cien hermosos pollos;
los pollos crecerán y valdrán mucho;
compraré luego un lechoncito gordo;
con bellotas y castañas lo engordaré;
lo venderé por buen precio y compraré una vaca
con un ternero que saltará en el prado.»

En esto, loca de alegría ante su fortuna imaginaria,
dio un salto gracioso la doncella:
¡ay, qué dolor! El cántaro cayó al suelo,
rompiéndose en mil pedazos.
Con la leche derramada se fueron los huevos,
los pollos, el lechón, la vaca y el ternero.

No anheles impaciente el bien futuro,
mira que ni el presente está seguro.`,
  },
  {
    id: 'classic-es-perro-reflejo',
    language: 'es',
    title: 'El perro y su reflejo',
    author: 'Félix María de Samaniego',
    category: 'fable',
    level: 'A1-A2',
    summary: 'Ağzındaki et parçasıyla köprüden geçerken sudaki yansımasına göz diken açgözlü köpek.',
    text: `Cruzaba un perro un río cristalino sobre un estrecho madero, llevando en la boca un sabroso pedazo de carne que acababa de conseguir.

Al mirar hacia el agua, vio reflejada su propia imagen, pero creyó que se trataba de otro perro que llevaba una presa mucho más grande que la suya.

Ciego de codicia y queriendo arrebatar el pedazo al supuesto rival, abrió la boca y ladró con fuerza lanzándose hacia el reflejo. En ese instante, la verdadera carne se desprendió de sus fauces, cayó a la corriente profunda y se perdió para siempre en el fondo del agua.

El ambicioso can se quedó sin su comida y sin la sombra que perseguía, aprendiendo una triste lección en la orilla.

Quien codicia lo ajeno pierde con justicia lo propio.`,
  },
  {
    id: 'classic-es-dos-conejos',
    language: 'es',
    title: 'Los dos conejos',
    author: 'Tomás de Iriarte',
    category: 'fable',
    level: 'A1-A2',
    summary: 'Kendilerini kovalayan köpeklerin cinsini tartışırken yakalanan iki tavşan.',
    text: `Por entre unas matas,
seguido de perros,
no diré corría,
volaba un conejo.

De su madriguera
salió un compañero,
y le dijo: «Tente,
amigo, ¿qué es esto?»

«¿Qué ha de ser?», responde;
«sin aliento llego...
dos pícaros galgos
me vienen siguiendo.»

«Sí», replica el otro,
«por allí los veo;
pero no son galgos.»
«¿Pues qué son?» «Podencos.»

«¿Podencos dices?
¡Sí, como mi abuelo!
Galgos son, te digo,
míralos al pelo.»

«Son podencos, vaya,
que no entiendes de eso.»
«Son galgos, te digo.»
«Digo que podencos.»

En esta disputa
llegando los perros,
pillan descuidados
a entrambos conejos.

Viendo que sus dudas
no tuvieron seso,
dejar las cuestiones
deberían primero.`,
  },
  {
    id: 'classic-es-la-mona',
    language: 'es',
    title: 'La mona',
    author: 'Tomás de Iriarte',
    category: 'fable',
    level: 'A1-A2',
    summary: 'İpek elbise giyse de maymunun maymun kalacağını anlatan klasik fabl.',
    text: `Subió una mona a un nogal,
y cogiendo una nuez verde,
en la cáscara la muerde;
con que le supo muy mal.
Arrojola el animal,
y se quedó sin comer.

Así suele suceder
a quien sufre con desdén
un trabajo que algún bien
le pudiera prometer.

Aunque la mona se vista de seda,
mona se queda.
El hábito no hace al monje,
ni el disfraz oculta lo que uno es.`,
  },
  {
    id: 'classic-es-zorro-ciguena',
    language: 'es',
    title: 'El zorro y la cigüeña',
    author: 'Félix María de Samaniego',
    category: 'fable',
    level: 'A1-A2',
    summary: 'Leyleğe düz tabakta çorba ikram eden kurnaz tilkinin, uzun boyunlu sürahide sunulan yemekle dersini alması.',
    text: `Convidó el zorro a la cigüeña a comer un día, y para burlarse de ella, le sirvió un caldo claro en un plato llano y poco profundo. Por más que la cigüeña picaba con su largo pico, no pudo probar ni una sola gota, mientras que el zorro lamió todo el plato en un instante, riéndose de su huésped.

La cigüeña disimuló su enfado y, a los pocos días, invitó al zorro a cenar a su casa. Muy contento acudió el zorro, pues tenía buen apetito.

Cuando llegó la hora de la comida, la cigüeña trajo la carne picada y sabrosa, pero servida dentro de una vasija de cuello largo y estrecho. La cigüeña metía fácilmente su pico y comía a su gusto, mientras que el zorro apenas podía lamer el borde exterior del jarro sin alcanzar bocado alguno.

Avergonzado y con la barriga vacía, tuvo que marcharse el pícaro zorro, reconociendo la justicia del castigo.

Quien engaña a su semejante debe esperar que le paguen con la misma moneda.`,
  },
  {
    id: "classic-en-gift-magi",
    language: "en",
    title: "The Gift of the Magi",
    author: "O. Henry",
    category: "story",
    level: "B1-B2",
    summary: "Noel hediyesi almak için en değerli varlıklarından gizlice vazgeçen iki genç aşığı anlatan unutulmaz bir öykü.",
    text: `One dollar and eighty-seven cents. That was all. And sixty cents of it was in pennies. Pennies saved one and two at a time by bulldozing the grocer and the vegetable man and the butcher until one's cheeks burned with the silent imputation of parsimony that such close dealing implied. Three times Della counted it. One dollar and eighty-seven cents. And the next day would be Christmas.

There was clearly nothing to do but flop down on the shabby little couch and howl. So Della did it. Which instigates the moral reflection that life is made up of sobs, sniffles, and smiles, with sniffles predominating.

Now, there were two possessions of the James Dillingham Youngs in which they both took a mighty pride. One was Jim's gold watch that had been his father's and his grandfather's. The other was Della's hair. Had the queen of Sheba lived in the flat across the airshaft, Della would have let her hair hang out the window some day to dry just to depreciate Her Majesty's jewels and gifts.

Della's beautiful hair fell about her, rippling and shining like a cascade of brown waters. It reached below her knee and made itself almost a garment for her. And then she did it up again nervously and quickly. Once she faltered for a minute and stood still while a tear or two splashed on the worn red carpet.

On went her old brown jacket; on went her old brown hat. With a whirl of skirts and with the brilliant sparkle still in her eyes, she fluttered out the door and down the stairs to the street.

Where she stopped the sign read: "Mme. Sofronie. Hair Goods of All Kinds." One flight up Della ran, and collected herself, panting.

"Will you buy my hair?" asked Della.

"I buy hair," said Madame. "Take yer hat off and let's have a sight at the looks of it."

Down rippled the brown cascade.

"Twenty dollars," said Madame, lifting the mass with a practised hand.

"Give it to me quick," said Della.

Oh, and the next two hours tripped by on rosy wings. She was ransacking the stores for Jim's present.

She found it at last. It surely had been made for Jim and no one else. There was no other like it in any of the stores, and she had turned all of them inside out. It was a platinum watch-chain, simple and chaste in design, properly proclaiming its value by substance alone and not by meretricious ornamentation—as all good things should do. It was even worthy of The Watch. As soon as she saw it she knew that it must be Jim's. It was like him. Quietness and value—the description applied to both. Twenty-one dollars they took from her for it, and she hurried home with the eighty-seven cents.

When Jim arrived, his eyes were fixed upon Della, and there was an expression in them that she could not read, and it terrified her. It was not anger, nor surprise, nor disapproval, nor horror, nor any of the sentiments that she had been prepared for. He simply stared at her fixedly with that peculiar expression on his face.

Jim drew a package from his overcoat pocket and threw it upon the table. Della tore at the string and paper. An ecstatic scream of joy; and then, alas! a quick feminine change to hysterical tears and wails.

For there lay The Combs—the set of combs, side and back, that Della had worshipped for long in a Broadway window. Beautiful combs, pure tortoise shell, with jewelled rims—just the shade to wear in the beautiful vanished hair.

And then Della leaped up like a little singed cat and cried, "Oh, oh!" Jim had not yet seen his beautiful present. She held it out to him eagerly upon her open palm. "Isn't it a dandy, Jim? Give me your watch. I want to see how it looks on it."

Instead of obeying, Jim tumbled down on the couch and put his hands under the back of his head and smiled.

"Dell," said he, "let's put our Christmas presents away and keep 'em a while. They're too nice to use just at present. I sold the watch to get the money to buy your combs."`,
  },
  {
    id: "classic-en-selfish-giant",
    language: "en",
    title: "The Selfish Giant",
    author: "Oscar Wilde",
    category: "fairy-tale",
    level: "A2-B1",
    summary: "Bahçesine çocukların girmesini yasaklayan ama baharı da kaybeden devin sevgiyle dönüşümü.",
    text: `Every afternoon, as they were coming from school, the children used to go and play in the Giant's garden.

It was a large lovely garden, with soft green grass. Here and there over the grass stood beautiful flowers like stars, and there were twelve peach-trees that in the spring-time broke out into delicate blossoms of pink and pearl, and in the autumn bore rich fruit. The birds sat on the trees and sang so sweetly that the children used to stop their games in order to listen to them. "How happy we are here!" they cried to each other.

One day the Giant came back. He had been to visit his friend the Cornish ogre, and had stayed with him for seven years. After the seven years were over he had said all that he had to say, for his conversation was limited, and he determined to return to his own castle. When he arrived he saw the children playing in the garden.

"What are you doing here?" he cried in a very gruff voice, and the children ran away.

"My own garden is my own garden," said the Giant; "any one can understand that, and I will allow nobody to play in it but myself." So he built a high wall all round it, and put up a notice-board:

TRESPASSERS WILL BE PROSECUTED.

He was a very selfish Giant. The poor children had now nowhere to play. They tried to play on the road, but the road was very dusty and full of hard stones, and they did not like it.

Then the Spring came, and all over the country there were little blossoms and little birds. Only in the garden of the Selfish Giant it was still winter. The birds did not care to sing in it as there were no children, and the trees forgot to blossom.

"I cannot understand why the Spring is so late in coming," said the Selfish Giant, as he sat at the window and looked out at his cold white garden; "I hope there will be a change in the weather."

But the Spring never came, nor the Summer. The Autumn gave golden fruit to every garden, but to the Giant's garden she gave none. "He is too selfish," she said. So it was always Winter there.

One morning the Giant was lying awake in bed when he heard some lovely music. It sounded so sweet to his ears that he thought it must be the King's musicians passing by. It was really only a little linnet singing outside his window, but it was so long since he had heard a bird sing in his garden that it seemed to him to be the most beautiful music in the world.

He jumped out of bed and looked out. What did he see?

He saw a most wonderful sight. Through a little hole in the wall the children had crept in, and they were sitting in the branches of the trees. In every tree that he could see there was a little child. And the trees were so glad to have the children back again that they had covered themselves with blossoms, and were waving their arms gently above the children's heads.

"How selfish I have been!" he said; "now I know why the Spring would not come here. I will put that poor little boy on the top of the tree, and then I will knock down the wall, and my garden shall be the children's playground for ever and ever."`,
  },
  {
    id: "classic-en-story-hour",
    language: "en",
    title: "The Story of an Hour",
    author: "Kate Chopin",
    category: "story",
    level: "B1-B2",
    summary: "Kocasının tren kazasında öldüğü haberini alan genç kadının bir saat içinde yaşadığı özgürlük duygusu ve beklenmedik son.",
    text: `Knowing that Mrs. Mallard was afflicted with a heart trouble, great care was taken to break to her as gently as possible the news of her husband's death.

It was her sister Josephine who told her, in broken sentences; veiled hints that revealed in half concealing. Her husband's friend Richards was there, too, near her. It was he who had been in the newspaper office when intelligence of the railroad disaster was received, with Brently Mallard's name leading the list of "killed."

She did not hear the story as many women have heard the same, with a paralyzed inability to accept its significance. She wept at once, with sudden, wild abandonment, in her sister's arms. When the storm of grief had spent itself she went away to her room alone. She would have no one follow her.

There stood, facing the open window, a comfortable, roomy armchair. Into this she sank, pressed down by a physical exhaustion that haunted her body and seemed to reach into her soul.

She could see in the open square before her house the tops of trees that were all aquiver with the new spring life. The delicious breath of rain was in the air. In the street below a peddler was crying his wares. The notes of a distant song which someone was singing reached her faintly, and countless sparrows were twittering in the eaves.

She sat with her head thrown back upon the cushion of the chair, quite motionless, except when a sob came up into her throat and shook her, as a child who has cried itself to sleep continues to sob in its dreams.

There was something coming to her and she was waiting for it, fearfully. What was it? She did not know; it was too subtle and elusive to name. But she felt it, creeping out of the sky, reaching toward her through the sounds, the scents, the color that filled the air.

Now her bosom rose and fell tumultuously. She was beginning to recognize this thing that was approaching to possess her, and she was striving to beat it back with her will. When she abandoned herself a little whispered word escaped her parted lips. She said it over and over under her breath: "free, free, free!"

Her pulses beat fast, and the coursing blood warmed and relaxed every inch of her body. She did not stop to ask if it were or were not a monstrous joy that held her. A clear and exalted perception enabled her to dismiss the suggestion as trivial. She knew that she would weep again when she saw the kind, tender hands folded in death; the face that had never looked save with love upon her, fixed and gray and dead. But she saw beyond that bitter moment a long procession of years to come that would belong to her absolutely. And she opened and spread her arms out to them in welcome.

There would be no one to live for during those coming years; she would live for herself. There would be no powerful will bending hers in that blind persistence with which men and women believe they have a right to impose a private will upon a fellow-creature.

"Free! Body and soul free!" she kept whispering.`,
  },
  {
    id: "classic-en-open-window",
    language: "en",
    title: "The Open Window",
    author: "Saki (H.H. Munro)",
    category: "story",
    level: "B1-B2",
    summary: "Sinirlerini dinlendirmek için kırsala giden bir adamın, genç bir kızın anlattığı ürpertici aile hikayesiyle yaşadığı şok.",
    text: `"My aunt will be down presently, Mr. Nuttel," said a very self-possessed young lady of fifteen; "in the meantime you must try and put up with me."

Framton Nuttel endeavoured to say the correct something which should duly flatter the niece of the moment without unduly discounting the aunt that was to come. Privately he doubted more than ever whether these formal visits on a succession of total strangers would do much towards helping the nerve cure which he was supposed to be undergoing.

"Do you know many of the people round here?" asked the niece, when she judged that they had had sufficient silent communion.

"Hardly a soul," said Framton. "My sister was staying here, at the rectory, you know, some four years ago, and she gave me letters of introduction to some of the people here."

"Then you know practically nothing about my aunt?" pursued the self-possessed young lady.

"Only her name and address," admitted the caller.

"Her great tragedy happened just three years ago," said the child; "that would be since your sister's time."

"Her tragedy?" asked Framton; somehow in this restful country spot tragedies seemed out of place.

"You may wonder why we keep that window wide open on an October afternoon," said the niece, indicating a large French window that opened on to a lawn.

"It is quite warm for the time of the year," said Framton; "but has that window got anything to do with the tragedy?"

"Out through that window, three years ago to a day, her husband and her two young brothers went off for their day's shooting. They never came back. In crossing the moor to their favourite snipe-shooting ground they were all three engulfed in a treacherous piece of bog. Their bodies were never recovered. That was the dreadful part of it." Here the child's voice lost its self-possessed note and became falteringly human. "Poor aunt always thinks that they will come back someday, they and the little brown spaniel that was lost with them, and walk in at that window just as they used to do. That is why the window is kept open every evening till it is quite dusk."

She broke off with a little shudder. It was a relief to Framton when the aunt bustled into the room with a whirl of apologies for being late in making her appearance.

"I hope Vera has been amusing you?" she said.

"She has been very interesting," said Framton.

"I hope you don't mind the open window," said Mrs. Sappleton briskly; "my husband and brothers will be home directly from shooting, and they always come in this way."

To Framton it was all purely horrible. Suddenly Mrs. Sappleton's face brightened with alert attention.

"Here they are at last!" she cried. "Just in time for tea!"

Framton shivered and turned towards the niece with a look intended to convey sympathetic comprehension. The child was staring out through the open window with dazed horror in her eyes. In a chill shock of nameless fear Framton swung round in his seat and looked in the same direction.

In the deepening twilight three figures were walking across the lawn towards the window; they all carried guns under their arms, and one of them was additionally burdened with a white coat hung over his shoulders. A tired brown spaniel kept close at their heels.

Framton grabbed wildly at his stick and hat; the hall-door, the gravel-drive, and the front gates were dimly-noted stages in his headlong retreat.

"A most extraordinary man, a Mr. Nuttel," said Mrs. Sappleton; "could only talk about his illnesses, and dashed off without a word of good-bye or apology when you arrived. One would think he had seen a ghost."

"I expect it was the spaniel," said the niece calmly; "he told me he had a horror of dogs."

Romance at short notice was her speciality.`,
  },
  {
    id: "classic-en-nightingale-rose",
    language: "en",
    title: "The Nightingale and the Rose",
    author: "Oscar Wilde",
    category: "fairy-tale",
    level: "B1-B2",
    summary: "Aşık öğrenci için kalbini bir güle feda eden bülbülün dokunaklı hikayesi.",
    text: `"She said that she would dance with me if I brought her red roses," cried the young Student; "but in all my garden there is no red rose."

From her nest in the holm-oak tree the Nightingale heard him, and she looked out through the leaves, and wondered.

"No red rose in all my garden!" he cried, and his beautiful eyes filled with tears. "Ah, on what little things does happiness depend! I have read all that the wise men have written, and all the secrets of philosophy are mine, yet for want of a red rose is my life made wretched."

"Here at last is a true lover," said the Nightingale. "Night after night have I sung of him, though I knew him not: night after night have I told his story to the stars, and now I see him. His hair is dark as the hyacinth-blossom, and his lips are red as the rose of his desire; but passion has made his face like pale ivory, and sorrow has set her seal upon his brow."

So the Nightingale flew over to the Rose-tree that was growing in the centre of the grass-plot.

"Give me a red rose," she cried, "and I will sing you my sweetest song."

But the Tree shook its head. "My roses are red," it answered, "as red as the feet of the dove, and redder than the great fans of coral that wave and wave in the ocean-cavern. But the winter has chilled my veins, and the frost has nipped my buds, and the storm has broken my branches, and I shall have no roses at all this year."

"Is there no way by which I can get it?" cried the Nightingale.

"There is a way," answered the Tree; "but it is so terrible that I dare not tell it to you."

"Tell it to me," said the Nightingale, "I am not afraid."

"If you want a red rose," said the Tree, "you must build it out of music by moonlight, and stain it with your own heart's-blood. You must sing to me with your breast against a thorn. All night long you must sing to me, and the thorn must pierce your heart, and your life-blood must flow into my veins, and become mine."

"Death is a great price to pay for a red rose," cried the Nightingale, "and Life is very dear to all. Yet Love is better than Life, and what is the heart of a bird compared to the heart of a man?"

So the Nightingale pressed her breast against the thorn, and sang of the love that is perfected by Death. And a marvelous red rose blossomed into being, delicate as the rose of the morning.`,
  },
  {
    id: "classic-en-golden-eggs",
    language: "en",
    title: "The Goose with the Golden Eggs",
    author: "Aesop",
    category: "fable",
    level: "A1-A2",
    summary: "Açgözlülüğü yüzünden her gün altın yumurtlayan kazını kesen ve her şeyini kaybeden köylü.",
    text: `A cottager and his wife had a Hen that laid a golden egg every day. They supposed that the Hen must contain a great lump of gold in its inside, and in order to get the gold they killed it.

Having done so, they began to cut it open, but to their utter disappointment, they found it just like any other Hen.

Thus, wishing to become rich all at once, they deprived themselves of the gain of which they were day by day assured.

Greed oft o'erleaps itself.`,
  },
  {
    id: "classic-en-lion-share",
    language: "en",
    title: "The Lion's Share",
    author: "Aesop",
    category: "fable",
    level: "A1-A2",
    summary: "Birlikte avlanan hayvanların avını kendi gücüne dayanarak tek başına sahiplenen aslan.",
    text: `A Lion, a Fox, a Jackal, and a Wolf once formed an alliance to go hunting together in the forest. They all agreed that whatever game was taken should be divided equally among them.

Presently a fine Fat Stag was captured by the Fox, and all the four beasts assembled round the carcass to partake of their spoil.

The Lion was chosen to divide the deer. He carefully partitioned the prey into four equal shares.

When this was done, the Lion stepped forward and cleared his throat.

"The first share belongs to me," he announced, "because my name is Lion, and I am the King of beasts. The second share is mine because I am the strongest. The third share is mine because my labor in the chase was the greatest. And as for the fourth share, let him take it who dares to touch it."

The other beasts slunk away into the shadows without a single word.

Might makes right.`,
  },
  {
    id: "classic-en-fisherman-wife",
    language: "en",
    title: "The Fisherman and His Wife",
    author: "Brothers Grimm",
    category: "fairy-tale",
    level: "A2-B1",
    summary: "Dilekleri gerçekleştiren büyülü balıktan doyumsuzca isteklerde bulunan kadının hırsı yüzünden eski kulübesine dönmesi.",
    text: `There was once a fisherman and his wife who lived together in a filthy little hovel close by the sea. Every day the fisherman went out with his rod and line, and he sat and fished, and looked into the sparkling water.

One day, as he sat and looked down into the clear depths, his line went deep down, and when he hauled it up, he brought with him a great Flounder.

Then the Flounder said to him, "Hark you, fisherman, I pray you, let me live; I am no common fish, but an enchanted prince. What will it avail you to kill me? I should not taste well; put me back into the water, and let me swim."

"Well," said the man, "you have no need to make so many words about it; a fish that can talk I should certainly let go." And with that he put him back into the clear water, and the Flounder sank to the bottom.

When the fisherman went home to his wife in the hovel, he told her of the talking fish.

"Did you ask for nothing?" said the wife.

"No," said the man, "what should I ask for?"

"Ah!" said the wife, "it is dreadful to live always in this dirty hovel. Go back and ask him for a snug little cottage."

The man went back to the sea, and when he came there, the sea was green and yellow. He called:

"Flounder, Flounder, in the sea,
Prithee, listen unto me:
For my wife, good Dame Isabel,
Wills not as I would have her tell."

Then the Flounder came swimming up and said, "What does she want?"

"Ah," said the man, "she wants a little cottage."

"Go home," said the Flounder; "she has it already."

And indeed, the cottage was clean and bright. But soon the wife wanted a great stone castle, and then to be King, and then Emperor, and then Pope. Each time the sea grew darker and stormier, yet the fish granted her wish.

At last she said, "Husband, go to the fish and tell him I will be like the Good Lord, and make the sun and moon rise."

The fisherman went trembling with fear. The storm raged, trees fell, and the sky was black as pitch. He cried the verse into the wind.

"What does she want now?" asked the Flounder.

"Alas," said the man, "she wants to be like the Good Lord."

"Go thy way home," said the Flounder; "she is sitting in the dirty hovel again."

And there they are sitting to this very day.`,
  },
  {
    id: "classic-fr-parure",
    language: "fr",
    title: "La Parure",
    author: "Guy de Maupassant",
    category: "story",
    level: "B1-B2",
    summary: "Bakanlık balosunda takmak için arkadaşından ödünç aldığı elmas kolyeyi kaybeden kadının on yıllık sefaletle ödediği acı bedel.",
    text: `C'était une de ces jolies et charmantes filles, nées, comme par une erreur du destin, dans une famille d'employés. Elle n'avait pas de dot, pas d'espérances, aucun moyen d'être connue, comprise, aimée, épousée par un homme riche et distingué ; et elle se laissa marier avec un petit commis du ministère de l'Instruction publique.

Elle souffrait sans cesse, se sentant née pour toutes les délicatesses et tous les luxes. Elle souffrait de la pauvreté de son logement, de la misère des murs, de l'usure des sièges, de la laideur des étoffes.

Or, un soir, son mari rentra, d'un air glorieux, et tenant à la main une large enveloppe.

« Tiens, dit-il, voici quelque chose pour toi. »

Elle déchira vivement le papier et en tira une carte imprimée qui portait ces mots :
« Le ministre de l'Instruction publique et Mme Georges Ramponneau prient M. et Mme Loisel de leur faire l'honneur de venir passer la soirée à l'hôtel du ministère, le lundi 18 janvier. »

Au lieu d'être ravie, comme l'espérait son mari, elle jeta avec dépit l'invitation sur la table, murmurant :
« Que veux-tu que je fasse de cela ? Je n'ai pas de toilette et par conséquent je ne peux aller à cette fête. »

Il lui donna quatre cents francs, qu'il avait économisés pour s'acheter un fusil de chasse. Mais le jour de la fête approchait, et Mme Loisel semblait triste, inquiète.

« Cela m'ennuie de n'avoir pas un bijou, pas une pierre, rien à mettre sur moi. J'aurai l'air misérable comme tout. »

Son mari s'écria : « Va trouver ton amie Mme Forestier et demande-lui de te prêter des bijoux. »

Elle poussa un cri de joie : « C'est vrai ! »

Le lendemain, elle se rendit chez son amie. Mme Forestier alla vers une armoire à glace, prit un large coffret, l'apporta, l'ouvrit. Mme Loisel découvrit une superbe rivière de diamants. Son cœur se mit à battre d'un désir immodéré. Elle demanda, hésitante : « Peux-tu me prêter cela, rien que cela ? — Mais oui, certainement. »

Le jour du bal arriva. Mme Loisel eut un succès fou. Elle était plus jolie que toutes, élégante, gracieuse, souriante et folle de joie.

Ils rentrèrent chez eux vers quatre heures du matin. Devant la glace, elle ôta les châles qui lui enveloppaient les épaules, pour se voir encore une fois dans sa gloire. Mais soudain elle poussa un cri. Elle n'avait plus sa rivière autour du cou !

Ils cherchèrent partout, dans les plis de la robe, dans les plis du manteau, dans les poches. Rien.

Pour remplacer le bijou, ils trouvèrent au Palais-Royal un chapelet de diamants qui leur parut entièrement semblable à celui qu'ils cherchaient. Il valait quarante mille francs ; on le leur laissa à trente-six mille. Loisel possédait dix-huit mille francs que lui avait laissés son père. Il emprunta le reste, signant des billets ruineux, faisant des affaires d'usurier.

Mme Loisel connut la vie horrible des nécessiteux. Elle renvoya la bonne, changea de logement, lava la vaisselle, frotta le linge sale à la main. Et cette vie dura dix ans. Au bout de dix ans, ils avaient tout remboursé.

Un dimanche, comme elle était allée faire un tour aux Champs-Élysées, elle aperçut Mme Forestier, toujours jeune, toujours belle.

Elle s'approcha : « Bonjour, Jeanne. » L'autre ne la reconnaissait point, étonnée d'être ainsi appelée familièrement par cette femme du peuple.
« Mais... madame... je ne sais... vous devez vous tromper.
— Non. Je suis Mathilde Loisel. »

Elle lui raconta toute l'histoire, la perte du bijou, l'achat du nouveau et les dix années de privations pour payer la dette.

Mme Forestier, fort émue, lui prit les deux mains :
« Oh ! ma pauvre Mathilde ! Mais la mienne était fausse ! Elle valait au plus cinq cents francs ! »`,
  },
  {
    id: "classic-fr-derniere-classe",
    language: "fr",
    title: "La Dernière Classe",
    author: "Alphonse Daudet",
    category: "story",
    level: "B1-B2",
    summary: "Alsas bölgesinde Prusya işgali sonrası Fransızca okutulacak son dersi ve anadilin kutsiyetini anlatan dokunaklı anlatı.",
    text: `Ce matin-là, j'étais très en retard pour aller à l'école, et j'avais grand'peur d'être grondé, d'autant plus que M. Hamel nous avait dit qu'il nous interrogerait sur les participes, et je n'en savais pas le premier mot.

Un moment l'idée me vint de manquer la classe et de courir les champs. Le temps était si chaud, si clair ! Mais j'eus la force de résister, et je courus bien vite vers l'école.

D'ordinaire, au commencement de la classe, il se faisait un grand tapage qu'on entendait jusque dans la rue, des pupitres ouverts, fermés, des leçons qu'on répétait très haut tous ensemble en se bouchant les oreilles pour mieux apprendre. Mais ce jour-là, tout était tranquille comme un matin de dimanche.

M. Hamel me regarda sans colère et me dit très doucement : « Va vite à ta place, mon petit Frantz ; nous allions commencer sans toi. »

J'enjambai le banc et je m'assis tout de suite à mon pupitre. Ce qui me surprit le plus, ce fut de voir au fond de la salle, sur les bancs qui restaient vides d'habitude, des gens du village assis et silencieux comme nous : le vieux Hauser avec son tricorne, l'ancien maire, l'ancien facteur, et d'autres personnes encore.

Alors, M. Hamel monta dans sa chaire, et, de la même voix douce et grave dont il m'avait reçu, il nous dit :

« Mes enfants, c'est la dernière fois que je vous fais la classe. L'ordre est venu de Berlin de ne plus enseigner que l'allemand dans les écoles de l'Alsace et de la Lorraine... Le nouveau maître arrive demain. Aujourd'hui c'est votre dernière leçon de français. Je vous en prie, soyez bien attentifs. »

Ces quelques paroles me bouleversèrent. Ah ! les misérables, voilà ce qu'ils avaient affiché à la mairie !

Ma dernière leçon de français !... Et moi qui savais à peine écrire ! Je ne devais donc jamais apprendre ! Comme je m'en voulais maintenant du temps perdu, des classes manquées à courir les nids ou à glisser sur la Saar !

M. Hamel s'était levé, tout pâle, dans sa chaire. Jamais il ne m'avait paru si grand.

« Mes amis, dit-il, mes amis, je... je... » Mais quelque chose l'étouffait. Il ne pouvait pas achever sa phrase.

Alors il se tourna vers le tableau, prit un morceau de craie, et, appuyant de toutes ses forces, il écrivit aussi gros qu'il put :

« VIVE LA FRANCE ! »

Puis il resta là, la tête appuyée contre le mur, et, sans parler, avec sa main, il nous faisait signe :
« C'est fini... allez-vous-en. »`,
  },
  {
    id: "classic-fr-chat-botte",
    language: "fr",
    title: "Le Chat Botté",
    author: "Charles Perrault",
    category: "fairy-tale",
    level: "A2-B1",
    summary: "Değirmencinin en küçük oğluna miras kalan zeki ve çizmeli kedinin sahibini bir marka dönüştürme serüveni.",
    text: `Un meunier ne laissa pour tous biens à trois enfants qu'il avait, que son moulin, son âne et son chat. Les partages furent bientôt faits : l'aîné eut le moulin, le second eut l'âne, et le plus jeune n'eut que le chat.

Ce dernier ne pouvait se consoler d'avoir un si pauvre lot : « Mes frères, disait-il, pourront gagner leur vie honnêtement en se mettant ensemble ; pour moi, quand j'aurai mangé mon chat, et que je me serai fait un manchon de sa peau, il faudra que je meure de faim. »

Le Chat, qui entendait ce discours, mais qui n'en fit pas semblant, lui dit d'un air posé et sérieux :

« Ne vous affligez point, mon maître ; vous n'avez qu'à me donner un sac, et me faire faire une paire de bottes pour aller dans les broussailles, et vous verrez que vous n'êtes pas si mal partagé que vous croyez. »

Quoique le maître du Chat ne fît pas grand fond là-dessus, il lui avait vu faire tant de tours de souplesse pour prendre des rats et des souris, qu'il ne désespéra pas d'en être secouru dans sa misère.

Lorsque le Chat eut ce qu'il avait demandé, il botta hardiment ses bottes, et, mettant son sac à son cou, il s'en alla dans une garenne où il y avait grand nombre de lapins. Il mit du son et des herbes dans son sac, et, se couchant tout de son long comme s'il eût été mort, il attendit qu'un jeune lapin vînt s'enfourner dans le sac.

À peine fut-il couché, qu'il eut contentement : un étourdi de jeune lapin entra dans son sac, et le Chat tira aussitôt les cordons pour l'attraper.

Tout fier de sa proie, il s'en alla chez le Roi et demanda à lui parler. On le fit monter à l'appartement de Sa Majesté, où étant entré, il fit une grande révérence au Roi, et lui dit :

« Voilà, Sire, un lapin de garenne que Monsieur le Marquis de Carabas (c'était le nom qu'il lui plut de donner à son maître) m'a chargé de vous présenter de sa part.

— Dis à ton maître, répondit le Roi, que je le remercie, et qu'il me fait plaisir. »

Grâce à son audace et à ses ruses ingénieuses, le Chat conquit l'amitié du souverain et fit épouser à son maître la fille du Roi, devenant lui-même un grand seigneur qui ne courut plus après les souris que pour se divertir.`,
  },
  {
    id: "classic-fr-cendrillon",
    language: "fr",
    title: "Cendrillon",
    author: "Charles Perrault",
    category: "fairy-tale",
    level: "A2-B1",
    summary: "Üvey annesi ve kardeşlerinin eziyetine rağmen nezaketi ve cam ayakkabısıyla mutluluğu bulan genç kızın öyküsü.",
    text: `Il était une fois un gentilhomme qui épousa en secondes noces une femme, la plus hautaine et la plus fière qu'on eût jamais vue. Elle avait deux filles de son humeur, et qui lui ressemblaient en toutes choses. Le mari avait, de son côté, une jeune fille, mais d'une douceur et d'une bonté sans exemple ; elle tenait cela de sa mère, qui était la meilleure femme du monde.

Les noces ne furent pas plus tôt faites, que la belle-mère fit éclater sa mauvaise humeur : elle ne put souffrir les bonnes qualités de cette jeune enfant, qui rendaient ses filles encore plus haïssables. Elle la chargea des plus viles occupations de la maison : c'était elle qui nettoyait la vaisselle et les montées, qui frottait la chambre de madame et celles de mesdemoiselles ses filles.

Lorsqu'elle avait fait son ouvrage, elle s'allait mettre au coin de la cheminée, et s'asseoir dans les cendres, ce qui faisait qu'on l'appelait communément Cendrillon. Cependant Cendrillon, avec ses vilains habits, ne laissait pas d'être cent fois plus belle que ses sœurs, quoique vêtues très magnifiquement.

Il arriva que le fils du Roi donna un bal, et qu'il en pria toutes les personnes de distinction. Nos deux demoiselles en furent aussi priées, car elles faisaient grande figure dans le pays.

Le grand jour arriva, et quand Cendrillon les vit partir, elle se mit à pleurer. Sa marraine, qui la vit tout en pleurs, lui demanda ce qu'elle avait.

« Je voudrais bien... je voudrais bien... » Elle pleurait si fort qu'elle ne pouvait achever. Sa marraine, qui était fée, lui dit : « Tu voudrais bien aller au bal, n'est-ce pas ? »

D'un coup de baguette magique, elle transforma une citrouille en carrosse doré, six souris en magnifiques chevaux gris pommelé, et les haillons de Cendrillon en un drap d'or et d'argent chamarré de pierreries. Elle lui donna ensuite une paire de pantoufles de verre, les plus jolies du monde.

« Mais surtout, lui recommanda sa marraine, ne dépasse pas minuit ; car si tu demeures au bal un moment de plus, ton carrosse redeviendra citrouille, tes chevaux des souris, et tes habits reprendront leur première forme. »

Au bal, le prince n'eut d'yeux que pour elle, charmé par sa beauté et sa divine douceur.`,
  },
  {
    id: "classic-fr-meunier-fils-ane",
    language: "fr",
    title: "Le Meunier, son Fils et l'Âne",
    author: "Jean de La Fontaine",
    category: "fable",
    level: "A2-B1",
    summary: "Herkesi memnun etmeye çalışıp kimseyi memnun edemeyen değirmenci ile oğlunun ders dolu serüveni.",
    text: `L'invention des arts étant un droit d'aînesse,
Nous devons l'apologue à l'ancienne Grèce ;
Mais ce champ ne se peut tellement moissonner
Que les derniers venus n'y trouvent à glaner.

Un meunier et son fils, l'un vieillard, l'autre enfant,
S'en allaient vendre leur âne à la foire un matin.
Pour ne pas le lasser avant qu'on ne le vende,
Ils l'attachent par les pieds et le portent suspended
À un bâton sur leurs épaules.

Le premier passant qui les vit s'écria :
« Quels fous nous viennent là ! Le plus sage des trois
N'est pas celui qu'on pense ! »
Le meunier, confus, détache la bête et la fait marcher.

Il monte son fils sur l'âne, et marche à côté.
Trois marchands passent et crient : « Voyez ce jeune insolent
Qui se prélasse pendant que son vieux père va à pied ! »
Aussitôt le père descend l'enfant et monte lui-même.

Trois jeunes filles passent alors : « Quel déshonneur !
Ce vieux grison s'assoit comme un évêque, et laisse
Ce pauvre petit garçon trotter dans la poussière ! »
Le meunier prend alors son fils en croupe avec lui.

Un autre passant s'écrie : « Barbares ! Vous allez écraser
Cette pauvre bête sous votre double poids ! »
Le meunier, excédé de vouloir complaire à tous,
S'écria : « Je suis bien fou de chercher à contenter
Chacun et son voisin ! Désormais, je ferai à ma tête ! »

Et il fit bien.
Quoi que vous fassiez, vous ne pourrez jamais contenter tout le monde.`,
  },
  {
    id: "classic-fr-rat-ville-champs",
    language: "fr",
    title: "Le Rat de Ville et le Rat des Champs",
    author: "Jean de La Fontaine",
    category: "fable",
    level: "A1-A2",
    summary: "Zenginlik ve korku içinde bir ziyafettense, huzur içinde sade bir yemeği yeğleyen kır faresinin seçimi.",
    text: `Autrefois le rat de ville
Invita le rat des champs,
D'une façon fort civile,
À des reliefs de rôtis et de faisans.

Sur un tapis de Turquie
Le couvert se trouva mis.
Je laisse à penser la vie
Que firent ces deux amis.

Le régal fut fort honnête,
Rien ne manquait au festin ;
Mais quelqu'un troubla la fête
Pendant qu'ils étaient en train.

À la porte de la salle
Ils entendirent du bruit :
Le rat de ville détale ;
Son camarade le suit.

Le bruit cesse, on se retire :
Les rats sortent aussitôt ;
Et le citadin de dire :
« Achevons tout notre rôt.

— C'est assez, dit le rustique ;
Demain vous viendrez chez moi :
Ce n'est pas que je me pique
De tous vos festins de roi ;

Mais rien ne vient m'interrompre :
Je mange tout à loisir.
Adieu donc ; fi du plaisir
Que la crainte peut corrompre ! »`,
  },
  {
    id: "classic-fr-belle-et-bete",
    language: "fr",
    title: "La Belle et la Bête",
    author: "Jeanne-Marie Leprince de Beaumont",
    category: "fairy-tale",
    level: "A2-B1",
    summary: "Korkunç görünüşlü bir canavarın kalbindeki inceliği ve sevgiyi keşfederek büyüyü bozan güzel kızın öyküsü.",
    text: `Il y avait une fois un marchand qui était extrêmement riche. Il avait six enfants, trois garçons et trois filles ; et, comme ce marchand était un homme d'esprit, il n'épargna rien pour l'éducation de ses enfants. Les filles étaient très belles ; mais la cadette surtout se faisait admirer, et on ne l'appelait, dès son enfance, que « la Belle Enfant » ; en sorte que le nom lui en resta, ce qui donna beaucoup de jalousie à ses sœurs.

Cette cadette, qui était plus belle que ses sœurs, était aussi meilleure qu'elles. Elle passait son temps à lire de bons livres ou à jouer du clavecin.

Tout d'un coup le marchand perdit son bien, et il ne lui resta qu'une petite maison de campagne, bien loin de la ville. Il dit en pleurant à ses enfants qu'il fallait partir là-bas pour vivre du travail de leurs mains.

Quelques années plus tard, le marchand apprit qu'un de ses navires venait d'arriver au port avec des marchandises. En partant, il demanda à ses filles ce qu'elles souhaitaient. Les deux aînées demandèrent des robes magnifiques et des bijoux. Belle demanda simplement une rose, car il n'en poussait point dans leur région.

Le marchand ne retrouva rien de sa fortune et dut repartir les mains vides. En traversant une grande forêt sous la tempête, il découvrit un château illuminé où personne ne paraissait habiter. Une table garnie d'un repas chaud l'attendait.

Le lendemain matin, en quittant le jardin du palais, il aperçut un bosquet de roses magnifiques et cueillit une branche pour Belle.

Aussitôt, un monstre terrible apparut avec un rugissement : « Vous êtes bien ingrat ! Je vous ai sauvé la vie en vous recevant dans mon château, et vous me volez mes roses, que j'aime mieux que toutes choses au monde ! Il faut mourir pour réparer cet outrage ! »

Le marchand supplia la Bête, expliquant que cette fleur était pour sa fille cadette. La Bête lui accorda un sursis à condition que l'une de ses filles vînt mourir volontairement à sa place.

Quand Belle sut la vérité, elle refusa de laisser périr son père et partit courageusement pour le château de la Bête. Mais au lieu d'un bourreau féroce, elle découvrit une créature pleine de bonté, de délicatesse et de respect, dont le cœur pur triompha du mauvais sort.`,
  },
  {
    id: "classic-fr-deux-amis",
    language: "fr",
    title: "Deux Amis",
    author: "Guy de Maupassant",
    category: "story",
    level: "B1-B2",
    summary: "Kuşatma altındaki Paris'te balık tutma tutkuları uğruna cephe hattına giden ve dostluklarını canlarıyla ödeyen iki sıradan insanın hikayesi.",
    text: `Paris était bloqué, affamé et râlant. Les moineaux se faisaient bien rares sur les toits, et les égouts se dépeuplaient. On mangeait n'importe quoi.

Comme il se promenait tristement par un clair matin de janvier, le ventre vide et les mains dans les poches de son pantalon d'uniforme, M. Morissot, horloger de son état, s'arrêta net devant un confrère qu'il reconnut pour un ami. C'était M. Sauvage, une connaissance du bord de l'eau.

Tous les dimanches, avant la guerre, Morissot partait dès l'aube, une gaule en bambou à la main, une boîte en fer-blanc sur le dos. Il prenait le chemin de fer d'Argenteuil, descendait à Colombes, puis gagnait à pied l'île Marante. Dès qu'il arrivait à ce lieu de ses rêves, il se mettait à pêcher ; et il pêchait jusqu'à la nuit.

Chaque dimanche, il rencontrait là un petit homme replet et jovial, M. Sauvage, mercier rue Notre-Dame-de-Lorette, autre pêcheur fanatique. Souvent ils passaient une demi-journée côte à côte, la ligne à la main et les pieds ballants au-dessus du courant ; et ils s'étaient pris d'amitié.

« Quel temps ! dit Sauvage.
— Et quel beau soleil ! répondit Morissot. Si nous y allions ?
— Où donc ?
— À la pêche. »

Munis d'un laissez-passer délivré par un colonel bienveillant, ils franchirent les avant-postes français et gagnèrent les rives désertes de la Seine près du moulin de Colombes. La campagne était vide, silencieuse et glacée. Le Mont-Valérien grondait au loin, crachant des fumées blanches au-dessus des collines.

Bientôt, les goujons mordirent avec abondance. Les deux amis oubliaient la guerre, le canon, la faim, absorbés tout entiers par le frémissement de leur ligne au fil de l'eau.

Soudain, un bruit de pas derrière eux les fit tressaillir. Quatre hommes armés, en uniforme prussien, les entouraient à bout portant.

On les emmena auprès d'un officier. « Avez-vous le mot d'ordre pour rentrer ? Donnez-le-moi et je vous laisse repartir libres. Sinon, c'est la mort immédiate. »

Les deux amis, pâles et immobiles sous le ciel d'hiver, se regardèrent en silence. Pas un mot ne franchit leurs lèvres pour trahir leur patrie.

Quelques instants plus tard, douze détonations retentirent d'un seul coup, et leurs corps liés furent rendus aux eaux paisibles du fleuve.`,
  },
  {
    id: "classic-es-medias-flamencos",
    language: "es",
    title: "Las medias de los flamencos",
    author: "Horacio Quiroga",
    category: "story",
    level: "A2-B1",
    summary: "Viper yılanlarının derisinden çorap giyerek dansa katılan ve bacakları sonsuza dek yanan flamingoların masalı.",
    text: `Cierta vez las víboras dieron un gran baile. Invitaron a las ranas, a los sapos, a los yacarés y a los peces. Los peces, como no caminan, no pudieron bailar; pero siendo el baile a la orilla del río, los peces estaban asomados a la arena, y aplaudían con la cola.

Los yacarés, para adornarse bien, se habían puesto en el pescuezo un collar de plátanos, y fumaban cigarros paraguayos. Los sapos se habían pegado escamas de peces en todo el cuerpo, y caminaban meneándose, como si nadaran. Las ranas se habían perfumado todo el cuerpo, y caminaban en dos pies. Además, cada una llevaba colgada, como un farolito, una luciérnaga que se balanceaba.

Pero las que estaban hermosísimas eran las víboras. Todas, sin excepción, estaban vestidas con traje de bailarina, del mismo color de cada víbora. Las víboras coloradas llevaban una pollerita de tul colorado; las verdes, una de tul verde; las amarillas, otra de tul amarillo; y las yararás, una pollerita de tul gris pintada con rayas de polvo de ladrillo y ceniza, porque así es el color de las yararás.

Y las más espléndidas de todas eran las víboras de coral, que estaban vestidas con larguísimas gasas rojas, blancas y negras, y bailaban como serpentinas.

Los flamencos, que entonces tenían las patas blancas, y tienen ahora como antes la nariz gruesa y torcida, estaban muy tristes, porque como tienen muy poca inteligencia, no habían sabido cómo adornarse. Envidiaban el traje de todos, y sobre todo el de las víboras de coral.

Un flamenco dijo entonces: «Yo sé lo que vamos a hacer. Vamos a ir a pedirle a la lechuza unas medias coloradas, blancas y negras, y las víboras de coral se van a enamorar de nosotros.»

Fueron a ver a la lechuza, y la lechuza, que había cazado víboras de coral y les había quitado el cuero, les dio los cueros de las víboras para que se los pusieran como medias.

«Bailen toda la noche sin parar un momento», les advirtió la lechuza. «Porque si paran un solo segundo, van a llorar en vez de bailar.»

Pero en el baile, las víboras desconfiaron y descubrieron con horror que aquellas medias eran las pieles de sus propias hermanas asesinadas. Furiosas, se lanzaron sobre los flamencos y les mordieron las patas inyectándoles su veneno.

Los flamencos huyeron al agua dando gritos de dolor. Y desde entonces tienen las patas coloradas por el veneno que les quema, y pasan todo el día metidos en el agua para calmar el ardor.`,
  },
  {
    id: "classic-es-abeja-haragana",
    language: "es",
    title: "La abeja haragana",
    author: "Horacio Quiroga",
    category: "story",
    level: "A2-B1",
    summary: "Kovanda çalışmak yerine bütün gün eğlenen ama fırtınalı bir gecede hayat dersi alan tembel arının öyküsü.",
    text: `Había una vez en una colmena una abeja que no quería trabajar, es decir, recorría los árboles uno por uno para tomar el jugo de las flores; pero en vez de conservarlo para convertirlo en miel, se lo tomaba del todo.

Era, pues, una abeja haragana. Todas las mañanas, apenas el sol calentaba el aire, la abejita se asomaba a la puerta de la colmena, veía el lindo día, y volaba muy contenta de flor en flor, entraba en una, bebía el néctar, salía, y se iba a otra flor. Y mientras las otras abejas se mataban trabajando para llenar la colmena de miel, ella se pasaba el día volando y jugando.

Un día, las abejas que estaban de guardia en la puerta de la colmena le dijeron:
«Hermana, es preciso que trabajes, porque todas las abejas debemos trabajar.»

La abejita contestó:
«Yo ando todo el día volando, y me canso mucho.»
«No es cuestión de que te canses mucho, sino de que traigas miel. Es la primera advertencia que te hacemos.»

Al día siguiente se repitió lo mismo. Las abejas guardianas le cerraron el paso con firmeza:
«No se entra. Esta es la colmena de unas pobres abejas trabajadoras. No hay entrada para las haraganas.»

Aquella noche se desató una tormenta espantosa, con viento helado y lluvia torrencial. La pobre abejita, con las alas mojadas y temblando de frío, cayó rodando por el hueco de un árbol viejo.

Allí vivía una serpiente venenosa que comía abejas. La serpiente se preparó para devorarla, pero la abejita, aguzando su ingenio en el peligro, le propuso una prueba de habilidad: esconderse tan bien que la serpiente no pudiera encontrarla. Si ganaba, pasaría la noche a salvo.

La abejita se ocultó dentro de una pequeña planta sensitiva que cerraba sus hojas al menor contacto, desapareciendo a la vista del reptil. La serpiente buscó inútilmente toda la noche y tuvo que admitir su derrota.

Al amanecer, cuando salió el sol, la abejita voló de regreso a la colmena. Las guardianas la dejaron pasar en silencio. Desde aquel día, ninguna abeja recogió tanto polen ni fabricó tanta miel como aquella que había aprendido el valor sagrado del trabajo compartido.`,
  },
  {
    id: "classic-es-monte-animas",
    language: "es",
    title: "El monte de las ánimas",
    author: "Gustavo Adolfo Bécquer",
    category: "story",
    level: "B1-B2",
    summary: "Soria dağlarında Azizler Gecesi tapınak şövalyelerinin ruhlarının uyandığı tepeye giden genç şövalyenin tüyler ürpertici efsanesi.",
    text: `La noche de Difuntos me despertó a no sé qué hora el doble de las campanas. Su tañido monótono y eterno me trajo a las mientes esta tradición que oí hace poco en Soria.

—Atad los perros; haced la señal con las trompas para que se reúnan los cazadores, y demos la vuelta a la ciudad. La noche se acerca, es día de Todos los Santos y estamos en el Monte de las Ánimas.

Así hablaba Alonso a su hermosa prima Beatriz mientras cabalgaban por la margen del Duero. Aquel monte, que perteneció a los templarios, era escenario de una sangrienta rivalidad histórica entre los caballeros de la Orden y los nobles de Castilla. En una noche aciaga se trabó entre ellos una batalla feroz, y los cuerpos de unos y otros quedaron sepultados en la maleza. Desde entonces, la noche de Difuntos, las campanas de la capilla doblan solas y los esqueletos de los guerreros se levantan envueltos en jirones de sus sudarios para correr una cacería infernal por las peñas.

Llegados al palacio gótico de los condes de Alcudiel, mientras el fuego chisporroteaba en el hogar, Alonso regaló a su prima una rica joya. Beatriz, fría y desdeñosa, lamentó haber perdido aquella misma tarde en el monte su cinta azul bordada.

Alonso palideció. «Una noche como esta... ¡ir al Monte de las Ánimas! Sin embargo, prima, tú lo deseas. Iré por tu lazo, aunque las sombras de los templarios se alcen a mi paso.»

Partió en su corcel en medio de las tinieblas.

Beatriz se retiró a su aposento. Las horas transcurrían pesadas. A medianoche creyó oír pasos sigilosos sobre la alfombra, crujidos de armaduras herrumbrosas y suspiros ahogados tras las cortinas de su lecho. Aterrorizada, rezó hasta el amanecer.

Cuando la luz del alba inundó la estancia, Beatriz vio con espanto, posada sobre el reclinatorio de su alcoba, la cinta azul desgarrada y manchada de sangre.

Alonso había sido devorado por los lobos del monte, y ella yacía muerta de pavor.`,
  },
  {
    id: "classic-es-adios-cordera",
    language: "es",
    title: "¡Adiós, Cordera!",
    author: "Leopoldo Alas \"Clarín\"",
    category: "story",
    level: "B1-B2",
    summary: "Asturias kırlarında iki yetim kardeş ile aile gibi sevdikleri ineğin modernleşme ve yoksulluk karşısındaki hüzünlü vedası.",
    text: `¡Eran tres, siempre los tres! Rosa, Pinín y la Cordera.

El prado Somonte era un recorte triangular de terciopelo verde tendido como una capa de abrigo en la ladera del monte. Allí pastaba la Cordera, una vaca que había visto nacer a los gemelos y que para ellos era a la vez madre, nodriza y compañera de juegos. La madre de los niños había muerto de tisis poco después del parto, y su padre, Antón de Chinta, un colono agobiado por las deudas y los tributos, no poseía más capital que aquella noble res.

Por el límite inferior del prado pasaba la vía del ferrocarril. Al principio, el monstruo de hierro que cruzaba humeando espantaba a los niños y hacía erizarse a la Cordera. Pero con los años se acostumbraron a él, y la vaca apenas levantaba la cabeza para verlo pasar con su ruido sordo. Más tarde colocaron los postes del telégrafo, y Pinín y Rosa pegaban el oído a la madera para escuchar el zumbido misterioso del cable, que creían cargado de secretos lejanos.

Un día aciago, Antón de Chinta tuvo que enfrentarse a la dura realidad: el amo de la casería exigía la renta atrasada o los echaría a la calle. No había alternativa: era forzoso vender a la Cordera.

En la feria de la villa, el padre rechazó varias ofertas de carniceros crueles, pero al fin un tratante sin escrúpulos pagó el precio exigido.

Aquella mañana, el tren correo pasó bufando frente al prado Somonte. En un vagón de mercancías cubierto con tablas iba la Cordera camino del matadero de la gran ciudad.

Rosa y Pinín, con los ojos anegados en lágrimas, corrieron junto a la vía gritando desesperados:
«¡Adiós, Cordera! ¡Adiós, Cordera de nuestra alma!»

Años después, la guerra civil estalló en España. El mismo ferrocarril transportaba ahora a los jóvenes quintos reclutados a la fuerza para morir en los campos de batalla. En uno de los vagones militares iba Pinín, pálido y uniformado. Y Rosa, sola para siempre en el prado verde, gritaba desgarrada al viento viendo alejarse el tren:
«¡Adiós, Pinín! ¡Te llevan como a la Cordera para pasto de la muerte!»`,
  },
  {
    id: "classic-es-burro-flautista",
    language: "es",
    title: "El burro flautista",
    author: "Tomás de Iriarte",
    category: "fable",
    level: "A1-A2",
    summary: "Çayıra bırakılan flüte tesadüfen üfleyip ses çıkaran ve kendini müzisyen sanan eşeğin taşlaması.",
    text: `Esta fabulilla,
salga bien o mal,
me ha ocurrido ahora
por casualidad.

Cerca de unos prados
que hay en mi lugar,
pasaba un borrico
por casualidad.

Una flauta en ellos
halló, que un zagal
se dejó olvidada
por casualidad.

Acercóse a olerla
el dicho animal,
y dio un resoplido
por casualidad.

En la flauta el aire
se hubo de colar,
y sonó la flauta
por casualidad.

«¡Oh!», dijo el borrico,
«¡qué bien sé tocar!
¡Y dirán que es mala
la música asnal!»

Sin reglas del arte,
el que en algo acierta,
acierta por casualidad.`,
  },
  {
    id: "classic-es-raton-corte-campo",
    language: "es",
    title: "El ratón de la corte y el del campo",
    author: "Félix María de Samaniego",
    category: "fable",
    level: "A1-A2",
    summary: "Sarayın bolluk ama tehlike dolu sofrasındansa, kırdaki yuvasında huzurla meşe palamudu yemeyi yeğleyen farenin seçimi.",
    text: `Un ratón cortesano convidó a un pariente suyo, honrado ratón campesino, a pasar unos días en el suntuoso palacio donde él moraba.

Llegado el huésped a la ciudad, admiró los aposentos dorados, las ricas alfombras y la abundancia de manjares. A medianoche, el cortesano lo condujo a una despensa magnífica donde había quesos de Flandes, jamones selectos y dulces exquisitos.

Comenzaban a devorar con delicia los bocados cuando, de improviso, la puerta se abrió de golpe con gran estrépito y entraron varios criados acompañados de dos enormes gatos cazadores.

Los dos ratones echaron a correr enloquecidos, colándose a duras penas por una rendija estrecha donde apenas cabían, con el corazón saltándoles en el pecho por el miedo.

Pasado el peligro, el ratón de la corte dijo a su amigo:
«Volvamos al festín, que los manjares son dignos de un rey.»

El ratón de campo, temblando aún de pies a cabeza, le respondió:
«Quédate con tus festines y tus riquezas palaciegas. Más vale roer una pobre bellota en mi rincón silvestre con sosiego, que comer faisanes con el alma en un hilo.»

La paz del humilde vale más que el banquete del temeroso.`,
  },
  {
    id: "classic-es-asno-cochino",
    language: "es",
    title: "El asno y el cochino",
    author: "Félix María de Samaniego",
    category: "fable",
    level: "A1-A2",
    summary: "Bütün gün yatan domuzun rahatına özenen ama onun akıbetini görünce kendi emeğine şükreden eşek.",
    text: `Envidiando la suerte del cochino,
un asno se quejaba de su destino.
«Yo trabajo», decía, «de sol a sol,
llevo leña y trigo con gran dolor,
me dan paja seca y algún mal palo,
mientras a este cerdo regalan grano.
Pasa todo el día durmiendo al sol,
gordo, limpio y lleno de bendición.»

Así razonaba el burro paciente,
viendo la pereza de su pariente.

Mas vino el otoño y la fiesta de San Martín.
Llegaron de pronto el carnicero y el sayón,
ataron al cerdo con fuerte cordón,
y con un cuchillo bien afilado
le quitaron la vida de un solo tajo.

El asno, al ver la sangre y el festín,
exclamó temblando: «¡Válgame Dios por fin!
Si para tal muerte engorda el cochino,
prefiero mil veces mi pobre destino:
trabajar en paz y comer mi heno,
que morir cebado como este relleno.»

Quien mucho envidia el ocio ajeno, ignora el precio que acarrea.`,
  },
  {
    id: "classic-es-conde-lucanor-traje",
    language: "es",
    title: "El traje nuevo del rey",
    author: "Don Juan Manuel",
    category: "story",
    level: "B1-B2",
    summary: "Yalnızca akıllı ve soylu kişilerin görebildiğini iddia ettikleri görünmez bir kumaş dokuyan üç sahtekarın bir kralı ve sarayı aldatması.",
    text: `Hablaba otra vez el Conde Lucanor con Patronio, su consejero, y le dijo:
—Patronio, un hombre ha venido a proponerme un negocio prodigioso, asegurándome gran ganancia y honra, pero me pide secreto absoluto y me advierte que si desconfío de él, todos me tendrán por necio y de linaje dudoso. Os ruego me aconsejéis qué hacer.

—Señor Conde —dijo Patronio—, para que sepáis cómo actuar, me gustaría contaros lo que sucedió a un rey con tres burladores que fueron a su corte.

Llegaron tres pícaros al palacio de un rey muy vanidoso, diciendo que eran tejedores excelsos y que sabían tejer una tela maravillosa con una virtud mágica: cualquiera que fuese hijo legítimo de su padre podía ver la tela, pero el bastardo o el tonto de remate no la vería de ningún modo.

El rey se entusiasmó pensando que con aquel paño sabría quiénes de su reino eran legítimos e inteligentes. Les dio oro, plata y seda fina, y un gran taller cerrado.

Los tres tunantes pusieron telares y hacían aspavientos como si trabajasen día y noche, aunque no ponían hilo alguno en los peines.

Pasados unos días, el rey envió a su ministro más leal para que viese la tela. El ministro entró, miró los telares vacíos y no vio nada. Pero pensó con pavor: «Si digo que no veo nada, creerán que soy tonto o hijo ilegítimo, y perderé mi honra y mi cargo.» Así que regresó al rey alabando los primorosos colores y la finura del tejido.

El rey envió a otros cortesanos, y todos, por miedo a la vergüenza, dijeron maravillarse ante la hermosura del paño.

Por fin, el rey en persona fue al taller. Al mirar los telares vacíos sintió un frío mortal en el pecho: «¡Yo no veo nada! ¿Acaso no soy hijo legítimo de mi padre el rey?» Para no perder su corona, exclamó que era el tejido más soberbio que jamás contemplara.

Los tejedores fingieron cortar la tela y coser un traje real. En el día de la gran fiesta solemne, el rey se desnudó y los pícaros fingieron vestirlo pieza por pieza.

El rey salió a caballo en procesión ante todo su pueblo. Nadie veía nada, pero todos gritaban: «¡Qué hermoso traje lleva el rey!», temiendo ser tenidos por bastardos.

Hasta que un niño inocente que estaba en hombros de su padre gritó asombrado:
«¡Pero si el rey va desnudo y en camisa!»

Entonces uno se lo susurró a otro, y otro a otro, hasta que todo el pueblo prorrumpió en una carcajada colectiva. Al verse descubierto, el rey comprendió su necedad, pero los tres embusteros ya habían huido con todo el oro y la plata.

Vos, señor Conde, no arriesguéis vuestra honra ni vuestro caudal por lisonjas que apelan al miedo de parecer necio.`,
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
