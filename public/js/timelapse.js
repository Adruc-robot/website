const viewer = document.getElementById("timelapseViewer");
const title = document.getElementById("timelapseTitle");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const monthBtn = document.getElementById("monthBtn");
const weekBtn = document.getElementById("weekBtn");
const dayBtn = document.getElementById("dayBtn");

let currentView = "month";
let monthAnchor = new Date();
monthAnchor.setDate(1);
let selectedDate = null;
let weekAnchor = null;

let dayImages = [];
let currentFrame = 0;
let playerImage = null;
let playerInfo = null;
let playerSlider = null;
let playerPreviousButton = null;
let playerNextButton = null;
let playerPlayButton = null;

let playbackTimer = null;
let isPlaying = false;

let lightbox = null;
let lightboxImage = null;
let lightboxInfo = null;
let lightboxOpen = false;
let lightboxScale = 1;
let lightboxPanX = 0;
let lightboxPanY = 0;
let lightboxDragging = false;
let lightboxDragX = 0;
let lightboxDragY = 0;
let lightboxPreviousOverflow = "";

const expandedTelemetrySections = new Set();

function startOfWeek(date) {
  const start = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  start.setDate(start.getDate() - start.getDay());

  return start;
}

function dateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function viewingCurrentMonth() {
  const now = new Date();

  return (
    monthAnchor.getFullYear() === now.getFullYear() &&
    monthAnchor.getMonth() === now.getMonth()
  );
}

function viewingCurrentDay() {
  return selectedDate === dateString(new Date());
}

function viewingCurrentWeek() {
  if (!weekAnchor) {
    return false;
  }

  const now = new Date();

  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const selected = new Date(`${selectedDate}T12:00:00`);

  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(
    today.getDate() - today.getDay()
  );

  const currentWeekEnd = new Date(currentWeekStart);
  currentWeekEnd.setDate(
    currentWeekStart.getDate() + 6
  );

  return (
    selected >= currentWeekStart &&
    selected <= currentWeekEnd
  );
}

function updateNavigationButtons() {
  prevBtn.disabled = false;

  if (currentView === "month") {
    nextBtn.disabled = viewingCurrentMonth();
    return;
  }

  if (currentView === "week") {
    nextBtn.disabled = viewingCurrentWeek();
    return;
  }

  if (currentView === "day") {
    nextBtn.disabled = viewingCurrentDay();
    return;
  }

  nextBtn.disabled = false;
}

