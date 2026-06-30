(() => {
  const root = document.querySelector("[data-hero-snake]");
  if (!root) return;

  const canvas = root.querySelector("[data-hero-snake-canvas]");
  const ghostCanvas = root.querySelector("[data-hero-snake-ghost]");
  const portrait = root.querySelector(".hero-portrait");
  const startButton = root.querySelector("[data-hero-snake-start]");
  const scoreEl = root.querySelector("[data-hero-snake-score]");
  const ctx = canvas.getContext("2d");
  const ghostCtx = ghostCanvas.getContext("2d");

  const lcd = "#e85f4f";
  const lcdLight = "#ffd8d2";
  const pixel = "#32110d";
  const foodColor = "#fff2c4";
  const directions = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };
  const keys = {
    ArrowUp: "up",
    KeyW: "up",
    ArrowDown: "down",
    KeyS: "down",
    ArrowLeft: "left",
    KeyA: "left",
    ArrowRight: "right",
    KeyD: "right"
  };

  let width = 0;
  let height = 0;
  let cols = 1;
  let rows = 1;
  let cellW = 1;
  let cellH = 1;
  let snake = [];
  let food = { x: 0, y: 0 };
  let direction = directions.right;
  let nextDirection = directions.right;
  let score = 0;
  let running = false;
  let ended = false;
  let timer = null;
  let touchStart = null;

  const setScore = () => {
    scoreEl.textContent = String(score).padStart(2, "0");
  };

  const isSameCell = (a, b) => a.x === b.x && a.y === b.y;

  const isSnakeCell = (cell, body = snake) => (
    body.some((segment) => isSameCell(segment, cell))
  );

  const canvasPointForCell = (cell) => ({
    x: (cell.x + 0.5) * cellW,
    y: (cell.y + 0.5) * cellH
  });

  const portraitZone = () => {
    const stageRect = canvas.getBoundingClientRect();
    const portraitRect = portrait.getBoundingClientRect();

    return {
      x: portraitRect.left - stageRect.left,
      y: portraitRect.top - stageRect.top,
      width: portraitRect.width,
      height: portraitRect.height
    };
  };

  const isInPortraitZone = (cell) => {
    const zone = portraitZone();
    const point = canvasPointForCell(cell);
    const relX = (point.x - zone.x) / zone.width;
    const relY = (point.y - zone.y) / zone.height;

    if (relX < 0 || relX > 1 || relY < 0 || relY > 1) return false;

    const head = (
      ((relX - 0.48) ** 2) / (0.24 ** 2) +
      ((relY - 0.2) ** 2) / (0.16 ** 2)
    ) <= 1;
    const torso = relX > 0.11 && relX < 0.92 && relY > 0.28 && relY < 1.05;

    return head || torso;
  };

  const randomOpenCell = () => {
    const open = [];

    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const cell = { x, y };
        if (!isSnakeCell(cell) && !isInPortraitZone(cell)) {
          open.push(cell);
        }
      }
    }

    return open[Math.floor(Math.random() * open.length)] || {
      x: Math.max(0, cols - 4),
      y: Math.max(0, Math.floor(rows / 2))
    };
  };

  const placeFood = () => {
    food = randomOpenCell();
  };

  const roundRect = (context, x, y, boxWidth, boxHeight, radius) => {
    const r = Math.min(radius, boxWidth / 2, boxHeight / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.lineTo(x + boxWidth - r, y);
    context.quadraticCurveTo(x + boxWidth, y, x + boxWidth, y + r);
    context.lineTo(x + boxWidth, y + boxHeight - r);
    context.quadraticCurveTo(x + boxWidth, y + boxHeight, x + boxWidth - r, y + boxHeight);
    context.lineTo(x + r, y + boxHeight);
    context.quadraticCurveTo(x, y + boxHeight, x, y + boxHeight - r);
    context.lineTo(x, y + r);
    context.quadraticCurveTo(x, y, x + r, y);
    context.closePath();
  };

  const drawBackground = () => {
    ctx.fillStyle = lcd;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "rgba(255, 255, 255, 0.055)";
    for (let y = 0; y < height; y += 5) {
      ctx.fillRect(0, y, width, 1);
    }

    ctx.fillStyle = "rgba(50, 17, 13, 0.045)";
    for (let y = 11; y < height; y += 34) {
      for (let x = (y % 68) / 2; x < width; x += 68) {
        ctx.fillRect(x, y, 2, 2);
      }
    }

    ctx.strokeStyle = "rgba(255, 216, 210, 0.06)";
    ctx.lineWidth = 1;
    for (let x = -height; x < width; x += 56) {
      ctx.beginPath();
      ctx.moveTo(x, height);
      ctx.lineTo(x + height, 0);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(50, 17, 13, 0.055)";
    for (let x = 0; x < width + height; x += 56) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x - height, height);
      ctx.stroke();
    }

    const vignette = ctx.createRadialGradient(width * 0.38, height * 0.22, 0, width * 0.38, height * 0.22, width * 0.74);
    vignette.addColorStop(0, "rgba(255, 216, 210, 0.18)");
    vignette.addColorStop(0.56, "rgba(232, 95, 79, 0.02)");
    vignette.addColorStop(1, "rgba(50, 17, 13, 0.2)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  };

  const drawCell = (context, cell, options = {}) => {
    const gap = Math.max(3, Math.min(cellW, cellH) * 0.18);
    const x = cell.x * cellW + gap;
    const y = cell.y * cellH + gap;
    const boxWidth = cellW - gap * 2;
    const boxHeight = cellH - gap * 2;

    context.globalAlpha = options.alpha ?? 1;
    context.fillStyle = options.color || pixel;
    roundRect(context, x, y, boxWidth, boxHeight, Math.min(boxWidth, boxHeight) * 0.28);
    context.fill();
    context.globalAlpha = 1;
  };

  const drawFood = () => {
    const point = canvasPointForCell(food);
    const radius = Math.min(cellW, cellH) * 0.31;

    ctx.fillStyle = foodColor;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(50, 17, 13, 0.32)";
    ctx.lineWidth = Math.max(1, radius * 0.16);
    ctx.stroke();
  };

  const render = () => {
    drawBackground();
    ghostCtx.clearRect(0, 0, width, height);
    drawFood();

    snake.forEach((segment, index) => {
      const color = index === 0 ? "#210a07" : pixel;
      drawCell(ctx, segment, { color });

      if (isInPortraitZone(segment)) {
        drawCell(ghostCtx, segment, {
          color,
          alpha: index === 0 ? 0.16 : 0.09
        });
      }
    });
  };

  const configureCanvases = () => {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    const targetCell = rect.width < 560 ? 21 : 28;

    width = Math.max(320, Math.round(rect.width));
    height = Math.max(420, Math.round(rect.height));
    cols = Math.max(16, Math.floor(width / targetCell));
    rows = Math.max(12, Math.floor(height / targetCell));
    cellW = width / cols;
    cellH = height / rows;

    [canvas, ghostCanvas].forEach((item) => {
      item.width = Math.round(width * scale);
      item.height = Math.round(height * scale);
      item.style.width = `${width}px`;
      item.style.height = `${height}px`;
    });

    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ghostCtx.setTransform(scale, 0, 0, scale, 0, 0);
  };

  const resetGame = () => {
    const startX = Math.min(cols - 5, Math.max(5, Math.floor(cols * 0.84)));
    const startY = Math.min(rows - 3, Math.max(3, Math.floor(rows * 0.38)));

    snake = [
      { x: startX, y: startY },
      { x: startX + 1, y: startY },
      { x: startX + 2, y: startY },
      { x: startX + 3, y: startY }
    ];
    direction = directions.left;
    nextDirection = directions.left;
    score = 0;
    running = false;
    ended = false;
    root.classList.remove("is-running");
    startButton.textContent = "Start";
    clearTimeout(timer);
    setScore();
    placeFood();
    render();
  };

  const endGame = () => {
    running = false;
    ended = true;
    root.classList.remove("is-running");
    startButton.textContent = "Start";
    clearTimeout(timer);
    render();
  };

  const tickDelay = () => Math.max(92, 190 - score * 3);

  const queue = () => {
    clearTimeout(timer);
    if (!running) return;
    timer = setTimeout(() => {
      tick();
      queue();
    }, tickDelay());
  };

  const startGame = () => {
    if (ended) resetGame();
    running = true;
    root.classList.add("is-running");
    queue();
    render();
  };

  const setDirection = (name) => {
    const proposed = directions[name];
    if (!proposed) return;

    const reversing = proposed.x + direction.x === 0 && proposed.y + direction.y === 0;
    if (reversing) return;

    nextDirection = proposed;
    if (!running) startGame();
  };

  function tick() {
    direction = nextDirection;
    const head = snake[0];
    const nextHead = {
      x: head.x + direction.x,
      y: head.y + direction.y
    };
    const ateFood = isSameCell(nextHead, food);
    const collisionBody = ateFood ? snake : snake.slice(0, -1);
    const hitWall = (
      nextHead.x < 0 ||
      nextHead.y < 0 ||
      nextHead.x >= cols ||
      nextHead.y >= rows
    );

    if (hitWall || isSnakeCell(nextHead, collisionBody)) {
      endGame();
      return;
    }

    snake.unshift(nextHead);

    if (ateFood) {
      score += 1;
      setScore();
      placeFood();
    } else {
      snake.pop();
    }

    render();
  }

  const handleResize = () => {
    configureCanvases();
    resetGame();
  };

  startButton.addEventListener("click", startGame);

  window.addEventListener("keydown", (event) => {
    const activeTag = document.activeElement?.tagName?.toLowerCase();
    if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") return;

    if (event.code === "Space" || event.code === "Enter") {
      event.preventDefault();
      if (!running) startGame();
      return;
    }

    const directionName = keys[event.code];
    if (!directionName) return;

    event.preventDefault();
    setDirection(directionName);
  });

  root.addEventListener("pointerdown", (event) => {
    touchStart = {
      x: event.clientX,
      y: event.clientY
    };
  });

  root.addEventListener("pointerup", (event) => {
    if (!touchStart) return;

    const dx = event.clientX - touchStart.x;
    const dy = event.clientY - touchStart.y;
    const distance = Math.hypot(dx, dy);
    touchStart = null;

    if (distance < 24) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      setDirection(dx > 0 ? "right" : "left");
    } else {
      setDirection(dy > 0 ? "down" : "up");
    }
  });

  window.addEventListener("resize", handleResize);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && running) {
      running = false;
      root.classList.remove("is-running");
      clearTimeout(timer);
      render();
    }
  });

  if (portrait.complete) {
    handleResize();
  } else {
    portrait.addEventListener("load", handleResize, { once: true });
  }
})();
