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