async function renderMonth() {
  currentView = "month";

  viewer.innerHTML = "";
  monthBtn.classList.add("active");
  weekBtn.classList.remove("active");
  dayBtn.classList.remove("active");
  const weekdays = document.createElement("div");
  weekdays.className = "timelapse-weekdays";
  weekdays.innerHTML = `
    <div>Sun</div>
    <div>Mon</div>
    <div>Tue</div>
    <div>Wed</div>
    <div>Thu</div>
    <div>Fri</div>
    <div>Sat</div>
  `;

  const grid = document.createElement("div");
  grid.className = "timelapse-month";

  viewer.appendChild(weekdays);
  viewer.appendChild(grid);

  const year = monthAnchor.getFullYear();
  const month = monthAnchor.getMonth();

  updateNavigationButtons();
  title.textContent = monthAnchor.toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  const now = new Date();

  const isCurrentMonth =
    year === now.getFullYear() &&
    month === now.getMonth();

  let start;

  if (isCurrentMonth) {
    const today = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
    );

    const endOfCurrentWeek = new Date(today);
        endOfCurrentWeek.setDate(
            today.getDate() + (6 - today.getDay())
        );

    start = new Date(endOfCurrentWeek);
    start.setDate(endOfCurrentWeek.getDate() - 41);
  } else {
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay();

    start = new Date(firstDay);
    start.setDate(firstDay.getDate() - firstDayOfWeek);
  }

  const end = new Date(start);
  end.setDate(start.getDate() + 42);

  const apiUrl =
    `/api/timelapse/calendar` +
    `?location=1` +
    `&start=${dateString(start)}` +
    `&end=${dateString(end)}`;

  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error(`Calendar request failed: ${response.status}`);
  }

  const calendar = await response.json();

  const imagesByDate = new Map(
    calendar.days.map(day => [day.date, day])
  );

  for (let i = 0; i < 42; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);

    const dateKey = dateString(date);
    const image = imagesByDate.get(dateKey);
    const cell = document.createElement("div");
    cell.className = "timelapse-day";
    if (
        date.getFullYear() === year &&
        date.getMonth() === month
    ) {
        cell.classList.add("current-month");
    }

    const dayNumber = document.createElement("span");
    dayNumber.className = "timelapse-day-number";
    dayNumber.textContent = date.getDate();

    cell.appendChild(dayNumber);
    if (image) {
        const thumbnail = document.createElement("img");

        thumbnail.src = image.thumbnailUrl;
        thumbnail.alt = `Time-lapse image for ${dateKey}`;
        thumbnail.loading = "lazy";

        cell.appendChild(thumbnail);

        cell.classList.add("has-image");

        cell.addEventListener("click", () => {
            selectedDate = dateKey;

            renderDay().catch(error => {
                console.error(error);

                document.getElementById("timelapseStatus").textContent =
                "Unable to load time-lapse day.";
            });
        });
    } else {
        cell.classList.add("empty");
    }
    grid.appendChild(cell);
  }
}

async function renderWeek() {
  currentView = "week";

  viewer.innerHTML = "";

  monthBtn.classList.remove("active");
  weekBtn.classList.add("active");
  dayBtn.classList.remove("active");

  if (!weekAnchor) {
    weekAnchor = startOfWeek(new Date());
  }

  updateNavigationButtons();

  const start = new Date(weekAnchor);

  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  const weekEnd = new Date(start);
  weekEnd.setDate(start.getDate() + 6);

  title.textContent =
    `${start.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric"
    })} – ${weekEnd.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    })}`;

  const status = document.getElementById("timelapseStatus");
  status.textContent = "Loading week...";

  const apiUrl =
    `/api/timelapse/calendar` +
    `?location=1` +
    `&start=${dateString(start)}` +
    `&end=${dateString(end)}`;

  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error(`Week request failed: ${response.status}`);
  }

  const calendar = await response.json();

  status.textContent = "";

  const imagesByDate = new Map(
    calendar.days.map(day => [day.date, day])
  );

  const week = document.createElement("div");
  week.className = "timelapse-week";

  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);

    const dateKey = dateString(date);
    const image = imagesByDate.get(dateKey);

    const cell = document.createElement("div");
    cell.className = "timelapse-week-day";

    const heading = document.createElement("div");
    heading.className = "timelapse-week-day-heading";

    const weekday = document.createElement("span");
    weekday.textContent = date.toLocaleDateString(undefined, {
      weekday: "short"
    });

    const dayNumber = document.createElement("span");
    dayNumber.textContent = date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric"
    });

    heading.appendChild(weekday);
    heading.appendChild(dayNumber);

    cell.appendChild(heading);

    if (image) {
      const thumbnail = document.createElement("img");

      thumbnail.src = image.webUrl;
      thumbnail.alt = `Time-lapse image for ${dateKey}`;
      thumbnail.loading = "lazy";

      cell.appendChild(thumbnail);
      cell.classList.add("has-image");

      cell.addEventListener("click", () => {
        selectedDate = dateKey;

        renderDay().catch(error => {
          console.error(error);

          document.getElementById("timelapseStatus").textContent =
            "Unable to load time-lapse day.";
        });
      });
    } else {
      cell.classList.add("empty");
    }

    week.appendChild(cell);
  }

  viewer.appendChild(week);
}

