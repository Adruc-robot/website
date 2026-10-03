const viewer = document.getElementById("timelapseViewer");
const title = document.getElementById("timelapseTitle");

let monthAnchor = new Date();
monthAnchor.setDate(1);

function dateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function renderMonth() {
  viewer.innerHTML = "";

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

  title.textContent = monthAnchor.toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  const firstDay = new Date(year, month, 1);
  const firstDayOfWeek = firstDay.getDay();

  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDayOfWeek);

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
   } else {
      cell.classList.add("empty");
   }
    grid.appendChild(cell);
  }
}

renderMonth().catch(error => {
  console.error(error);

  document.getElementById("timelapseStatus").textContent =
    "Unable to load time-lapse calendar.";
});