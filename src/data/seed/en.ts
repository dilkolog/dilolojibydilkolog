import { define } from './define'

export const en = define('en', [
  {
    lemma: 'decision', pos: 'noun', cefr: 'B1', rank: 420, tr: 'karar',
    ex: [
      ['It was a difficult decision.', 'Zor bir karardı.', 'decision'],
      ['We need to make a decision before Friday.', 'Cumadan önce bir karar vermemiz gerekiyor.', 'decision'],
    ],
    col: [
      ['make a decision', 'karar vermek', ['do a decision', 'give a decision']],
      ['final decision', 'nihai karar'],
    ],
    fam: [['decide', 'verb', 'karar vermek', 'decide → decision (-sion)'], ['decisive', 'adjective', 'kararlı, belirleyici', 'decide → decisive (-sive)']],
  },
  {
    lemma: 'decide', pos: 'verb', cefr: 'A2', rank: 380, tr: 'karar vermek',
    ex: [
      ['She decided to stay at home.', 'Evde kalmaya karar verdi.', 'decided'],
      ["I can't decide which one to buy.", 'Hangisini alacağıma karar veremiyorum.', 'decide'],
    ],
    fam: [['decision', 'noun', 'karar', 'decide → decision (-sion)']],
  },
  {
    lemma: 'improve', pos: 'verb', cefr: 'B1', rank: 650, tr: ['geliştirmek', 'gelişmek', 'iyileştirmek'],
    ex: [
      ['I want to improve my English.', 'İngilizcemi geliştirmek istiyorum.', 'improve'],
      ['The weather improved in the afternoon.', 'Öğleden sonra hava düzeldi.', 'improved'],
    ],
    fam: [['improvement', 'noun', 'gelişme, iyileşme', 'improve + -ment']],
  },
  {
    lemma: 'affect', pos: 'verb', cefr: 'B1', rank: 700, tr: 'etkilemek',
    ex: [
      ['The weather can affect your mood.', 'Hava ruh halini etkileyebilir.', 'affect'],
      ['The new rules will affect everyone.', 'Yeni kurallar herkesi etkileyecek.', 'affect'],
    ],
    rel: [['confusable', 'effect']],
  },
  {
    lemma: 'effect', pos: 'noun', cefr: 'B1', rank: 560, tr: 'etki',
    ex: [
      ['The medicine had no effect.', 'İlacın hiçbir etkisi olmadı.', 'effect'],
      ['Music has a strong effect on me.', 'Müziğin üzerimde güçlü bir etkisi var.', 'effect'],
    ],
    col: [
      ['have an effect on', '-i etkilemek, üzerinde etkisi olmak', ['make an effect on', 'have an effect to']],
      ['side effect', 'yan etki'],
    ],
    rel: [['confusable', 'affect']],
    fam: [['effective', 'adjective', 'etkili', 'effect + -ive']],
  },
  {
    lemma: 'advice', pos: 'noun', cefr: 'A2', rank: 1300, tr: ['tavsiye', 'öğüt'],
    ex: [
      ['Can you give me some advice?', 'Bana biraz tavsiye verebilir misin?', 'advice'],
      ['I followed my doctor’s advice.', 'Doktorumun tavsiyesine uydum.', 'advice'],
    ],
    col: [
      ['give advice', 'tavsiye vermek', ['say advice', 'make advice']],
      ['a piece of advice', 'bir tavsiye', ['an advice']],
    ],
    rel: [['confusable', 'advise']],
  },
  {
    lemma: 'advise', pos: 'verb', cefr: 'B1', rank: 1700, tr: 'tavsiye etmek',
    ex: [['I advise you to leave early.', 'Erken çıkmanı tavsiye ederim.', 'advise']],
    rel: [['confusable', 'advice']],
  },
  {
    lemma: 'depend', pos: 'verb', cefr: 'B1', rank: 900, tr: 'bağlı olmak',
    ex: [
      ['It depends on the weather.', 'Havaya bağlı.', 'depends'],
      ['Children depend on their parents.', 'Çocuklar ebeveynlerine bağımlıdır.', 'depend'],
    ],
    col: [['depend on', '-e bağlı olmak', ['depend of', 'depend from']]],
    fam: [
      ['dependent', 'adjective', 'bağımlı', 'depend + -ent'],
      ['independent', 'adjective', 'bağımsız', 'in- + dependent'],
    ],
  },
  {
    lemma: 'interested', pos: 'adjective', cefr: 'A2', rank: 1100, tr: 'ilgili, meraklı',
    ex: [["I'm very interested in history.", 'Tarihe çok ilgi duyuyorum.', 'interested']],
    col: [['interested in', '-e ilgi duymak', ['interested on', 'interested about']]],
    fam: [['interesting', 'adjective', 'ilginç', 'interest + -ing']],
  },
  {
    lemma: 'achieve', pos: 'verb', cefr: 'B1', rank: 1200, tr: ['başarmak', 'elde etmek'],
    ex: [['She achieved all her goals this year.', 'Bu yıl tüm hedeflerine ulaştı.', 'achieved']],
    col: [['achieve a goal', 'bir hedefe ulaşmak', ['make a goal']]],
    fam: [['achievement', 'noun', 'başarı', 'achieve + -ment']],
  },
  {
    lemma: 'attempt', pos: 'noun', cefr: 'B1', rank: 1250, tr: 'girişim, deneme',
    ex: [['He passed the exam on his first attempt.', 'Sınavı ilk denemesinde geçti.', 'attempt']],
    col: [['make an attempt', 'bir girişimde bulunmak', ['do an attempt']]],
  },
  {
    lemma: 'borrow', pos: 'verb', cefr: 'A2', rank: 2100, tr: 'ödünç almak',
    ex: [['Can I borrow your pen?', 'Kalemini ödünç alabilir miyim?', 'borrow']],
    col: [['borrow something from someone', 'birinden bir şey ödünç almak', ['borrow something to someone']]],
    rel: [['confusable', 'lend'], ['antonym', 'lend']],
  },
  {
    lemma: 'lend', pos: 'verb', cefr: 'A2', rank: 2300, tr: 'ödünç vermek',
    ex: [['Could you lend me some money?', 'Bana biraz para ödünç verebilir misin?', 'lend']],
    rel: [['confusable', 'borrow']],
  },
  {
    lemma: 'remember', pos: 'verb', cefr: 'A1', rank: 350, tr: 'hatırlamak',
    ex: [["I don't remember his name.", 'Adını hatırlamıyorum.', 'remember']],
    rel: [['confusable', 'remind']],
  },
  {
    lemma: 'remind', pos: 'verb', cefr: 'B1', rank: 1500, tr: 'hatırlatmak',
    ex: [
      ['Please remind me to call her.', 'Lütfen onu aramamı bana hatırlat.', 'remind'],
      ['This song reminds me of summer.', 'Bu şarkı bana yazı hatırlatıyor.', 'reminds'],
    ],
    col: [['remind someone of', 'birine ... -i hatırlatmak', ['remind someone from']]],
    rel: [['confusable', 'remember']],
  },
  {
    lemma: 'increase', pos: 'verb', cefr: 'B1', rank: 800, tr: ['artmak', 'artırmak'],
    ex: [['Prices increased by ten percent.', 'Fiyatlar yüzde on arttı.', 'increased']],
    col: [['increase sharply', 'keskin biçimde artmak']],
    rel: [['antonym', 'reduce']],
  },
  {
    lemma: 'reduce', pos: 'verb', cefr: 'B1', rank: 850, tr: 'azaltmak',
    ex: [['We need to reduce our costs.', 'Maliyetlerimizi azaltmamız gerekiyor.', 'reduce']],
    col: [['reduce costs', 'maliyetleri azaltmak']],
    fam: [['reduction', 'noun', 'azalma, indirim', 'reduce → reduction (-tion)']],
  },
  {
    lemma: 'opinion', pos: 'noun', cefr: 'A2', rank: 950, tr: 'fikir, görüş',
    ex: [['In my opinion, the film was too long.', 'Bence film çok uzundu.', 'opinion']],
    col: [['in my opinion', 'bence, bana göre', ['on my opinion', 'for my opinion']]],
  },
  {
    lemma: 'suggest', pos: 'verb', cefr: 'B1', rank: 750, tr: 'önermek',
    ex: [['I suggest taking a taxi.', 'Taksiye binmeyi öneririm.', 'suggest']],
    fam: [['suggestion', 'noun', 'öneri', 'suggest + -ion']],
  },
  {
    lemma: 'avoid', pos: 'verb', cefr: 'B1', rank: 1000, tr: 'kaçınmak',
    ex: [['Try to avoid eating late at night.', 'Gece geç saatte yemek yemekten kaçınmaya çalış.', 'avoid']],
  },
  {
    lemma: 'prevent', pos: 'verb', cefr: 'B1', rank: 1150, tr: 'önlemek, engellemek',
    ex: [['The rain prevented us from going out.', 'Yağmur dışarı çıkmamızı engelledi.', 'prevented']],
    col: [['prevent someone from doing', 'birinin bir şey yapmasını engellemek', ['prevent someone to do']]],
  },
  {
    lemma: 'heavy', pos: 'adjective', cefr: 'A2', rank: 1400, tr: 'ağır',
    ex: [
      ['This bag is too heavy.', 'Bu çanta çok ağır.', 'heavy'],
      ['There was heavy traffic this morning.', 'Bu sabah yoğun trafik vardı.', 'heavy'],
    ],
    col: [
      ['heavy rain', 'şiddetli yağmur', ['strong rain', 'big rain']],
      ['heavy traffic', 'yoğun trafik', ['strong traffic', 'crowded traffic']],
    ],
  },
  {
    lemma: 'progress', pos: 'noun', cefr: 'B1', rank: 1350, tr: 'ilerleme',
    ex: [["You're making good progress.", 'İyi ilerleme kaydediyorsun.', 'progress']],
    col: [['make progress', 'ilerleme kaydetmek', ['do progress', 'take progress']]],
  },
  {
    lemma: 'risk', pos: 'noun', cefr: 'B1', rank: 1050, tr: 'risk',
    ex: [["Sometimes you have to take a risk.", 'Bazen risk almak zorundasın.', 'risk']],
    col: [['take a risk', 'risk almak', ['make a risk', 'do a risk']]],
  },
  {
    lemma: 'attention', pos: 'noun', cefr: 'B1', rank: 1080, tr: 'dikkat',
    ex: [['Please pay attention to the instructions.', 'Lütfen talimatlara dikkat edin.', 'attention']],
    col: [['pay attention to', '-e dikkat etmek', ['make attention to', 'give attention to']]],
  },
  {
    lemma: 'journey', pos: 'noun', cefr: 'A2', rank: 1900, tr: 'yolculuk',
    ex: [['The journey took six hours.', 'Yolculuk altı saat sürdü.', 'journey']],
    col: [['a long journey', 'uzun bir yolculuk']],
  },
  {
    lemma: 'although', pos: 'conjunction', cefr: 'B1', rank: 600, tr: ['-e rağmen', 'gerçi'],
    ex: [['Although it was cold, we went swimming.', 'Hava soğuk olmasına rağmen yüzmeye gittik.', 'Although']],
  },
  {
    lemma: 'rely', pos: 'verb', cefr: 'B2', rank: 1800, tr: 'güvenmek, bel bağlamak',
    ex: [['You can always rely on me.', 'Bana her zaman güvenebilirsin.', 'rely']],
    col: [['rely on', '-e güvenmek', ['rely to', 'rely at']]],
    fam: [['reliable', 'adjective', 'güvenilir', 'rely → reliable (-able)']],
  },
  {
    lemma: 'responsible', pos: 'adjective', cefr: 'B1', rank: 1250, tr: 'sorumlu',
    ex: [["Who is responsible for this project?", 'Bu projeden kim sorumlu?', 'responsible']],
    col: [['responsible for', '-den sorumlu', ['responsible of', 'responsible from']]],
    fam: [['responsibility', 'noun', 'sorumluluk', 'responsible → responsibility (-ity)']],
  },
  {
    lemma: 'explain', pos: 'verb', cefr: 'A2', rank: 700, tr: 'açıklamak',
    ex: [['Can you explain the rules to me?', 'Kuralları bana açıklayabilir misin?', 'explain']],
    col: [['explain something to someone', 'birine bir şeyi açıklamak', ['explain someone something']]],
    fam: [['explanation', 'noun', 'açıklama', 'explain → explanation (-ation)']],
  },
])