async function renderDay() {
  currentView = "day";
  viewer.innerHTML = "";

  monthBtn.classList.remove("active");
  weekBtn.classList.remove("active");
  dayBtn.classList.add("active");

  updateNavigationButtons();

  title.textContent = selectedDate;

  const status = document.getElementById("timelapseStatus");
  status.textContent = "Loading images...";

  const apiUrl =
    `/api/timelapse/day` +
    `?location=1` +
    `&date=${selectedDate}`;

  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error(`Day request failed: ${response.status}`);
  }

  const day = await response.json();

  status.textContent = `${day.count} images`;

  dayImages = day.images;
  currentFrame = 0;

  if (dayImages.length === 0) {
    status.textContent = "No images available for this day.";
    return;
  }

    renderFrame();
}

function renderFrame() {
  viewer.innerHTML = "";

  const player = document.createElement("div");
  player.className = "timelapse-player";

  // Image
  playerImage = document.createElement("img");
  playerImage.className = "timelapse-player-image";
  playerImage.alt = `Time-lapse frame for ${selectedDate}`;
  playerImage.style.cursor = "zoom-in";
  playerImage.title = "View full-resolution image";

  playerImage.addEventListener("click", () => {
    stopPlayback();
    openLightbox();
  });

  // Frame information
  playerInfo = document.createElement("div");
  playerInfo.className = "timelapse-player-info";

  // Controls container
  const controls = document.createElement("div");
  controls.className = "timelapse-player-controls";

  // Previous button
  playerPreviousButton = document.createElement("button");
  playerPreviousButton.type = "button";
  playerPreviousButton.textContent = "←";

  // Play button
  playerPlayButton = document.createElement("button");
  playerPlayButton.type = "button";
  playerPlayButton.textContent = "▶";
  playerPlayButton.title = "Play";

  playerPlayButton.addEventListener("click", () => {
    if (isPlaying) {
        stopPlayback();
    } else {
        startPlayback();
    }
  });

  // Next button
  playerNextButton = document.createElement("button");
  playerNextButton.type = "button";
  playerNextButton.textContent = "→";

  playerPreviousButton.className = "timelapse-control-button";
  playerPlayButton.className = "timelapse-control-button";
  playerNextButton.className = "timelapse-control-button";

  // Frame slider
  playerSlider = document.createElement("input");
  playerSlider.type = "range";
  playerSlider.min = 0;
  playerSlider.max = dayImages.length - 1;
  playerSlider.value = currentFrame;

  // Previous frame
  playerPreviousButton.addEventListener("click", () => {
    stopPlayback();

    if (currentFrame > 0) {
      currentFrame--;
      updateFrame();
    }
  });

  // Next frame
  playerNextButton.addEventListener("click", () => {
    stopPlayback()

    if (currentFrame < dayImages.length - 1) {
      currentFrame++;
      updateFrame();
    }
  });

  // Slider
  playerSlider.addEventListener("input", () => {
    stopPlayback();

    currentFrame = Number(playerSlider.value);
    updateFrame();
  });

  // Assemble controls
  controls.appendChild(playerPreviousButton);
  controls.appendChild(playerPlayButton);
  controls.appendChild(playerNextButton);
  controls.appendChild(playerSlider);

  // Assemble player
  player.appendChild(playerImage);
  player.appendChild(playerInfo);
  player.appendChild(controls);

  viewer.appendChild(player);

  updateFrame();
}

function updateFrame() {
  const frame = dayImages[currentFrame];

  playerImage.src = frame.webUrl;

  const capturedAt = new Date(frame.capturedAt);

  const time = capturedAt.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });

  playerInfo.textContent =
    `${time} — Frame ${currentFrame + 1} of ${dayImages.length}`;

  playerSlider.value = currentFrame;

  playerPreviousButton.disabled = currentFrame === 0;
  playerNextButton.disabled =
    currentFrame === dayImages.length - 1;
}

