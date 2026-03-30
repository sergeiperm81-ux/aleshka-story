import React, { useEffect, useMemo, useRef, useState } from 'react';
import { story } from './storyData.js';

const STORAGE_KEY = 'aleshka-prototype-progress';

const defaultProgress = {
  chapterId: story.chapters[0].id,
  screenIndex: 0,
  mealChoice: null,
  collectedBooks: [],
  soundOn: true,
};

function loadProgress() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? { ...defaultProgress, ...JSON.parse(saved) } : defaultProgress;
  } catch {
    return defaultProgress;
  }
}

function App() {
  const chapter = story.chapters[0];
  const [progress, setProgress] = useState(loadProgress);
  const [view, setView] = useState('library');
  const [scenePulse, setScenePulse] = useState(0);
  const [pageTurnDirection, setPageTurnDirection] = useState('forward');
  const audioContextRef = useRef(null);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  useEffect(() => {
    setScenePulse((value) => value + 1);
  }, [progress.screenIndex, view, pageTurnDirection]);

  const activeScreen = chapter.screens[progress.screenIndex];

  const mealBranch = useMemo(() => {
    if (!progress.mealChoice || activeScreen.type !== 'ending') {
      return null;
    }

    return activeScreen.branches[progress.mealChoice];
  }, [activeScreen, progress.mealChoice]);

  function playSound(kind = 'click') {
    if (!progress.soundOn) {
      return;
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      return;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioCtx();
    }

    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    const config =
      kind === 'page'
        ? { from: 540, to: 360, volume: 0.03, duration: 0.14 }
        : kind === 'success'
          ? { from: 660, to: 990, volume: 0.05, duration: 0.18 }
          : { from: 420, to: 520, volume: 0.025, duration: 0.08 };

    oscillator.type = kind === 'success' ? 'triangle' : 'sine';
    oscillator.frequency.setValueAtTime(config.from, now);
    oscillator.frequency.exponentialRampToValueAtTime(config.to, now + config.duration);
    gain.gain.setValueAtTime(config.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + config.duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + config.duration);
  }

  function updateProgress(patch) {
    setProgress((current) => ({ ...current, ...patch }));
  }

  function goToLibrary() {
    playSound('click');
    setView('library');
  }

  function startChapter() {
    playSound('page');
    setPageTurnDirection('forward');
    setView('reader');
    updateProgress({ screenIndex: 0, mealChoice: null, collectedBooks: [] });
  }

  function resumeChapter() {
    playSound('page');
    setPageTurnDirection('forward');
    setView('reader');
  }

  function goNext() {
    if (progress.screenIndex >= chapter.screens.length - 1) {
      return;
    }

    playSound('page');
    setPageTurnDirection('forward');
    updateProgress({ screenIndex: progress.screenIndex + 1 });
  }

  function goBack() {
    if (progress.screenIndex <= 0) {
      setView('library');
      return;
    }

    playSound('page');
    setPageTurnDirection('back');
    updateProgress({ screenIndex: progress.screenIndex - 1 });
  }

  function restartChapter() {
    playSound('click');
    setPageTurnDirection('back');
    updateProgress({
      screenIndex: 0,
      mealChoice: null,
      collectedBooks: [],
    });
    setView('reader');
  }

  function toggleSound() {
    playSound('click');
    updateProgress({ soundOn: !progress.soundOn });
  }

  function chooseMeal(id) {
    playSound('success');
    updateProgress({ mealChoice: id });
  }

  function toggleBook(book) {
    const alreadySelected = progress.collectedBooks.includes(book.id);
    if (alreadySelected) {
      playSound('click');
      updateProgress({
        collectedBooks: progress.collectedBooks.filter((entry) => entry !== book.id),
      });
      return;
    }

    if (!book.isMagic) {
      playSound('click');
      return;
    }

    playSound('success');
    updateProgress({
      collectedBooks: [...progress.collectedBooks, book.id],
    });
  }

  function jumpToScreen(index) {
    playSound('click');
    setPageTurnDirection(index > progress.screenIndex ? 'forward' : 'back');
    updateProgress({ screenIndex: index });
  }

  const miniGameComplete =
    activeScreen.type === 'miniGame' &&
    progress.collectedBooks.filter((bookId) =>
      activeScreen.books.some((book) => book.id === bookId && book.isMagic),
    ).length >= activeScreen.targetCount;

  const choiceMade = activeScreen.type === 'choice' && Boolean(progress.mealChoice);
  const nextDisabled =
    (activeScreen.type === 'miniGame' && !miniGameComplete) ||
    (activeScreen.type === 'choice' && !choiceMade);

  const storyComplete =
    progress.screenIndex >= chapter.screens.length - 1 && Boolean(progress.mealChoice);
  const sceneProgress = ((progress.screenIndex + 1) / chapter.screens.length) * 100;

  return (
    <div className="app-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />
      <div className="ambient ambient-top" />

      <header className="topbar">
        <button className="ghost-button" onClick={goToLibrary}>
          Рљ РєРЅРёРіР°Рј
        </button>
        <div className="topbar-title">
          <span className="eyebrow">РџСЂРѕС‚РѕС‚РёРї MVP</span>
          <strong>{story.title}</strong>
        </div>
        <button className="ghost-button" onClick={toggleSound}>
          {progress.soundOn ? 'Р—РІСѓРє: РІРєР»' : 'Р—РІСѓРє: РІС‹РєР»'}
        </button>
      </header>

      {view === 'library' ? (
        <main className="library-layout">
          <section className="hero-panel">
            <div className="hero-copy">
              <span className="eyebrow">РњСѓР»СЊС‚СЏС€РЅС‹Р№ РєРІРµСЃС‚ РґР»СЏ РґРµС‚РµР№ {story.age}</span>
              <h1>{story.title}</h1>
              <p>{story.description}</p>
              <div className="hero-facts">
                <span>Р›РёСЃС‚Р°РЅРёРµ РїРѕ СЌРєСЂР°РЅР°Рј</span>
                <span>Р’С‹Р±РѕСЂС‹ РІР»РёСЏСЋС‚ РЅР° РїСѓС‚СЊ</span>
                <span>РџРѕРґС…РѕРґРёС‚ РґР»СЏ Р±СѓРґСѓС‰РёС… СЃРµСЂРёР№</span>
              </div>
              <div className="cta-row">
                <button className="primary-button" onClick={resumeChapter}>
                  РџСЂРѕРґРѕР»Р¶РёС‚СЊ
                </button>
                <button className="secondary-button" onClick={startChapter}>
                  РќР°С‡Р°С‚СЊ Р·Р°РЅРѕРІРѕ
                </button>
              </div>
            </div>
            <IllustrationCard
              label="РћР±Р»РѕР¶РєР° РёСЃС‚РѕСЂРёРё"
              description="Р—РґРµСЃСЊ РїРѕР·Р¶Рµ РїРѕСЏРІРёС‚СЃСЏ РіР»Р°РІРЅР°СЏ РёР»Р»СЋСЃС‚СЂР°С†РёСЏ СЃРєР°Р·РєРё СЃ РђР»РµС€РєРѕР№, Р’РѕР»С€РµР±РЅРёРєРѕРј Рё Р’РѕР»С€РµР±РЅРѕР№ РєРЅРёРіРѕР№."
              accent="cover"
            />
          </section>

          <section className="chapter-grid">
            <article className="chapter-card featured">
              <div className="chapter-card-head">
                <div className="chapter-badge">Р”РѕСЃС‚СѓРїРЅР° СЃРµР№С‡Р°СЃ</div>
                <div className="chapter-status">
                  {storyComplete ? 'Р“Р»Р°РІР° РїСЂРѕР№РґРµРЅР°' : 'РџСЂРѕС‚РѕС‚РёРї РІ СЂР°Р±РѕС‚Рµ'}
                </div>
              </div>
              <h2>{chapter.title}</h2>
              <p>
                Р’СЃС‚СѓРїР»РµРЅРёРµ, Р·РЅР°РєРѕРјСЃС‚РІРѕ СЃ Р’РѕР»С€РµР±РЅРёРєРѕРј, РєР°С‚СЃС†РµРЅР°, РјРёРЅРё-РёРіСЂР° РЅР° СЃР±РѕСЂ
                РІРѕР»С€РµР±СЃС‚РІР° Рё РїРµСЂРІР°СЏ РІР°Р¶РЅР°СЏ СЂР°Р·РІРёР»РєР°.
              </p>
              <div className="chapter-meta">
                <span>{chapter.screens.length} СЌРєСЂР°РЅРѕРІ</span>
                <span>1 РјРёРЅРё-РёРіСЂР°</span>
                <span>1 СЂР°Р·РІРёР»РєР°</span>
              </div>
              <div className="chapter-progress">
                <div className="chapter-progress-bar" style={{ width: `${sceneProgress}%` }} />
              </div>
              <div className="chapter-actions">
                <button className="primary-button" onClick={resumeChapter}>
                  РћС‚РєСЂС‹С‚СЊ РіР»Р°РІСѓ
                </button>
                <button className="secondary-button" onClick={restartChapter}>
                  РЎР±СЂРѕСЃРёС‚СЊ РїСЂРѕРіСЂРµСЃСЃ
                </button>
              </div>
            </article>

            <article className="chapter-card muted">
              <div className="chapter-card-head">
                <div className="chapter-badge soft">РџРѕР·Р¶Рµ</div>
                <div className="chapter-status soft">РЎР»РµРґСѓСЋС‰РёРµ РёСЃС‚РѕСЂРёРё</div>
              </div>
              <h2>Р‘СѓРґСѓС‰РёРµ РіР»Р°РІС‹</h2>
              <p>
                Р—РґРµСЃСЊ РїРѕР·Р¶Рµ РїРѕСЏРІСЏС‚СЃСЏ РґСЂСѓРіРёРµ РїСЂРёРєР»СЋС‡РµРЅРёСЏ РђР»РµС€РєРё, РєР°СЂС‚Р° РєРЅРёРіРё, РІС‹Р±РѕСЂ
                РёСЃС‚РѕСЂРёРё Рё РїРµСЂРµС…РѕРґС‹ РјРµР¶РґСѓ СЃСЋР¶РµС‚РЅС‹РјРё РІРµС‚РєР°РјРё.
              </p>
              <div className="chapter-meta">
                <span>РќР°РІРёРіР°С†РёСЏ РїРѕ СЃРµСЂРёСЏРј</span>
                <span>Р›РёС‡РЅС‹Р№ РєР°Р±РёРЅРµС‚</span>
                <span>РЎРѕС…СЂР°РЅРµРЅРёСЏ</span>
              </div>
            </article>
          </section>

          <section className="prototype-notes">
            <div className="note-card">
              <span className="eyebrow">РњРµС…Р°РЅРёРєР° MVP</span>
              <strong>
                РЎРµР№С‡Р°СЃ РїСЂРѕС‚РѕС‚РёРї РїРѕРєР°Р·С‹РІР°РµС‚, РєР°Рє С‡РёС‚Р°С‚СЊ, РІС‹Р±РёСЂР°С‚СЊ Рё РїРµСЂРµС…РѕРґРёС‚СЊ РјРµР¶РґСѓ
                СЃС†РµРЅР°РјРё.
              </strong>
            </div>
            <div className="note-card">
              <span className="eyebrow">РЎР»РµРґСѓСЋС‰РёР№ СЃР»РѕР№</span>
              <strong>
                РџРѕС‚РѕРј СЃСЋРґР° С…РѕСЂРѕС€Рѕ Р»СЏР¶РµС‚ РёРЅРІРµРЅС‚Р°СЂСЊ, РєР°СЂС‚Р° СЃРєР°Р·РєРё Рё СЃРѕС…СЂР°РЅРµРЅРёРµ
                РЅРµСЃРєРѕР»СЊРєРёС… РёСЃС‚РѕСЂРёР№.
              </strong>
            </div>
          </section>
        </main>
      ) : (
        <main className="reader-layout">
          <aside className="reader-sidebar">
            <div className="story-chip">Р“Р»Р°РІР° 1</div>
            <h2>{chapter.title}</h2>
            <p>
              РџСЂРѕСЃС‚РѕР№ С„РѕСЂРјР°С‚ РґР»СЏ СЂРµР±РµРЅРєР°: Р»РёСЃС‚Р°Р№ РІРїРµСЂРµРґ, РЅР°Р·Р°Рґ Рё РґРµР»Р°Р№ РІС‹Р±РѕСЂ С‚Р°Рј,
              РіРґРµ РёСЃС‚РѕСЂРёСЏ РјРµРЅСЏРµС‚СЃСЏ.
            </p>
            <div className="progress-box">
              <span>Р­РєСЂР°РЅ</span>
              <strong>
                {progress.screenIndex + 1} / {chapter.screens.length}
              </strong>
            </div>
            <div className="progress-box">
              <span>Р’С‹Р±РѕСЂ</span>
              <strong>{progress.mealChoice ? 'СЃРґРµР»Р°РЅ' : 'РїРѕРєР° РЅРµС‚'}</strong>
            </div>
            <div className="progress-box">
              <span>Р’РѕР»С€РµР±СЃС‚РІРѕ</span>
              <strong>{progress.collectedBooks.length} РєРЅРёРі</strong>
            </div>
            <div className="scene-track">
              {chapter.screens.map((screen, index) => (
                <button
                  key={screen.id}
                  type="button"
                  className={`scene-dot ${index === progress.screenIndex ? 'active' : ''} ${index < progress.screenIndex ? 'seen' : ''}`}
                  onClick={() => jumpToScreen(index)}
                  aria-label={`РџРµСЂРµР№С‚Рё Рє СЌРєСЂР°РЅСѓ ${index + 1}`}
                />
              ))}
            </div>
            <button className="secondary-button wide" onClick={restartChapter}>
              РќР°С‡Р°С‚СЊ СЃРЅР°С‡Р°Р»Р°
            </button>
          </aside>

          <section className="screen-panel">
            <ScreenContent
              key={`${activeScreen.id}-${scenePulse}`}
              screen={activeScreen}
              direction={pageTurnDirection}
              mealChoice={progress.mealChoice}
              mealBranch={mealBranch}
              collectedBooks={progress.collectedBooks}
              miniGameComplete={miniGameComplete}
              onBookClick={toggleBook}
              onMealChoose={chooseMeal}
            />
          </section>
        </main>
      )}

      {view === 'reader' && (
        <footer className="reader-footer">
          <button className="ghost-button" onClick={goBack}>
            РќР°Р·Р°Рґ
          </button>
          <div className="footer-hint">
            {activeScreen.type === 'miniGame'
              ? 'РЎРЅР°С‡Р°Р»Р° СЃРѕР±РµСЂРё 5 РІРѕР»С€РµР±РЅС‹С… РєРЅРёРі.'
              : activeScreen.type === 'choice'
                ? 'Р’С‹Р±РѕСЂ РѕРїСЂРµРґРµР»РёС‚ СЃР»РµРґСѓСЋС‰СѓСЋ РІРµС‚РєСѓ РёСЃС‚РѕСЂРёРё.'
                : 'Р›РёСЃС‚Р°Р№ СЃРєР°Р·РєСѓ РІРїРµСЂРµРґ РІ СѓРґРѕР±РЅРѕРј С‚РµРјРїРµ.'}
          </div>
          <button
            className="primary-button"
            onClick={goNext}
            disabled={nextDisabled || progress.screenIndex >= chapter.screens.length - 1}
          >
            {progress.screenIndex >= chapter.screens.length - 1
              ? 'Р“Р»Р°РІР° Р·Р°РІРµСЂС€РµРЅР°'
              : 'Р”Р°Р»СЊС€Рµ'}
          </button>
        </footer>
      )}
    </div>
  );
}

