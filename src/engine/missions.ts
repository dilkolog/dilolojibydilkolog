/**
 * Role-play missions (Memrise MemBot style): a real-life situation with concrete goals, played
 * with the AI as the other party. Goals make the learner produce language with a purpose, which
 * is what free chat often lacks; the practice words have to be used along the way.
 */
export interface Mission {
  id: string
  emoji: string
  title: string
  /** Situation and the AI's role, in Turkish (passed to the model). */
  scenario: string
  /** What the learner has to achieve, in Turkish. */
  goals: string[]
}

export const MISSIONS: Mission[] = [
  {
    id: 'rent',
    emoji: '🏠',
    title: 'Kira pazarlığı',
    scenario: 'Bir daireyi kiralamak istiyorsun. Karşındaki ev sahibi; fiyattan kolay inmez ama makul tekliflere açıktır.',
    goals: ['Dairenin özelliklerini (oda, ısınma, aidat) sor', 'Kiranın yüksek olduğunu gerekçeyle söyle', 'Daha düşük bir kira konusunda anlaş', 'Taşınma tarihini kararlaştır'],
  },
  {
    id: 'restaurant',
    emoji: '🍽️',
    title: 'Restoranda sorun',
    scenario: 'Restorandasın; gelen yemek siparişin değil ve soğuk. Karşındaki garson; önce biraz savunmaya geçer.',
    goals: ['Sorunu kibarca ama net anlat', 'Yemeğin değiştirilmesini iste', 'Bir telafi (indirim, tatlı) talep et', 'Hesabı iste'],
  },
  {
    id: 'doctor',
    emoji: '🩺',
    title: 'Doktorda',
    scenario: 'Birkaç gündür hastasın. Karşındaki aile hekimi; ayrıntılı sorular sorar.',
    goals: ['Belirtilerini ve ne zamandır sürdüğünü anlat', 'Kullandığın bir ilacı ya da alerjini söyle', 'İlacı nasıl kullanacağını sor', 'İş için rapor iste'],
  },
  {
    id: 'interview',
    emoji: '💼',
    title: 'İş görüşmesi',
    scenario: 'İstediğin bir iş için görüşmedesin. Karşındaki işe alım yöneticisi; zor sorular da sorar.',
    goals: ['Kendini ve deneyimini kısaca anlat', 'Bir zayıf yönünü olumlu biçimde açıkla', 'Maaş beklentini söyle', 'Şirket hakkında bir soru sor'],
  },
  {
    id: 'luggage',
    emoji: '🧳',
    title: 'Kayıp bavul',
    scenario: 'Uçaktan indin, bavulun gelmedi. Karşındaki havalimanı kayıp eşya görevlisi; prosedüre bağlıdır.',
    goals: ['Bavulunu tarif et', 'İçindeki önemli eşyaları say', 'Ne zaman ve nereye teslim edileceğini öğren', 'Acil ihtiyaçların için masrafların karşılanıp karşılanmayacağını sor'],
  },
  {
    id: 'neighbour',
    emoji: '🔊',
    title: 'Gürültücü komşu',
    scenario: 'Üst kattaki komşu her gece geç saate kadar gürültü yapıyor. Karşındaki o komşu; önce alınır.',
    goals: ['Sorunu suçlamadan anlat', 'Komşunun bakış açısını dinleyip anlayış göster', 'Somut bir uzlaşma öner (saat, halı…)', 'İlişkiyi iyi bir notla bitir'],
  },
  {
    id: 'return',
    emoji: '📦',
    title: 'Ürün iadesi',
    scenario: 'İnternetten aldığın ürün bozuk çıktı, mağazayı arıyorsun. Karşındaki müşteri temsilcisi; önce sadece onarım teklif eder.',
    goals: ['Sipariş bilgisini ve sorunu açıkla', 'Onarım yerine para iadesi iste', 'İade kargosunu kimin ödeyeceğini netleştir', 'Bir referans numarası al'],
  },
  {
    id: 'persuade',
    emoji: '🎬',
    title: 'Arkadaşını ikna et',
    scenario: 'Hafta sonu bir arkadaşınla ne yapacağınızı konuşuyorsun. Karşındaki arkadaşın; aklında başka bir plan var.',
    goals: ['Kendi önerini anlat', 'En az iki sağlam gerekçe ver', 'Arkadaşının itirazına cevap ver', 'Ortak bir plan üzerinde anlaş'],
  },
]

/** 3 stars: every goal and every practice word; 2: every goal; 1: at least half the goals. */
export function missionStars(goalsDone: number, goals: number, wordsUsed: number, words: number): 0 | 1 | 2 | 3 {
  if (goals > 0 && goalsDone >= goals) return wordsUsed >= words ? 3 : 2
  return goalsDone * 2 >= goals && goals > 0 ? 1 : 0
}

export interface MissionResult {
  mission: string
  language: import('./types').TargetLanguage
  /** ISO date. */
  at: string
  stars: 0 | 1 | 2 | 3
}

/** Best stars per mission for a language. */
export function bestStars(results: readonly MissionResult[], language: string): Record<string, number> {
  const best: Record<string, number> = {}
  for (const r of results) if (r.language === language) best[r.mission] = Math.max(best[r.mission] ?? 0, r.stars)
  return best
}