function stopPlayback() {
  if (playbackTimer !== null) {
    clearInterval(playbackTimer);
    playbackTimer = null;
  }

  isPlaying = false;

  if (playerPlayButton) {
    playerPlayButton.textContent = "▶";
    playerPlayButton.title = "Play";
  }
}

function startPlayback() {
  if (dayImages.length === 0) {
    return;
  }

  // If we're already at the end, restart from the beginning.
  if (currentFrame >= dayImages.length - 1) {
    currentFrame = 0;
    updateFrame();
  }

  isPlaying = true;
  playerPlayButton.textContent = "⏸";
  playerPlayButton.title = "Pause";

  playbackTimer = setInterval(() => {
    if (currentFrame >= dayImages.length - 1) {
      stopPlayback();
      return;
    }

    currentFrame++;
    updateFrame();
  }, 500);
}

prevBtn.addEventListener("click", () => {
  if (currentView === "month") {
    monthAnchor.setMonth(monthAnchor.getMonth() - 1);

    renderMonth().catch(error => {
      console.error(error);
    });

    return;
  }

  if (currentView === "week") {
    weekAnchor.setDate(weekAnchor.getDate() - 7);

    renderWeek().catch(error => {
      console.error(error);
    });

    return;
  }

  if (currentView === "day") {
    const date = new Date(`${selectedDate}T12:00:00`);
    date.setDate(date.getDate() - 1);

    selectedDate = dateString(date);

    renderDay().catch(error => {
      console.error(error);
    });
  }
});

nextBtn.addEventListener("click", () => {
  if (currentView === "month") {
    if (viewingCurrentMonth()) {
      return;
    }

    monthAnchor.setMonth(monthAnchor.getMonth() + 1);

    renderMonth().catch(error => {
      console.error(error);
    });

    return;
  }

  if (currentView === "week") {
    if (viewingCurrentWeek()) {
      return;
    }

    weekAnchor.setDate(weekAnchor.getDate() + 7);

    renderWeek().catch(error => {
      console.error(error);
    });

    return;
  }

  if (currentView === "day") {
    const date = new Date(`${selectedDate}T12:00:00`);
    date.setDate(date.getDate() + 1);

    selectedDate = dateString(date);

    renderDay().catch(error => {
      console.error(error);
    });
  }
});

monthBtn.addEventListener("click", () => {
  if (currentView === "month") {
    return;
  }

  // If we came from Day view, show the month containing that day.
  if (selectedDate) {
    const date = new Date(`${selectedDate}T12:00:00`);

    monthAnchor = new Date(
      date.getFullYear(),
      date.getMonth(),
      1
    );
  }


  renderMonth().catch(error => {
    console.error(error);

    document.getElementById("timelapseStatus").textContent =
      "Unable to load time-lapse calendar.";
  });
});

weekBtn.addEventListener("click", () => {
  if (currentView === "week") {
    return;
  }

  let anchorDate;

  if (selectedDate) {
    anchorDate = new Date(`${selectedDate}T12:00:00`);
  } else {
    anchorDate = new Date();
  }

  weekAnchor = startOfWeek(anchorDate);

  renderWeek().catch(error => {
    console.error(error);

    document.getElementById("timelapseStatus").textContent =
      "Unable to load time-lapse week.";
  });
});

dayBtn.addEventListener("click", () => {
  if (currentView === "day") {
    return;
  }

  if (!selectedDate) {
    selectedDate = dateString(new Date());
  }

  renderDay().catch(error => {
    console.error(error);

    document.getElementById("timelapseStatus").textContent =
      "Unable to load time-lapse day.";
  });
});

renderMonth().catch(error => {
  console.error(error);

  document.getElementById("timelapseStatus").textContent =
    "Unable to load time-lapse calendar.";
});

