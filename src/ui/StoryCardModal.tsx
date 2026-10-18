import { useEffect, useRef, useState } from 'react'
import type { ProgressReport } from './progressReport'
import { LANGUAGE_NAME } from './labels'
import { CloseIcon, DownloadIcon, SendIcon } from './icons'
import { showToast } from './toastFeed'

const LANG_CONFIG = {
  fr: {
    title: 'Fransızca',
    flag: '🇫🇷',
    gradTop: '#4a0e2e',
    gradBottom: '#1e0814',
    accent: '#f43f5e',
    accentSoft: 'rgba(244, 63, 94, 0.15)',
    accentText: '#fda4af',
  },
  es: {
    title: 'İspanyolca',
    flag: '🇪🇸',
    gradTop: '#5a2200',
    gradBottom: '#220a00',
    accent: '#f59e0b',
    accentSoft: 'rgba(245, 158, 11, 0.15)',
    accentText: '#fde68a',
  },
  en: {
    title: 'İngilizce',
    flag: '🇬🇧',
    gradTop: '#0e265c',
    gradBottom: '#040d24',
    accent: '#38bdf8',
    accentSoft: 'rgba(56, 189, 248, 0.15)',
    accentText: '#bae6fd',
  },
} as const

function drawStoryCanvas(canvas: HTMLCanvasElement, report: ProgressReport, streak: number, activeWords: number) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const W = 1080
  const H = 1920
  canvas.width = W
  canvas.height = H

  const conf = LANG_CONFIG[report.language] ?? LANG_CONFIG.en

  // 1. Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, W, H)
  bgGrad.addColorStop(0, conf.gradTop)
  bgGrad.addColorStop(0.5, '#0b0f19')
  bgGrad.addColorStop(1, conf.gradBottom)
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, W, H)

  // Decorative ambient circles
  ctx.save()
  const ambientGrad = ctx.createRadialGradient(W * 0.8, H * 0.15, 50, W * 0.8, H * 0.15, 600)
  ambientGrad.addColorStop(0, conf.accentSoft)
  ambientGrad.addColorStop(1, 'transparent')
  ctx.fillStyle = ambientGrad
  ctx.beginPath()
  ctx.arc(W * 0.8, H * 0.15, 600, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // 2. Main card container
  const padX = 72
  const cardY = 160
  const cardW = W - padX * 2
  const cardH = H - 340
  const radius = 48

  ctx.save()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(padX, cardY, cardW, cardH, radius)
  ctx.fill()
  ctx.stroke()
  ctx.restore()

  // 3. Header inside card
  ctx.textAlign = 'left'
  // Kicker
  ctx.fillStyle = conf.accentText
  ctx.font = '700 32px system-ui, -apple-system, sans-serif'
  ctx.fillText(`${conf.flag} ${conf.title.toUpperCase()} · BAŞARI KARNESİ`, padX + 56, cardY + 90)

  // Learner name
  ctx.fillStyle = '#ffffff'
  ctx.font = '800 64px system-ui, -apple-system, sans-serif'
  const displayName = report.name ? report.name : 'Diloloji Öğrencisi'
  ctx.fillText(displayName, padX + 56, cardY + 180)

  // Date
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
  ctx.font = '500 28px system-ui, -apple-system, sans-serif'
  ctx.fillText(report.date, padX + 56, cardY + 230)

  // Divider
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(padX + 56, cardY + 275)
  ctx.lineTo(padX + cardW - 56, cardY + 275)
  ctx.stroke()

  // 4. Hero stats section (Streak & Active vocabulary)
  const heroY = cardY + 340
  const halfW = (cardW - 112 - 36) / 2

  // Left hero box (Streak)
  drawStatBox(ctx, padX + 56, heroY, halfW, 260, 'GÜNLÜK SERİ', streak > 0 ? `🔥 ${streak}` : '🔥 1', 'Gün kesintisiz çalışma')

  // Right hero box (Active words)
  drawStatBox(ctx, padX + 56 + halfW + 36, heroY, halfW, 260, 'AKTİF KELİME', `${activeWords}`, 'Cümlede üretebildiğin')

  // 5. Grid of detailed metrics
  const gridY = heroY + 300
  const gridH = 190

  // 30 days total answers
  const totalAnswers = report.days.reduce((s, d) => s + d.answers, 0)
  const totalCorrect = report.days.reduce((s, d) => s + d.correct, 0)
  const accuracy = totalAnswers ? Math.round((totalCorrect / totalAnswers) * 100) : 0
  const totalXp = report.days.reduce((s, d) => s + d.xp, 0)

  drawMiniStat(ctx, padX + 56, gridY, halfW, gridH, 'DOĞRULUK', `%${accuracy}`, 'Son 30 günlük ortalama')
  drawMiniStat(ctx, padX + 56 + halfW + 36, gridY, halfW, gridH, 'TOPLAM CEVAP', `${totalAnswers}`, 'Aralıklı tekrar pratiği')

  const gridY2 = gridY + 226
  drawMiniStat(ctx, padX + 56, gridY2, halfW, gridH, 'TOPLAM PUAN', `${totalXp} XP`, 'Kazanılan tecrübe')

  // Top skill
  const bestSkill = report.skills.filter(([, v]) => v !== null).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]
  const skillLabel = bestSkill ? `${bestSkill[0]} (%${bestSkill[1]})` : 'Gelişiyor'
  drawMiniStat(ctx, padX + 56 + halfW + 36, gridY2, halfW, gridH, 'EN GÜÇLÜ ALAN', skillLabel, 'Kavrama ve refleks')

  // 6. Monki motivational banner
  const bannerY = gridY2 + 236
  const bannerW = cardW - 112
  const bannerH = 150

  ctx.save()
  ctx.fillStyle = conf.accentSoft
  ctx.strokeStyle = conf.accent
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.roundRect(padX + 56, bannerY, bannerW, bannerH, 24)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#ffffff'
  ctx.font = '700 34px system-ui, -apple-system, sans-serif'
  ctx.fillText('🌱 Küçük adımlar büyük diller yaratır.', padX + 90, bannerY + 68)

  ctx.fillStyle = conf.accentText
  ctx.font = '500 26px system-ui, -apple-system, sans-serif'
  ctx.fillText('Her gün birkaç dakika aralıklı tekrar, kalıcı akıcılık sağlar.', padX + 90, bannerY + 112)
  ctx.restore()

  // 7. Footer branding
  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  ctx.font = '800 40px system-ui, -apple-system, sans-serif'
  ctx.fillText('DİLOLOJİ', W / 2, H - 110)

  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
  ctx.font = '500 24px system-ui, -apple-system, sans-serif'
  ctx.fillText('Öğrenmeyi kolaylaştıran kişisel dil koçun · diloloji.online', W / 2, H - 70)
}

