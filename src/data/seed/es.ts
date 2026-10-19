import { define } from './define'

export const es = define('es', [
  {
    lemma: 'decisión', pos: 'noun', gender: 'f', article: 'la', cefr: 'A2', rank: 700, tr: 'karar',
    ex: [['Fue una decisión difícil.', 'Zor bir karardı.', 'decisión']],
    col: [['tomar una decisión', 'karar vermek', ['hacer una decisión', 'dar una decisión']]],
  },
  {
    lemma: 'año', pos: 'noun', gender: 'm', article: 'el', cefr: 'A1', rank: 80, tr: 'yıl',
    ex: [['Este año viajo mucho.', 'Bu yıl çok seyahat ediyorum.', 'año']],
  },
  {
    lemma: 'problema', pos: 'noun', gender: 'm', article: 'el', cefr: 'A1', rank: 250, tr: 'sorun',
    ex: [['No hay ningún problema.', 'Hiçbir sorun yok.', 'problema']],
  },
  {
    lemma: 'mano', pos: 'noun', gender: 'f', article: 'la', cefr: 'A1', rank: 400, tr: 'el',
    ex: [['Me duele la mano.', 'Elim ağrıyor.', 'mano']],
  },
  {
    lemma: 'ciudad', pos: 'noun', gender: 'f', article: 'la', cefr: 'A1', rank: 300, tr: 'şehir',
    ex: [['Vivo en una ciudad pequeña.', 'Küçük bir şehirde yaşıyorum.', 'ciudad']],
  },
  {
    lemma: 'ser', pos: 'verb', cefr: 'A1', rank: 10, tr: 'olmak (kalıcı)',
    ex: [['Mi hermana es médica.', 'Kız kardeşim doktor.', 'es']],
    rel: [['confusable', 'estar']],
  },
  {
    lemma: 'estar', pos: 'verb', cefr: 'A1', rank: 20, tr: 'olmak (geçici, konum)',
    ex: [['Estoy cansado hoy.', 'Bugün yorgunum.', 'Estoy']],
    rel: [['confusable', 'ser']],
  },
  {
    lemma: 'saber', pos: 'verb', cefr: 'A1', rank: 60, tr: 'bilmek',
    ex: [['No sé dónde está.', 'Nerede olduğunu bilmiyorum.', 'sé']],
    rel: [['confusable', 'conocer']],
  },
  {
    lemma: 'conocer', pos: 'verb', cefr: 'A2', rank: 150, tr: 'tanımak',
    ex: [['¿Conoces a mi hermano?', 'Erkek kardeşimi tanıyor musun?', 'Conoces']],
    rel: [['confusable', 'saber']],
  },
  {
    lemma: 'pedir', pos: 'verb', cefr: 'A2', rank: 350, tr: 'istemek, rica etmek',
    ex: [['Voy a pedir un café.', 'Bir kahve isteyeceğim.', 'pedir']],
    rel: [['confusable', 'preguntar']],
  },
  {
    lemma: 'preguntar', pos: 'verb', cefr: 'A2', rank: 400, tr: 'sormak',
    ex: [['Quiero preguntar algo.', 'Bir şey sormak istiyorum.', 'preguntar']],
    rel: [['confusable', 'pedir']],
  },
  {
    lemma: 'éxito', pos: 'noun', gender: 'm', article: 'el', cefr: 'B1', rank: 1100, tr: 'başarı',
    ex: [['La fiesta fue un éxito.', 'Parti büyük bir başarıydı.', 'éxito']],
    col: [['tener éxito', 'başarılı olmak', ['hacer éxito', 'ser éxito']]],
  },
  {
    lemma: 'miedo', pos: 'noun', gender: 'm', article: 'el', cefr: 'A2', rank: 900, tr: 'korku',
    ex: [['Tengo miedo de los perros.', 'Köpeklerden korkarım.', 'miedo']],
    col: [['tener miedo', 'korkmak', ['estar miedo', 'hacer miedo de']]],
  },
  {
    lemma: 'viaje', pos: 'noun', gender: 'm', article: 'el', cefr: 'A2', rank: 800, tr: ['seyahat', 'yolculuk'],
    ex: [['Hicimos un viaje a México.', 'Meksika’ya bir seyahat yaptık.', 'viaje']],
    col: [['hacer un viaje', 'seyahate çıkmak', ['tomar un viaje']]],
    fam: [['viajar', 'verb', 'seyahat etmek', 'viaje → viajar (-ar)']],
  },
  {
    lemma: 'ventana', pos: 'noun', gender: 'f', article: 'la', cefr: 'A1', rank: 1500, tr: 'pencere',
    ex: [['Abre la ventana, por favor.', 'Pencereyi aç lütfen.', 'ventana']],
  },
  {
    lemma: 'casa', pos: 'noun', gender: 'f', article: 'la', cefr: 'A1', rank: 120, tr: 'ev',
    ex: [['Vamos a casa después del trabajo.', 'İşten sonra eve gidiyoruz.', 'casa']],
    col: [['en casa', 'evde']],
  },
  {
    lemma: 'tiempo', pos: 'noun', gender: 'm', article: 'el', cefr: 'A1', rank: 90, tr: ['zaman', 'hava'],
    ex: [['No tengo mucho tiempo hoy.', 'Bugün fazla zamanım yok.', 'tiempo']],
    col: [['pasar tiempo', 'vakit geçirmek']],
  },
  {
    lemma: 'agua', pos: 'noun', gender: 'f', article: 'el', cefr: 'A1', rank: 320, tr: 'su',
    ex: [['Bebo un vaso de agua por la mañana.', 'Sabahları bir bardak su içerim.', 'agua']],
  },
  {
    lemma: 'libro', pos: 'noun', gender: 'm', article: 'el', cefr: 'A1', rank: 450, tr: 'kitap',
    ex: [['Leo un libro muy interesante.', 'Çok ilginç bir kitap okuyorum.', 'libro']],
  },
  {
    lemma: 'noche', pos: 'noun', gender: 'f', article: 'la', cefr: 'A1', rank: 210, tr: 'gece',
    ex: [['Buenas noches a todos.', 'Herkese iyi geceler.', 'noches']],
    col: [['de noche', 'geceleyin']],
  },
  {
    lemma: 'día', pos: 'noun', gender: 'm', article: 'el', cefr: 'A1', rank: 70, tr: 'gün',
    ex: [['Hoy es un buen día.', 'Bugün güzel bir gün.', 'día']],
    col: [['buenos días', 'günaydın']],
  },
  {
    lemma: 'vida', pos: 'noun', gender: 'f', article: 'la', cefr: 'A1', rank: 110, tr: 'hayat, yaşam',
    ex: [['La vida es bella.', 'Hayat güzeldir.', 'vida']],
  },
  {
    lemma: 'hacer', pos: 'verb', cefr: 'A1', rank: 30, tr: 'yapmak',
    ex: [['¿Qué vas a hacer mañana?', 'Yarın ne yapacaksın?', 'hacer']],
    col: [['hacer una pregunta', 'soru sormak']],
  },
  {
    lemma: 'tener', pos: 'verb', cefr: 'A1', rank: 25, tr: 'sahip olmak',
    ex: [['Tengo dos hermanos y una hermana.', 'İki erkek kardeşim ve bir kız kardeşim var.', 'Tengo']],
  },
  {
    lemma: 'hablar', pos: 'verb', cefr: 'A1', rank: 140, tr: 'konuşmak',
    ex: [['Ella habla tres idiomas con fluidez.', 'O akıcı bir şekilde üç dil konuşuyor.', 'habla']],
  },
  {
    lemma: 'escuchar', pos: 'verb', cefr: 'A1', rank: 480, tr: 'dinlemek',
    ex: [['Me gusta escuchar música clásica.', 'Klasik müzik dinlemeyi severim.', 'escuchar']],
    col: [['escuchar música', 'müzik dinlemek']],
  },
  {
    lemma: 'aprender', pos: 'verb', cefr: 'A1', rank: 650, tr: 'öğrenmek',
    ex: [['Queremos aprender español juntos.', 'Birlikte İspanyolca öğrenmek istiyoruz.', 'aprender']],
  },
  {
    lemma: 'amigo', pos: 'noun', gender: 'm', article: 'el', cefr: 'A1', rank: 280, tr: 'arkadaş',
    ex: [['Carlos es un buen amigo mío.', 'Carlos benim iyi bir arkadaşımdır.', 'amigo']],
  },
  {
    lemma: 'trabajo', pos: 'noun', gender: 'm', article: 'el', cefr: 'A1', rank: 260, tr: 'iş, çalışma',
    ex: [['Tengo mucho trabajo esta semana.', 'Bu hafta çok işim var.', 'trabajo']],
    fam: [['trabajar', 'verb', 'çalışmak', 'trabajo → trabajar (-ar)']],
  },
  {
    lemma: 'trabajar', pos: 'verb', cefr: 'A1', rank: 310, tr: 'çalışmak',
    ex: [['Ella trabaja en un hospital moderno.', 'O modern bir hastanede çalışıyor.', 'trabaja']],
    fam: [['trabajo', 'noun', 'iş', 'trabajar → trabajo']],
  },
])