//
// Full-resolution image viewer
//
function openLightbox() {
  if (!dayImages.length) return;

  lightbox = document.createElement("div");
  lightbox.className = "timelapse-lightbox";

  lightbox.innerHTML = `
    <button class="timelapse-lightbox-close" type="button"
      aria-label="Close viewer">×</button>

    <button class="timelapse-lightbox-prev" type="button"
      aria-label="Previous image">←</button>

    <img class="timelapse-lightbox-image" alt="Full-resolution capture">

    <button class="timelapse-lightbox-next" type="button"
      aria-label="Next image">→</button>

    <div class="timelapse-lightbox-info"></div>

    <div class="timelapse-telemetry-panel">
      <div class="timelapse-telemetry-header">
        <span class="timelapse-telemetry-drag-handle"
              title="Drag telemetry panel">⠿</span>

        <span class="timelapse-telemetry-title">
          Capture Telemetry
        </span>

        <button class="timelapse-telemetry-toggle"
                type="button"
                aria-label="Collapse telemetry"
                aria-expanded="true">−</button>
      </div>

      <div class="timelapse-telemetry-content">
        Select an image to view telemetry.
      </div>
    </div>
  `;

  lightboxPreviousOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  document.body.appendChild(lightbox);

  initializeTelemetryDragging();

  lightboxImage = lightbox.querySelector(".timelapse-lightbox-image");
  lightboxInfo = lightbox.querySelector(".timelapse-lightbox-info");

  // Mouse wheel zoom
  lightboxImage.addEventListener("wheel", event => {
    event.preventDefault();

    zoomLightbox(
      event.deltaY < 0 ? 1 : -1,
      event.clientX,
      event.clientY
    );
  }, { passive: false });

  // Double-click to toggle zoom
  lightboxImage.addEventListener("dblclick", event => {
    event.preventDefault();

    if (lightboxScale > 1) {
      resetLightboxZoom();
    } else {
      zoomLightboxTo(
        2,
        event.clientX,
        event.clientY
      );
    }
  });

  // Begin dragging
  lightboxImage.addEventListener("pointerdown", event => {
    if (lightboxScale <= 1) return;

    event.preventDefault();

    lightboxDragging = true;
    lightboxDragX = event.clientX - lightboxPanX;
    lightboxDragY = event.clientY - lightboxPanY;

    lightboxImage.setPointerCapture(event.pointerId);

    applyLightboxTransform();
  });

  // Drag image
  lightboxImage.addEventListener("pointermove", event => {
    if (!lightboxDragging) return;

    lightboxPanX = event.clientX - lightboxDragX;
    lightboxPanY = event.clientY - lightboxDragY;

    applyLightboxTransform();
  });

  // Stop dragging
  function stopDragging() {
    lightboxDragging = false;
    applyLightboxTransform();
  }

  lightboxImage.addEventListener("pointerup", stopDragging);
  lightboxImage.addEventListener("pointercancel", stopDragging);
  lightboxImage.addEventListener("lostpointercapture", stopDragging);

  lightbox.querySelector(".timelapse-lightbox-close")
    .addEventListener("click", closeLightbox);

  lightbox.querySelector(".timelapse-lightbox-prev")
    .addEventListener("click", () => navigateLightbox(-1));

  lightbox.querySelector(".timelapse-lightbox-next")
    .addEventListener("click", () => navigateLightbox(1));

  lightbox.addEventListener("click", event => {
    if (event.target === lightbox) closeLightbox();
  });

  lightboxOpen = true;
  document.addEventListener("keydown", handleLightboxKeydown);
  window.addEventListener("resize", handleLightboxResize);
  updateLightbox();
}

function updateLightbox() {
  if (!lightboxOpen || !dayImages.length) return;

  const frame = dayImages[currentFrame];

  resetLightboxZoom();

  lightboxImage.src = frame.originalUrl;

  updateLightboxTelemetry();

  const capturedAt = new Date(frame.capturedAt);

  lightboxInfo.textContent =
    `${capturedAt.toLocaleString()} — Frame ${currentFrame + 1} of ${dayImages.length}`;

  lightbox.querySelector(".timelapse-lightbox-prev").disabled =
    currentFrame === 0;

  lightbox.querySelector(".timelapse-lightbox-next").disabled =
    currentFrame === dayImages.length - 1;
}