function drawStatBox(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, label: string, val: string, sub: string) {
  ctx.save()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)'
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, 28)
  ctx.fill()
  ctx.stroke()

  ctx.textAlign = 'left'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'
  ctx.font = '700 24px system-ui, -apple-system, sans-serif'
  ctx.fillText(label, x + 36, y + 54)

  ctx.fillStyle = '#ffffff'
  ctx.font = '800 68px system-ui, -apple-system, sans-serif'
  ctx.fillText(val, x + 36, y + 144)

  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
  ctx.font = '500 22px system-ui, -apple-system, sans-serif'
  ctx.fillText(sub, x + 36, y + 204)
  ctx.restore()
}

function drawMiniStat(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, label: string, val: string, sub: string) {
  ctx.save()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)'
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, 24)
  ctx.fill()
  ctx.stroke()

  ctx.textAlign = 'left'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'
  ctx.font = '700 22px system-ui, -apple-system, sans-serif'
  ctx.fillText(label, x + 32, y + 46)

  ctx.fillStyle = '#ffffff'
  ctx.font = '800 46px system-ui, -apple-system, sans-serif'
  ctx.fillText(val, x + 32, y + 112)

  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'
  ctx.font = '500 20px system-ui, -apple-system, sans-serif'
  ctx.fillText(sub, x + 32, y + 154)
  ctx.restore()
}

/**
 * 9:16 Instagram / WhatsApp story format visual achievement card modal.
 */
export function StoryCardModal({
  report,
  streak,
  activeWords,
  onClose,
}: {
  report: ProgressReport
  streak: number
  activeWords: number
  onClose: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dataUrl, setDataUrl] = useState<string>('')

  useEffect(() => {
    if (!canvasRef.current) return
    drawStoryCanvas(canvasRef.current, report, streak, activeWords)
    try {
      setDataUrl(canvasRef.current.toDataURL('image/png'))
    } catch {
      // Ignore security errors in testing environment
    }
  }, [report, streak, activeWords])

  const downloadImage = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      const link = document.createElement('a')
      link.download = `diloloji-karne-${report.language}-${report.date}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      showToast('Hikaye kartı görseli indirildi!')
    } catch {
      showToast('Görsel oluşturulamadı.')
    }
  }

  const shareNative = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return downloadImage()
        const file = new File([blob], `diloloji-karne-${report.language}.png`, { type: 'image/png' })

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `${LANGUAGE_NAME[report.language]} Başarı Karnem`,
              text: `${LANGUAGE_NAME[report.language]} dilinde ${activeWords} aktif kelime ve ${streak} günlük seriye ulaştım! #Diloloji`,
            })
            return
          } catch {
            // User cancelled or unsupported
          }
        }
        // Fallback to downloading
        downloadImage()
        showToast('Görsel indirildi; Instagram veya WhatsApp hikayenizde paylaşabilirsiniz!')
      }, 'image/png')
    } catch {
      downloadImage()
    }
  }

  return (
    <div className="dialog-backdrop story-card-backdrop" role="dialog" aria-modal="true" aria-label="Başarı Karnesi">
      <div className="dialog story-card-dialog">
        <header className="story-card-dialog-head">
          <div className="story-card-head-title">
            <strong>Hikaye Kartı (9:16)</strong>
            <span className="small muted">Instagram veya WhatsApp hikayesi için öğrenci karnesi</span>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Kapat">
            <CloseIcon size={20} />
          </button>
        </header>

        <div className="story-card-preview-wrap">
          {/* Hidden high-res canvas used for generating 1080x1920 export */}
          <canvas ref={canvasRef} className="story-card-canvas" style={{ display: 'none' }} />

          {dataUrl ? (
            <img src={dataUrl} alt="Başarı karnesi önizlemesi" className="story-card-img-preview" />
          ) : (
            <div className="story-card-loading small muted">Kart hazırlanıyor…</div>
          )}
        </div>

        <footer className="story-card-actions">
          <button type="button" className="btn btn-primary" onClick={shareNative}>
            <SendIcon size={16} className="inline-icon" /> Hikayede Paylaş
          </button>
          <button type="button" className="btn btn-quiet" onClick={downloadImage}>
            <DownloadIcon size={16} className="inline-icon" /> Görseli İndir (PNG)
          </button>
        </footer>
      </div>
    </div>
  )
}
