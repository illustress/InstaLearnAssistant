(function() {
  console.log("Gemini Quiz Gate: Full Screen Mode Active");

  const container = document.createElement('div');
  container.id = 'gemini-quiz-gate-root';
  // Initially hidden
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 2147483647;
    display: none;
    background: #000;
  `;
  document.body.appendChild(container);

  const iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL('index.html');
  iframe.style.cssText = `
    width: 100%;
    height: 100%;
    border: none;
    color-scheme: dark;
  `;
  container.appendChild(iframe);

  let lastCaption = "";
  let isLocked = false;
  let scrollTimeout;

  const triggerQuiz = (caption) => {
    if (isLocked) return;
    isLocked = true;
    container.style.display = 'block';
    document.body.style.overflow = 'hidden';
    iframe.contentWindow.postMessage({ type: 'IG_CONTEXT_RESPONSE', caption }, '*');
  };

  const handleInteraction = () => {
    if (isLocked) return;

    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const caption = findCurrentCaption();
      // Detect if we've moved to a new post/reel
      if (caption && caption !== lastCaption) {
        lastCaption = caption;
        triggerQuiz(caption);
      }
    }, 400); // Quick trigger after swipe settles
  };

  // Listen to various scroll/swipe events on Instagram
  window.addEventListener('wheel', handleInteraction, { passive: true });
  window.addEventListener('touchend', handleInteraction, { passive: true });
  window.addEventListener('scroll', handleInteraction, { passive: true });

  window.addEventListener('message', (event) => {
    if (event.data.type === 'UNLOCK_INSTAGRAM') {
      isLocked = false;
      container.style.display = 'none';
      document.body.style.overflow = '';
      console.log("Quiz passed. Instagram unlocked.");
    }
  });

  function findCurrentCaption() {
    // Reels caption selector
    const reelCaption = document.querySelector('span._ap3a');
    if (reelCaption && reelCaption.innerText.length > 5) {
      return reelCaption.innerText;
    }

    // Feed post caption selector (centered post)
    const articles = document.querySelectorAll('article');
    const viewportMiddle = window.innerHeight / 2;
    for (let article of articles) {
      const rect = article.getBoundingClientRect();
      if (rect.top < viewportMiddle && rect.bottom > viewportMiddle) {
        const caption = article.querySelector('h1, span._ap3a, div._a9zs');
        if (caption) return caption.innerText;
      }
    }
    return "";
  }
})();