import { define } from './define'

export const fr = define('fr', [
  {
    lemma: 'décision', pos: 'noun', gender: 'f', article: 'la', cefr: 'A2', rank: 600, tr: 'karar',
    ex: [
      ["C'est une décision difficile.", 'Bu zor bir karar.', 'décision'],
      ['Il faut prendre une décision ce soir.', 'Bu akşam bir karar vermek gerekiyor.', 'décision'],
    ],
    col: [['prendre une décision', 'karar vermek', ['faire une décision', 'donner une décision']]],
    fam: [['décider', 'verb', 'karar vermek', 'décid- + -er']],
  },
  {
    lemma: 'décider', pos: 'verb', cefr: 'A2', rank: 500, tr: 'karar vermek',
    ex: [["Elle a décidé de partir.", 'Gitmeye karar verdi.', 'décidé']],
    col: [['décider de faire', 'yapmaya karar vermek', ['décider à faire']]],
  },
  {
    lemma: 'arbre', pos: 'noun', gender: 'm', article: "l'", cefr: 'A1', rank: 1500, tr: 'ağaç',
    ex: [["L'arbre devant la maison est très vieux.", 'Evin önündeki ağaç çok yaşlı.', 'arbre']],
  },
  {
    lemma: 'voiture', pos: 'noun', gender: 'f', article: 'la', cefr: 'A1', rank: 700, tr: 'araba',
    ex: [['Ma voiture est en panne.', 'Arabam bozuldu.', 'voiture']],
  },
  {
    lemma: 'travail', pos: 'noun', gender: 'm', article: 'le', cefr: 'A1', rank: 300, tr: 'iş',
    ex: [["Je vais au travail à pied.", 'İşe yürüyerek gidiyorum.', 'travail']],
    fam: [['travailler', 'verb', 'çalışmak', 'travail + -er']],
  },
  {
    lemma: 'travailler', pos: 'verb', cefr: 'A1', rank: 350, tr: 'çalışmak',
    ex: [['Je travaille dans une banque.', 'Bir bankada çalışıyorum.', 'travaille']],
  },
  {
    lemma: 'maison', pos: 'noun', gender: 'f', article: 'la', cefr: 'A1', rank: 400, tr: 'ev',
    ex: [['Nous sommes restés à la maison.', 'Evde kaldık.', 'maison']],
  },
  {
    lemma: 'problème', pos: 'noun', gender: 'm', article: 'le', cefr: 'A2', rank: 350, tr: 'sorun',
    ex: [["Il n'y a pas de problème.", 'Sorun yok.', 'problème']],
    col: [['résoudre un problème', 'bir sorunu çözmek']],
  },
  {
    lemma: 'plage', pos: 'noun', gender: 'f', article: 'la', cefr: 'A1', rank: 2500, tr: 'plaj, kumsal',
    ex: [["On va à la plage cet après-midi.", 'Bu öğleden sonra plaja gidiyoruz.', 'plage']],
  },
  {
    lemma: 'eau', pos: 'noun', gender: 'f', article: "l'", cefr: 'A1', rank: 600, tr: 'su',
    ex: [["Je voudrais un verre d'eau.", 'Bir bardak su istiyorum.', 'eau']],
  },
  {
    lemma: 'jour', pos: 'noun', gender: 'm', article: 'le', cefr: 'A1', rank: 100, tr: 'gün',
    ex: [['Il y a sept jours dans une semaine.', 'Bir haftada yedi gün vardır.', 'jours']],
    rel: [['confusable', 'journée']],
  },
  {
    lemma: 'journée', pos: 'noun', gender: 'f', article: 'la', cefr: 'A2', rank: 800, tr: 'gün (gün boyu)',
    ex: [['Bonne journée !', 'İyi günler!', 'journée'], ["J'ai passé la journée à lire.", 'Günü kitap okuyarak geçirdim.', 'journée']],
    rel: [['confusable', 'jour']],
  },
  {
    lemma: 'an', pos: 'noun', gender: 'm', article: "l'", cefr: 'A1', rank: 120, tr: 'yıl',
    ex: [["J'ai trente ans.", 'Otuz yaşındayım.', 'ans']],
    rel: [['confusable', 'année']],
  },
  {
    lemma: 'année', pos: 'noun', gender: 'f', article: "l'", cefr: 'A1', rank: 250, tr: 'yıl (yıl boyu)',
    ex: [["Bonne année !", 'Mutlu yıllar!', 'année'], ["Cette année, je vais apprendre l'espagnol.", 'Bu yıl İspanyolca öğreneceğim.', 'année']],
    rel: [['confusable', 'an']],
  },
  {
    lemma: 'savoir', pos: 'verb', cefr: 'A1', rank: 80, tr: 'bilmek',
    ex: [["Je ne sais pas où il habite.", 'Nerede oturduğunu bilmiyorum.', 'sais']],
    rel: [['confusable', 'connaître']],
  },
  {
    lemma: 'connaître', pos: 'verb', cefr: 'A2', rank: 200, tr: 'tanımak',
    ex: [['Tu connais ma sœur ?', 'Kız kardeşimi tanıyor musun?', 'connais']],
    rel: [['confusable', 'savoir']],
  },
  {
    lemma: 'attendre', pos: 'verb', cefr: 'A2', rank: 300, tr: 'beklemek',
    ex: [["J'attends le bus depuis vingt minutes.", 'Yirmi dakikadır otobüsü bekliyorum.', 'attends']],
    col: [['attendre quelqu’un', 'birini beklemek', ['attendre pour quelqu’un']]],
  },
  {
    lemma: 'essayer', pos: 'verb', cefr: 'A2', rank: 450, tr: 'denemek',
    ex: [["J'essaie de comprendre.", 'Anlamaya çalışıyorum.', 'essaie']],
    col: [['essayer de faire', 'yapmaya çalışmak', ['essayer à faire', 'essayer faire']]],
  },
  {
    lemma: 'réussir', pos: 'verb', cefr: 'A2', rank: 700, tr: 'başarmak',
    ex: [["Elle a réussi son examen.", 'Sınavını geçti.', 'réussi']],
    col: [['réussir un examen', 'bir sınavı geçmek', ['passer avec succès à un examen']]],
    fam: [['réussite', 'noun', 'başarı', 'réuss- + -ite']],
  },
  {
    lemma: 'souvenir', pos: 'verb', cefr: 'B1', rank: 900, tr: 'hatırlamak (se souvenir)',
    ex: [['Je me souviens de ce jour.', 'O günü hatırlıyorum.', 'souviens']],
    col: [['se souvenir de', '-i hatırlamak', ['se souvenir', 'souvenir de']]],
  },
  {
    lemma: 'fleur', pos: 'noun', gender: 'f', article: 'la', cefr: 'A1', rank: 1800, tr: 'çiçek',
    ex: [["Il m'a offert des fleurs.", 'Bana çiçek hediye etti.', 'fleurs']],
  },
  {
    lemma: 'lait', pos: 'noun', gender: 'm', article: 'le', cefr: 'A1', rank: 2200, tr: 'süt',
    ex: [['Je bois du lait le matin.', 'Sabahları süt içerim.', 'lait']],
  },
  {
    lemma: 'voyage', pos: 'noun', gender: 'm', article: 'le', cefr: 'A2', rank: 900, tr: ['seyahat', 'yolculuk'],
    ex: [['Nous avons fait un voyage en Italie.', 'İtalya’ya bir seyahat yaptık.', 'voyage']],
    col: [['faire un voyage', 'seyahate çıkmak', ['prendre un voyage']]],
    fam: [['voyager', 'verb', 'seyahat etmek', 'voyage + -r']],
  },
  {
    lemma: 'rêve', pos: 'noun', gender: 'm', article: 'le', cefr: 'A2', rank: 1300, tr: 'rüya, hayal',
    ex: [["J'ai fait un rêve étrange.", 'Garip bir rüya gördüm.', 'rêve']],
    col: [['faire un rêve', 'rüya görmek', ['voir un rêve']]],
    fam: [['rêver', 'verb', 'rüya görmek, hayal etmek', 'rêve + -r']],
  },
  {
    lemma: 'peur', pos: 'noun', gender: 'f', article: 'la', cefr: 'A2', rank: 600, tr: 'korku',
    ex: [["J'ai peur des chiens.", 'Köpeklerden korkarım.', 'peur']],
    col: [['avoir peur de', '-den korkmak', ['être peur de', 'faire peur de']]],
  },
  {
    lemma: 'besoin', pos: 'noun', gender: 'm', article: 'le', cefr: 'A2', rank: 400, tr: 'ihtiyaç',
    ex: [["J'ai besoin d'aide.", 'Yardıma ihtiyacım var.', 'besoin']],
    col: [['avoir besoin de', '-e ihtiyacı olmak', ['être besoin de', 'avoir besoin pour']]],
  },
  {
    lemma: 'lourd', pos: 'adjective', cefr: 'A2', rank: 1600, tr: 'ağır',
    ex: [['Ce sac est trop lourd.', 'Bu çanta çok ağır.', 'lourd']],
    rel: [['antonym', 'léger']],
  },
  {
    lemma: 'léger', pos: 'adjective', cefr: 'A2', rank: 1400, tr: 'hafif',
    ex: [['Je prends un repas léger le soir.', 'Akşamları hafif bir yemek yerim.', 'léger']],
  },
  {
    lemma: 'libre', pos: 'adjective', cefr: 'A2', rank: 650, tr: 'boş, serbest, özgür',
    ex: [['Tu es libre ce soir ?', 'Bu akşam boş musun?', 'libre']],
    fam: [['liberté', 'noun', 'özgürlük', 'libre → liberté (-té)']],
  },
])
