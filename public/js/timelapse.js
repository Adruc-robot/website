const viewer = document.getElementById("timelapseViewer");
const title = document.getElementById("timelapseTitle");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const monthBtn = document.getElementById("monthBtn");
const weekBtn = document.getElementById("weekBtn");
const dayBtn = document.getElementById("dayBtn");

let monthAnchor = new Date();
monthAnchor.setDate(1);
let selectedDate = null;

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

async function renderMonth() {
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

  nextBtn.disabled = viewingCurrentMonth();
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

async function renderDay() {
  viewer.innerHTML = "";

  monthBtn.classList.remove("active");
  weekBtn.classList.remove("active");
  dayBtn.classList.add("active");

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
  monthAnchor.setMonth(monthAnchor.getMonth() - 1);

  renderMonth().catch(error => {
    console.error(error);

    document.getElementById("timelapseStatus").textContent =
      "Unable to load time-lapse calendar.";
  });
});

nextBtn.addEventListener("click", () => {
  if (viewingCurrentMonth()) {
    return;
  }

  monthAnchor.setMonth(monthAnchor.getMonth() + 1);

  renderMonth().catch(error => {
    console.error(error);

    document.getElementById("timelapseStatus").textContent =
      "Unable to load time-lapse calendar.";
  });
});

renderMonth().catch(error => {
  console.error(error);

  document.getElementById("timelapseStatus").textContent =
    "Unable to load time-lapse calendar.";
});