function ScreenContent({
  screen,
  direction,
  mealChoice,
  mealBranch,
  collectedBooks,
  miniGameComplete,
  onBookClick,
  onMealChoose,
}) {
  return (
    <article className={`screen-card screen-enter ${direction}`}>
      <div className="page-surface page-surface-copy">
        <div className="screen-copy">
        <span className="eyebrow">
          {screen.type === 'cover' ? 'РћР±Р»РѕР¶РєР°' : `Р­РєСЂР°РЅ: ${screen.title}`}
        </span>
        <h1>{screen.title}</h1>

        {screen.text && typeof screen.text === 'string' ? <p>{screen.text}</p> : null}
        {Array.isArray(screen.text)
          ? screen.text.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
          : null}

        {screen.dialogue ? (
          <div className="dialogue-list">
            {screen.dialogue.map(([speaker, line]) => (
              <div className="dialogue-line" key={`${speaker}-${line}`}>
                <strong>{speaker}</strong>
                <span>{line}</span>
              </div>
            ))}
          </div>
        ) : null}

        {screen.type === 'slideshow' ? (
          <div className="slide-list">
            {screen.slides.map((slide, index) => (
              <section className="slide-card" key={slide.title}>
                <span className="slide-index">РљР°РґСЂ {index + 1}</span>
                <h3>{slide.title}</h3>
                <p>{slide.text}</p>
              </section>
            ))}
          </div>
        ) : null}

        {screen.type === 'miniGame' ? (
          <div className="mini-game">
            <div className="meter-row">
              <span>РЁРєР°Р»Р° РІРѕР»С€РµР±СЃС‚РІР°</span>
              <strong>
                {Math.min(collectedBooks.length, screen.targetCount)} / {screen.targetCount}
              </strong>
            </div>
            <div className="meter">
              <div
                className="meter-fill"
                style={{
                  width: `${(Math.min(collectedBooks.length, screen.targetCount) / screen.targetCount) * 100}%`,
                }}
              />
            </div>
            <div className="books-grid">
              {screen.books.map((book) => {
                const selected = collectedBooks.includes(book.id);
                return (
                  <button
                    className={`book-spine ${selected ? 'selected' : ''} ${book.isMagic ? 'magic' : 'plain'}`}
                    key={book.id}
                    onClick={() => onBookClick(book)}
                    type="button"
                  >
                    {book.label}
                  </button>
                );
              })}
            </div>
            <p className="helper-text">
              РќР°Р¶РёРјР°Р№ РЅР° РєРЅРёР¶РєРё СЃРѕ СЃРєР°Р·РѕС‡РЅС‹Рј РЅР°СЃС‚СЂРѕРµРЅРёРµРј. РћР±С‹С‡РЅС‹Рµ СѓС‡РµР±РЅРёРєРё Рё
              СЃРїСЂР°РІРѕС‡РЅРёРєРё РЅРµ РґР°РґСѓС‚ РІРѕР»С€РµР±РЅРѕР№ РёСЃРєСЂС‹.
            </p>
            {miniGameComplete ? <div className="success-box">{screen.successText}</div> : null}
          </div>
        ) : null}

        {screen.type === 'choice' ? (
          <>
            <div className="question-bubble">{screen.question}</div>
            <div className="choice-grid">
              {screen.options.map((option) => (
                <button
                  className={`choice-card ${mealChoice === option.id ? 'selected' : ''}`}
                  key={option.id}
                  onClick={() => onMealChoose(option.id)}
                  type="button"
                >
                  <strong>{option.label}</strong>
                  <span>{option.summary}</span>
                </button>
              ))}
            </div>
          </>
        ) : null}

        {screen.type === 'ending' && mealBranch ? (
          <div className="branch-box">
            <strong>РС‚РѕРі РІС‹Р±СЂР°РЅРЅРѕР№ РІРµС‚РєРё</strong>
            <p>{mealBranch.lead}</p>
            <p>{mealBranch.promise}</p>
            <div className="mirror-note">
              Р’РѕР»С€РµР±РЅРѕРµ Р·РµСЂРєР°Р»СЊС†Рµ РѕСЃС‚Р°РµС‚СЃСЏ Сѓ РђР»РµС€РєРё Рё СЃС‚Р°РЅРµС‚ СѓРґРѕР±РЅС‹Рј РёРіСЂРѕРІС‹Рј
              СЌР»РµРјРµРЅС‚РѕРј РґР»СЏ РїРѕРґСЃРєР°Р·РѕРє РІ СЃР»РµРґСѓСЋС‰РёС… РіР»Р°РІР°С….
            </div>
          </div>
        ) : null}

        {screen.type === 'ending' ? (
          <div className="author-note">
            <strong>Р—Р°РґРµР» РЅР° РїСЂРѕРґРѕР»Р¶РµРЅРёРµ</strong>
            <p>
              Р’ СЃР»РµРґСѓСЋС‰РµР№ РіР»Р°РІРµ РјРѕР¶РЅРѕ РґРѕР±Р°РІРёС‚СЊ РІС‹Р±РѕСЂ РІРµС‰РµР№, РєРѕС‚РѕСЂС‹Рµ РђР»РµС€РєР° Р±РµСЂРµС‚ СЃ
              СЃРѕР±РѕР№: РЅР°РїСЂРёРјРµСЂ, "Р®РЅС‹Р№ РёРЅР¶РµРЅРµСЂ" РёР»Рё РїРѕС…РѕРґРЅСѓСЋ СЌРЅС†РёРєР»РѕРїРµРґРёСЋ.
            </p>
          </div>
        ) : null}
        </div>
      </div>

      <div className="page-surface page-surface-art">
        <IllustrationCard
        label="Р—Р°РіР»СѓС€РєР° РёР»Р»СЋСЃС‚СЂР°С†РёРё"
        description={screen.illustration}
        accent={screen.type}
      />
      </div>
    </article>
  );
}

function IllustrationCard({ label, description, accent = 'story' }) {
  return (
    <div className={`illustration-card illustration-${accent}`}>
      <div className="illustration-sky" />
      <div className="illustration-stars" />
      <div className="illustration-hill illustration-hill-back" />
      <div className="illustration-hill illustration-hill-front" />
      <div className="illustration-book" />
      <div className="illustration-glow" />
      <div className="illustration-caption">
        <span>{label}</span>
        <strong>{description}</strong>
      </div>
    </div>
  );
}

export default App;
