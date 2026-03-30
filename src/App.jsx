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
          К книгам
        </button>
        <div className="topbar-title">
          <span className="eyebrow">Прототип MVP</span>
          <strong>{story.title}</strong>
        </div>
        <button className="ghost-button" onClick={toggleSound}>
          {progress.soundOn ? 'Звук: вкл' : 'Звук: выкл'}
        </button>
      </header>

      {view === 'library' ? (
        <main className="library-layout">
          <section className="hero-panel">
            <div className="hero-copy">
              <span className="eyebrow">Мультяшный квест для детей {story.age}</span>
              <h1>{story.title}</h1>
              <p>{story.description}</p>
              <div className="hero-facts">
                <span>Листание по экранам</span>
                <span>Выборы влияют на путь</span>
                <span>Подходит для будущих серий</span>
              </div>
              <div className="cta-row">
                <button className="primary-button" onClick={resumeChapter}>
                  Продолжить
                </button>
                <button className="secondary-button" onClick={startChapter}>
                  Начать заново
                </button>
              </div>
            </div>
            <IllustrationCard
              label="Обложка истории"
              description="Здесь позже появится главная иллюстрация сказки с Алешкой, Волшебником и Волшебной книгой."
              accent="cover"
            />
          </section>

          <section className="chapter-grid">
            <article className="chapter-card featured">
              <div className="chapter-card-head">
                <div className="chapter-badge">Доступна сейчас</div>
                <div className="chapter-status">
                  {storyComplete ? 'Глава пройдена' : 'Прототип в работе'}
                </div>
              </div>
              <h2>{chapter.title}</h2>
              <p>
                Вступление, знакомство с Волшебником, катсцена, мини-игра на сбор
                волшебства и первая важная развилка.
              </p>
              <div className="chapter-meta">
                <span>{chapter.screens.length} экранов</span>
                <span>1 мини-игра</span>
                <span>1 развилка</span>
              </div>
              <div className="chapter-progress">
                <div className="chapter-progress-bar" style={{ width: `${sceneProgress}%` }} />
              </div>
              <div className="chapter-actions">
                <button className="primary-button" onClick={resumeChapter}>
                  Открыть главу
                </button>
                <button className="secondary-button" onClick={restartChapter}>
                  Сбросить прогресс
                </button>
              </div>
            </article>

            <article className="chapter-card muted">
              <div className="chapter-card-head">
                <div className="chapter-badge soft">Позже</div>
                <div className="chapter-status soft">Следующие истории</div>
              </div>
              <h2>Будущие главы</h2>
              <p>
                Здесь позже появятся другие приключения Алешки, карта книги, выбор
                истории и переходы между сюжетными ветками.
              </p>
              <div className="chapter-meta">
                <span>Навигация по сериям</span>
                <span>Личный кабинет</span>
                <span>Сохранения</span>
              </div>
            </article>
          </section>

          <section className="prototype-notes">
            <div className="note-card">
              <span className="eyebrow">Механика MVP</span>
              <strong>
                Сейчас прототип показывает, как читать, выбирать и переходить между
                сценами.
              </strong>
            </div>
            <div className="note-card">
              <span className="eyebrow">Следующий слой</span>
              <strong>
                Потом сюда хорошо ляжет инвентарь, карта сказки и сохранение
                нескольких историй.
              </strong>
            </div>
          </section>
        </main>
      ) : (
        <main className="reader-layout">
          <section className="reader-stage">
            <div className="reader-stage-top">
              <button className="ghost-button" onClick={goToLibrary}>
                Вернуться к книге
              </button>
              <div className="reader-stage-meta">
                <span>Глава 1</span>
                <span>
                  Экран {progress.screenIndex + 1} / {chapter.screens.length}
                </span>
              </div>
            </div>

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
            Назад
          </button>
          <div className="footer-hint">
            {activeScreen.type === 'miniGame'
              ? 'Сначала собери 5 волшебных книг.'
              : activeScreen.type === 'choice'
                ? 'Выбор определит следующую ветку истории.'
                : 'Листай сказку вперед в удобном темпе.'}
          </div>
          <button
            className="primary-button"
            onClick={goNext}
            disabled={nextDisabled || progress.screenIndex >= chapter.screens.length - 1}
          >
            {progress.screenIndex >= chapter.screens.length - 1
              ? 'Глава завершена'
              : 'Дальше'}
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
            {screen.type === 'cover' ? 'Обложка' : `Экран: ${screen.title}`}
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
                  <span className="slide-index">Кадр {index + 1}</span>
                  <h3>{slide.title}</h3>
                  <p>{slide.text}</p>
                </section>
              ))}
            </div>
          ) : null}

          {screen.type === 'miniGame' ? (
            <div className="mini-game">
              <div className="meter-row">
                <span>Шкала волшебства</span>
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
                Нажимай на книжки со сказочным настроением. Обычные учебники и
                справочники не дадут волшебной искры.
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
              <strong>Итог выбранной ветки</strong>
              <p>{mealBranch.lead}</p>
              <p>{mealBranch.promise}</p>
              <div className="mirror-note">
                Волшебное зеркальце остается у Алешки и станет удобным игровым
                элементом для подсказок в следующих главах.
              </div>
            </div>
          ) : null}

          {screen.type === 'ending' ? (
            <div className="author-note">
              <strong>Задел на продолжение</strong>
              <p>
                В следующей главе можно добавить выбор вещей, которые Алешка берет с
                собой: например, "Юный инженер" или походную энциклопедию.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="page-surface page-surface-art">
        <IllustrationCard
          label="Заглушка иллюстрации"
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