function navigateLightbox(direction) {
  const nextFrame = currentFrame + direction;

  if (nextFrame < 0 || nextFrame >= dayImages.length) return;

  currentFrame = nextFrame;
  updateFrame();
  updateLightbox();
}

function closeLightbox() {
  if (!lightboxOpen) return;
  telemetryRequestId++;
  document.body.style.overflow = lightboxPreviousOverflow;

  lightbox.remove();
  lightbox = null;
  lightboxImage = null;
  lightboxInfo = null;
  lightboxOpen = false;

  document.removeEventListener("keydown", handleLightboxKeydown);
  window.removeEventListener("resize", handleLightboxResize);
}

function handleLightboxResize() {
  if (lightboxOpen) {
    applyLightboxTransform();
  }
}

function handleLightboxKeydown(event) {
  switch (event.key) {
    case "Escape":
      closeLightbox();
      break;

    case "ArrowLeft":
      event.preventDefault();
      navigateLightbox(-1);
      break;

    case "ArrowRight":
      event.preventDefault();
      navigateLightbox(1);
      break;
  }
}

//
// Lightbox zoom and pan
//
function constrainLightboxPan() {
  if (!lightboxImage) return;

  // offsetWidth/Height are the image dimensions before transforms.
  const imageWidth = lightboxImage.offsetWidth;
  const imageHeight = lightboxImage.offsetHeight;

  const scaledWidth = imageWidth * lightboxScale;
  const scaledHeight = imageHeight * lightboxScale;

  // The lightbox is our visible viewport.
  const viewportWidth = lightbox.clientWidth;
  const viewportHeight = lightbox.clientHeight;

  const maxPanX = Math.max(
    0,
    (scaledWidth - viewportWidth) / 2
  );

  const maxPanY = Math.max(
    0,
    (scaledHeight - viewportHeight) / 2
  );

  lightboxPanX = Math.max(
    -maxPanX,
    Math.min(maxPanX, lightboxPanX)
  );

  lightboxPanY = Math.max(
    -maxPanY,
    Math.min(maxPanY, lightboxPanY)
  );
}

function applyLightboxTransform() {
  if (!lightboxImage) return;

  constrainLightboxPan();

  lightboxImage.style.transform =
    `translate(${lightboxPanX}px, ${lightboxPanY}px) scale(${lightboxScale})`;

  lightboxImage.style.cursor =
    lightboxScale > 1
      ? (lightboxDragging ? "grabbing" : "grab")
      : "zoom-in";
}

function resetLightboxZoom() {
  lightboxScale = 1;
  lightboxPanX = 0;
  lightboxPanY = 0;
  lightboxDragging = false;

  applyLightboxTransform();
}

function zoomLightboxTo(newScale, clientX, clientY) {
  if (!lightboxImage) return;

  const oldScale = lightboxScale;

  newScale = Math.max(1, Math.min(8, newScale));

  if (newScale === oldScale) return;

  const rect = lightboxImage.getBoundingClientRect();

  const centerX =
    rect.left + rect.width / 2 - lightboxPanX;

  const centerY =
    rect.top + rect.height / 2 - lightboxPanY;

  const offsetX = clientX - centerX;
  const offsetY = clientY - centerY;

  const ratio = newScale / oldScale;

  lightboxPanX =
    offsetX - (offsetX - lightboxPanX) * ratio;

  lightboxPanY =
    offsetY - (offsetY - lightboxPanY) * ratio;

  lightboxScale = newScale;

  if (lightboxScale === 1) {
    lightboxPanX = 0;
    lightboxPanY = 0;
  }

  applyLightboxTransform();
}

