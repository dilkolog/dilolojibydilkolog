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
])
