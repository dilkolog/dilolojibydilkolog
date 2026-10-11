import type { Settings } from '../data/db'
import { shortcutHelp } from '../engine/accents'
import type { TypingShare } from '../engine/session'
import { Chips, Row, Toggle } from './settingsWidgets'

const HINT_DELAYS = [0, 3, 6, 10]

export function AnswerSettings({
  settings,
  onChange,
}: {
  settings: Settings
  onChange: (s: Settings) => void
}) {
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => onChange({ ...settings, [key]: value })

  return (
    <>
      <section className="card stack">
        <h2 className="section-title">Cevaplar ve ipuçları</h2>
        <Row label="Yazma oranı" help="Daha önce gördüğün kelimelerde çoktan seçmeli soruların bir kısmı yazarak cevaplanır. Yazmak, seçmekten daha kalıcı öğretir.">
          <Chips<TypingShare>
            options={['low', 'balanced', 'high']}
            value={settings.typingShare ?? 'balanced'}
            onChange={(v) => set('typingShare', v)}
            format={(v) => ({ low: 'Az', balanced: 'Dengeli', high: 'Çok' })[v]}
          />
        </Row>
        <Row label="İpucu gecikmesi" help="İpuçları ancak bu süre sonra açılır; önce hatırlamaya çalışırsın.">
          <Chips options={HINT_DELAYS} value={settings.hintDelaySec} onChange={(v) => set('hintDelaySec', v)} format={(s) => (s ? `${s} sn` : 'Hemen')} />
        </Row>
        <Toggle
          label="Aksan kısa yolları"
          help={`Yazarken harfin ardından işaret koyunca aksanlı harfe dönüşür. FR: ${shortcutHelp('fr').join(', ')}… ES: ${shortcutHelp('es').slice(0, 4).join(', ')}, n~ → ñ. Cevap kutusunun altındaki harf çubuğu her zaman açık.`}
          checked={settings.accentShortcuts}
          onChange={(v) => set('accentShortcuts', v)}
        />
        <Toggle
          label="Cümlede boşluğu yazarak doldurma soruları"
          help="Bir cümlede eksik kelimeyi Türkçe anlamından hatırlayıp yazdığın sorular (ör. “No juego bien al ajedrez, con un ___ o no.”). Zor gelip öğrenmeyi bozuyorsa kapat; kelime yine seçenekli cümle sorularıyla ve diğer sorularla çalışılır."
          checked={settings.typedBlanks ?? true}
          onChange={(v) => set('typedBlanks', v)}
        />
        <Toggle
          label="Emin değilim seçeneği"
          help="Cevaplamadan önce emin olmadığını işaretleyebilirsin (Shift + cevap). Emin değilken doğru bilinen kelime daha erken tekrar gelir; emin olduğun bir yanlış ise ayrıca vurgulanır ve hatalarda öne alınır."
          checked={settings.confidence}
          onChange={(v) => set('confidence', v)}
        />
        <Toggle
          label="İspanyolcada vosotros'u sorma"
          help="Latin Amerika İspanyolcasında vosotros yerine ustedes kullanılır. Açıkken vosotros biçimleri çekim sorularında çıkmaz ve tablolarda soluk görünür."
          checked={settings.hideVosotros ?? false}
          onChange={(v) => set('hideVosotros', v)}
        />
        <Toggle
          label="Aksanlarda katı ol"
          help="Açıkken 'decision' yerine 'décision' yazmamak yanlış sayılır; kapalıyken 'neredeyse'."
          checked={settings.accentStrict}
          onChange={(v) => set('accentStrict', v)}
        />
      </section>
      <section className="card stack">
        <h2 className="section-title">Yeni kelimeler</h2>
        <Toggle
          label="Yeni kelimede önce tahmin et"
          help="Anlamı göstermeden önce bir tahmin istenir. Yanlış tahmin bile kelimeyi daha iyi akılda tutmanı sağlar; tahmin puanlanmaz."
          checked={settings.pretest}
          onChange={(v) => set('pretest', v)}
        />
        <Toggle
          label="Anlamı hedef dilde göster"
          help="Türkçe anlam yerine kelimenin kendi dilindeki tanımı sorulur (Wiktionary'den; tanımı olan kelimelerde). Çeviri yapmadan o dilde düşünmeye alıştırır; Türkçesi bir dokunuşla görünür."
          checked={settings.targetDefinitions}
          onChange={(v) => set('targetDefinitions', v)}
        />
      </section>
    </>
  )
}
