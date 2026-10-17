import { useMemo, useState } from "react";
import {
  checkGap,
  DIFFICULTY_LABEL,
  gapsFor,
  scoreGaps,
  type Difficulty,
  type GapVerdict,
} from "../../engine/lyrics";
import { youtubeId } from "../../engine/subtitles";
import type { TargetLanguage } from "../../engine/types";
import { accentChange } from "../accentCaret";
import { PlayIcon } from "../icons";
import { saveSentence } from "../saveSentence";
import { showToast } from "../toastFeed";
import { fetchSong, songEmbed, type Song } from "./songFetch";

/** Lines to a page: enough to stay in the song, few enough to check often. */
const PAGE = 8;
const LINK_KEY = "diloloji:song-link";
const LEVELS: Difficulty[] = ["easy", "medium", "hard"];

const rememberedLink = () => {
  try {
    return localStorage.getItem(LINK_KEY) ?? "";
  } catch {
    return "";
  }
};

/**
 * Learning from a song: the captions of a YouTube video, with words taken out of each line to fill in while
 * listening. A line can be played on its own; a page is checked at a time. The video comes from YouTube's
 * own player and the lyrics are only held while the page is open: nothing of them is kept, except the lines
 * the learner got wrong, which can become sentence cards.
 */
export function SongGame({
  language,
  onExit,
}: {
  language: TargetLanguage;
  onExit: () => void;
}) {
  const [link, setLink] = useState(rememberedLink);
  const [level, setLevel] = useState<Difficulty>("easy");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [song, setSong] = useState<Song | null>(null);
  const [page, setPage] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<string, GapVerdict>>({});
  const [src, setSrc] = useState("");
  const [added, setAdded] = useState(0);

  // The lines cut into text and gaps once per song and level.
  const cut = useMemo(
    () => song?.lines.map((l) => gapsFor(l.text, language, level)) ?? [],
    [song, language, level],
  );

  const open = async () => {
    if (!youtubeId(link))
      return setNote(
        "Bir YouTube bağlantısı yapıştır (watch, youtu.be ya da shorts).",
      );
    setBusy(true);
    setNote("");
    const found = await fetchSong(link, language);
    setBusy(false);
    if ("note" in found) return setNote(found.note);
    try {
      localStorage.setItem(LINK_KEY, link.trim());
    } catch {
      // Not remembered; fine.
    }
    setSong(found.song);
    setPage(0);
    setAnswers({});
    setChecked({});
    setAdded(0);
    setSrc(songEmbed(found.song.id));
  };

  const key = (line: number, gap: number) => `${line}:${gap}`;
  const first = page * PAGE;
  const pageLines = song?.lines.slice(first, first + PAGE) ?? [];
  const pages = song ? Math.ceil(song.lines.length / PAGE) : 0;

  const verdictsOf = (from: number, to: number) => {
    const out: GapVerdict[] = [];
    cut.slice(from, to).forEach((parts, i) =>
      parts.forEach((p, g) => {
        if ("gap" in p) out.push(checked[key(from + i, g)] ?? "wrong");
      }),
    );
    return out;
  };

  const check = () => {
    const next = { ...checked };
    cut.slice(first, first + PAGE).forEach((parts, i) =>
      parts.forEach((p, g) => {
        if ("gap" in p)
          next[key(first + i, g)] = checkGap(
            answers[key(first + i, g)] ?? "",
            p.gap,
          );
      }),
    );
    setChecked(next);
  };
  const pageChecked = cut
    .slice(first, first + PAGE)
    .every((parts, i) =>
      parts.every((p, g) => !("gap" in p) || key(first + i, g) in checked),
    );
  const pageScore = scoreGaps(verdictsOf(first, first + PAGE));

  /** The lines with a wrong gap, as sentence cards (source: the video). */
  const keepWrong = async () => {
    if (!song) return;
    let n = 0;
    for (let i = 0; i < song.lines.length; i++) {
      const wrong = cut[i].some(
        (p, g) => "gap" in p && checked[key(i, g)] === "wrong",
      );
      if (
        wrong &&
        (await saveSentence({
          language,
          text: song.lines[i].text,
          source: song.title,
        }).catch(() => false))
      )
        n++;
    }
    setAdded(n);
    showToast(
      n ? `${n} satır cümle kartlarına eklendi.` : "Eklenecek yeni satır yok.",
    );
  };

  const everyChecked = song
    ? cut.every((parts, i) =>
        parts.every((p, g) => !("gap" in p) || key(i, g) in checked),
      )
    : false;
  const total = scoreGaps(song ? verdictsOf(0, song.lines.length) : []);

  return (
    <div className="stack song-game">
      <div className="game-top">
        <button className="link" onClick={onExit}>
          ← Oyunlar
        </button>
        {song && (
          <span className="game-timer">
            {page + 1} / {pages}
          </span>
        )}
        <span className="small muted" />
      </div>

      {!song && (
        <div className="stack">
          <h1 className="greeting">Şarkıyla öğren</h1>
          <p className="muted">
            Altyazılı (CC) bir{" "}
            {language === "en"
              ? "İngilizce"
              : language === "fr"
                ? "Fransızca"
                : "İspanyolca"}{" "}
            şarkının ya da videonun bağlantısını yapıştır; satırlardaki eksik
            kelimeleri dinleyerek yaz. Bir satırı tek başına tekrar tekrar
            çalabilirsin.
          </p>
          <label className="stack">
            <span className="small muted">YouTube bağlantısı</span>
            <input
              className="input"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=…"
              aria-label="YouTube bağlantısı"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
            />
          </label>
          <div className="choice-row" role="group" aria-label="Zorluk">
            {LEVELS.map((l) => (
              <button
                key={l}
                type="button"
                className="chip"
                aria-pressed={level === l}
                onClick={() => setLevel(l)}
              >
                {DIFFICULTY_LABEL[l]}
              </button>
            ))}
          </div>
          {note && (
            <p className="error" role="alert">
              {note}
            </p>
          )}
          <div className="row">
            <button
              className="btn btn-lg"
              onClick={() => void open()}
              disabled={busy || !link.trim()}
            >
              {busy ? "Altyazı getiriliyor…" : "Şarkıyı aç"}
            </button>
          </div>
          <p className="small muted">
            Hesabının onaylı olması gerekir. Sözler kaydedilmez; yalnızca yanlış
            yaptığın satırları sen istersen cümle kartı yaparsın.
          </p>
        </div>
      )}

      {song && (
        <div className="stack">
          <h1 className="greeting song-title">{song.title}</h1>
          {song.auto && (
            <p className="small notice">
              Otomatik altyazı: bazı sözler yanlış yazılmış olabilir.
            </p>
          )}
          <div className="song-player">
            <iframe
              key={src}
              src={src}
              title={song.title}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
          <div className="choice-row" role="group" aria-label="Zorluk">
            {LEVELS.map((l) => (
              <button
                key={l}
                type="button"
                className="chip chip-sm"
                aria-pressed={level === l}
                onClick={() => {
                  setLevel(l);
                  setAnswers({});
                  setChecked({});
                }}
              >
                {l === "easy" ? "Kolay" : l === "medium" ? "Orta" : "Zor"}
              </button>
            ))}
          </div>
          <ol className="song-lines plain stack gap-2" start={first + 1}>
            {pageLines.map((line, i) => {
              const n = first + i;
              return (
                <li key={n} className="song-line">
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setSrc(songEmbed(song.id, line))}
                    aria-label={`${n + 1}. satırı çal`}
                    title="Bu satırı çal"
                  >
                    <PlayIcon size={14} />
                  </button>
                  <span className="song-text" lang={language}>
                    {cut[n].map((p, g) => {
                      const ordinal =
                        cut[n].slice(0, g).filter((q) => "gap" in q).length + 1;
                      return "gap" in p ? (
                        <span key={g} className="song-gap">
                          <input
                            className={`song-input${checked[key(n, g)] ? ` song-${checked[key(n, g)]}` : ""}`}
                            size={Math.max(4, p.gap.length + 1)}
                            value={answers[key(n, g)] ?? ""}
                            disabled={key(n, g) in checked}
                            onChange={accentChange(language, (v) =>
                              setAnswers((a) => ({ ...a, [key(n, g)]: v })),
                            )}
                            aria-label={`${n + 1}. satır, ${ordinal}. boşluk`}
                            lang={language}
                            autoComplete="off"
                            autoCapitalize="off"
                            autoCorrect="off"
                            spellCheck={false}
                          />
                          {checked[key(n, g)] &&
                            checked[key(n, g)] !== "correct" && (
                              <span className="small song-answer">{p.gap}</span>
                            )}
                        </span>
                      ) : (
                        <span key={g}>{p.text}</span>
                      );
                    })}
                  </span>
                </li>
              );
            })}
          </ol>
          <div className="row">
            {!pageChecked ? (
              <button className="btn" onClick={check}>
                Bu sayfayı kontrol et
              </button>
            ) : (
              <>
                <span role="status" className="small">
                  Bu sayfa: {pageScore.right}/{pageScore.total} doğru
                </span>
                {page + 1 < pages && (
                  <button
                    className="btn"
                    onClick={() => setPage(page + 1)}
                    autoFocus
                  >
                    Sonraki sayfa
                  </button>
                )}
              </>
            )}
            {page > 0 && (
              <button
                className="btn btn-quiet"
                onClick={() => setPage(page - 1)}
              >
                Önceki sayfa
              </button>
            )}
          </div>
          {everyChecked && (
            <section className="card stack song-done" role="status">
              <strong>
                Şarkı bitti: %{total.percent} ({total.right}/{total.total})
              </strong>
              <div className="row">
                {total.right < total.total && added === 0 && (
                  <button
                    className="btn btn-sm"
                    onClick={() => void keepWrong()}
                  >
                    Yanlış satırları cümle kartı yap
                  </button>
                )}
                <button
                  className="btn btn-sm btn-quiet"
                  onClick={() => setSong(null)}
                >
                  Başka şarkı
                </button>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