function zoomLightbox(delta, clientX, clientY) {
  const newScale =
    lightboxScale * (delta > 0 ? 1.2 : 1 / 1.2);

  zoomLightboxTo(newScale, clientX, clientY);
}

function initializeTelemetryDragging() {
  const panel = lightbox.querySelector(".timelapse-telemetry-panel");
  const header = panel.querySelector(".timelapse-telemetry-header");
  const toggle = panel.querySelector(".timelapse-telemetry-toggle");
  const content = panel.querySelector(".timelapse-telemetry-content");

  // Collapse / expand independently of dragging.
  toggle.addEventListener("click", () => {
    const collapsed = content.hidden = !content.hidden;

    toggle.textContent = collapsed ? "+" : "−";
    toggle.setAttribute(
      "aria-expanded",
      String(!collapsed)
    );
    toggle.setAttribute(
      "aria-label",
      collapsed ? "Expand telemetry" : "Collapse telemetry"
    );
  });

  let dragging = false;
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let initialLeft = 0;
  let initialTop = 0;

  header.addEventListener("pointerdown", event => {
    if (event.button !== 0 || event.target.closest("button")) {
      return;
    }

    const panelRect = panel.getBoundingClientRect();
    const lightboxRect = lightbox.getBoundingClientRect();

    dragging = true;
    pointerId = event.pointerId;

    startX = event.clientX;
    startY = event.clientY;

    initialLeft = panelRect.left - lightboxRect.left;
    initialTop = panelRect.top - lightboxRect.top;

    panel.style.left = `${initialLeft}px`;
    panel.style.top = `${initialTop}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";

    header.setPointerCapture(pointerId);
  });

  header.addEventListener("pointermove", event => {
    if (!dragging || event.pointerId !== pointerId) return;

    const maxX = Math.max(0, lightbox.clientWidth - panel.offsetWidth);
    const maxY = Math.max(0, lightbox.clientHeight - panel.offsetHeight);

    const x = initialLeft + event.clientX - startX;
    const y = initialTop + event.clientY - startY;

    panel.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
    panel.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
  });

  function stopDragging(event) {
    if (event.pointerId !== pointerId) return;

    dragging = false;
    pointerId = null;

    if (header.hasPointerCapture(event.pointerId)) {
      header.releasePointerCapture(event.pointerId);
    }
  }

  header.addEventListener("pointerup", stopDragging);
  header.addEventListener("pointercancel", stopDragging);
  header.addEventListener("lostpointercapture", stopDragging);
}

//
// Convert field names into readable labels
//
function telemetryLabel(key) {
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase());
}

//
// Format telemetry values based on naming conventions,
// not a fixed list of telemetry fields.
//
function formatTelemetryValue(value, key = "") {
  if (value === null || value === undefined) {
    return "—";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value !== "number") {
    return String(value);
  }

  const normalizedKey = String(key).toLowerCase();

  const formatNumber = number =>
    new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 3,
    }).format(number);

  // Exposure and other microsecond measurements
  if (normalizedKey.endsWith("_us")) {
    if (Math.abs(value) >= 1000000) {
      return `${formatNumber(value / 1000000)} s`;
    }

    if (Math.abs(value) >= 1000) {
      return `${formatNumber(value / 1000)} ms`;
    }

    return `${formatNumber(value)} µs`;
  }

  // Milliseconds
  if (normalizedKey.endsWith("_ms")) {
    return `${formatNumber(value)} ms`;
  }

  // Temperature
  if (normalizedKey.endsWith("_c")) {
    return `${formatNumber(value)} °C`;
  }

  if (normalizedKey.endsWith("_f")) {
    return `${formatNumber(value)} °F`;
  }

  // Angular measurements
  if (
    normalizedKey.endsWith("_altitude") ||
    normalizedKey.endsWith("_azimuth") ||
    normalizedKey.endsWith("_degrees") ||
    normalizedKey.endsWith("_deg")
  ) {
    return `${formatNumber(value)}°`;
  }

  // Explicit percentages
  if (
    normalizedKey.endsWith("_percent") ||
    normalizedKey.endsWith("_pct")
  ) {
    return `${formatNumber(value)}%`;
  }

  // Fractions that conventionally represent 0–100%
  if (
    normalizedKey.endsWith("_illumination") &&
    value >= 0 &&
    value <= 1
  ) {
    return `${formatNumber(value * 100)}%`;
  }

  return formatNumber(value);
}

//
// Render arbitrary JSON recursively
//
function renderTelemetryValue(value, key = "", path = "") {
  const container = document.createElement("div");
  container.className = "telemetry-value";

  if (value === null || typeof value !== "object") {
    container.textContent = formatTelemetryValue(value, key);
    return container;
  }

  const entries = Array.isArray(value)
    ? value.map((item, index) => [String(index), item])
    : Object.entries(value);

  if (entries.length === 0) {
    container.textContent = "No data";
    return container;
  }

  container.classList.add("telemetry-group");

  entries.forEach(([childKey, childValue]) => {
    const isArray = Array.isArray(value);

    const labelText = isArray
      ? `Item ${Number(childKey) + 1}`
      : telemetryLabel(childKey);

    const childPath = `${path}/${childKey}`;

    if (childValue !== null && typeof childValue === "object") {
      const section = document.createElement("details");
      section.className = "telemetry-section";
      section.dataset.telemetryPath = childPath;

      const summary = document.createElement("summary");
      summary.textContent = labelText;

      section.appendChild(summary);
      section.appendChild(
        renderTelemetryValue(childValue, childKey, childPath)
      );

      container.appendChild(section);
    } else {
      const row = document.createElement("div");
      row.className = "telemetry-row";

      const label = document.createElement("span");
      label.className = "telemetry-label";
      label.textContent = labelText;

      const displayValue = document.createElement("span");
      displayValue.className = "telemetry-data";
      displayValue.textContent =
        formatTelemetryValue(childValue, childKey);

      row.appendChild(label);
      row.appendChild(displayValue);
      container.appendChild(row);
    }
  });

  return container;
}

let telemetryRequestId = 0;
//Telemetry
async function updateLightboxTelemetry() {
  const requestId = ++telemetryRequestId;

  const content = lightbox?.querySelector(
    ".timelapse-telemetry-content"
  );

  if (!content || !dayImages.length) return;

  const frame = dayImages[currentFrame];

  content.textContent = "Loading telemetry...";

  try {
    const response = await fetch(
      `/api/timelapse/image/${frame.id}/telemetry`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // Ignore stale responses when navigating quickly.
    if (
      requestId !== telemetryRequestId ||
      !lightboxOpen
    ) {
      return;
    }

    content.replaceChildren();

    const metadata = data.metadata;

    if (
      metadata === null ||
      metadata === undefined ||
      (typeof metadata === "object" &&
        Object.keys(metadata).length === 0)
    ) {
      content.textContent =
        "No telemetry available for this capture.";
      return;
    }

    const rendered = renderTelemetryValue(metadata);

    // Restore previously expanded sections.
    rendered.querySelectorAll(".telemetry-section").forEach(section => {
      const path = section.dataset.telemetryPath;

      section.open = expandedTelemetrySections.has(path);

      section.addEventListener("toggle", () => {
        if (section.open) {
          expandedTelemetrySections.add(path);
        } else {
          expandedTelemetrySections.delete(path);
        }
      });
    });

    content.appendChild(rendered);

  } catch (error) {
    if (
      requestId !== telemetryRequestId ||
      !lightboxOpen
    ) {
      return;
    }

    console.error("Telemetry load failed:", error);
    content.textContent = "Unable to load telemetry.";
  }
}