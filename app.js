(function () {
  "use strict";

  const storage = {
    get: function (key, fallback) {
      try {
        const saved = localStorage.getItem(key);
        return saved === null ? fallback : JSON.parse(saved);
      } catch (error) {
        return fallback;
      }
    },
    set: function (key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
      }
    }
  };

  const savedPlants = storage.get("plants", null);
  const plants = savedPlants || PLANTS.map(function (plant) {
    return Object.assign({}, plant, {
      lastWateredAt: Date.now() - plant.daysAgo * 86400000
    });
  });
  let activeFilter = "all";

  document.title = STARTUP.name;
  document.getElementById("today-label").textContent = new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(new Date());

  function showView() {
    const requested = (window.location.hash || "#home").slice(1);
    const views = document.querySelectorAll("[data-view]");
    const exists = Array.prototype.some.call(views, function (view) {
      return view.id === requested;
    });
    const current = exists ? requested : "home";

    views.forEach(function (view) {
      view.hidden = view.id !== current;
    });

    document.querySelectorAll("nav a").forEach(function (link) {
      if (link.getAttribute("href") === "#" + current) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", showView);

  const grid = document.getElementById("plant-grid");
  const favoriteGrid = document.getElementById("favorite-grid");
  const wateringList = document.getElementById("watering-list");
  const searchBox = document.getElementById("search-box");
  const emptyMessage = document.getElementById("empty-message");
  const resultCount = document.getElementById("result-count");

  function daysSinceWatered(plant) {
    return Math.floor((Date.now() - plant.lastWateredAt) / 86400000);
  }

  function isDue(plant) {
    return daysSinceWatered(plant) >= plant.interval;
  }

  function savePlants() {
    storage.set("plants", plants);
  }

  function createPlantCard(plant, compact) {
    const card = document.createElement("article");
    card.className = "plant-card" + (compact ? " plant-card-compact" : "");
    const photo = document.createElement("div");
    photo.className = "plant-photo photo-" + plant.color;
    const image = document.createElement("img");
    image.src = plant.image || PLANTS[0].image;
    image.alt = plant.type + " plant";
    image.loading = "lazy";
    image.addEventListener("error", function () {
      image.hidden = true;
    });
    photo.appendChild(image);

    const info = document.createElement("div");
    info.className = "plant-info";
    const status = document.createElement("span");
    status.className = "plant-status " + (isDue(plant) ? "status-due" : "status-happy");
    status.textContent = isDue(plant) ? "Ready for a drink" : "Looking good";
    const name = document.createElement("h3");
    name.textContent = plant.name;
    const type = document.createElement("p");
    type.className = "plant-type";
    type.textContent = plant.type;
    const waterRow = document.createElement("div");
    waterRow.className = "water-row";
    const timing = document.createElement("span");
    const days = daysSinceWatered(plant);
    timing.textContent = days === 0 ? "Watered today" : "Watered " + days + "d ago";
    waterRow.appendChild(timing);

    if (!compact) {
      const waterButton = document.createElement("button");
      waterButton.type = "button";
      waterButton.className = "water-button";
      waterButton.textContent = isDue(plant) ? "Watered" : "Water now";
      waterButton.setAttribute("aria-label", "Mark " + plant.name + " as watered");
      waterButton.addEventListener("click", function () {
        plant.lastWateredAt = Date.now();
        savePlants();
        render();
      });
      waterRow.appendChild(waterButton);
    }

    info.append(status, name, type, waterRow);
    card.append(photo, info);
    return card;
  }

  function renderDashboard() {
    const duePlants = plants.filter(isDue);
    const list = duePlants.length ? duePlants.slice(0, 3) : plants.slice(0, 2);
    const summary = document.getElementById("watering-summary");
    summary.textContent = duePlants.length
      ? duePlants.length + (duePlants.length === 1 ? " plant is" : " plants are") + " ready for a little water."
      : "Everyone is looking good. Take a moment to check their leaves.";
    wateringList.replaceChildren();
    list.forEach(function (plant) {
      const row = document.createElement("div");
      row.className = "watering-item";
      const thumb = document.createElement("img");
      thumb.src = plant.image || PLANTS[0].image;
      thumb.alt = "";
      thumb.addEventListener("error", function () { thumb.hidden = true; });
      const copy = document.createElement("div");
      copy.className = "watering-copy";
      const name = document.createElement("strong");
      name.textContent = plant.name;
      const type = document.createElement("span");
      type.textContent = plant.type;
      copy.append(name, type);
      const action = document.createElement(isDue(plant) ? "button" : "span");
      action.className = isDue(plant) ? "task-water" : "mini-status";
      action.textContent = isDue(plant) ? "Water" : "Soon";
      if (isDue(plant)) {
        action.type = "button";
        action.setAttribute("aria-label", "Mark " + plant.name + " as watered");
        action.addEventListener("click", function () {
          plant.lastWateredAt = Date.now();
          savePlants();
          render();
        });
      }
      row.append(thumb, copy, action);
      wateringList.appendChild(row);
    });

    if (!list.length) {
      const note = document.createElement("p");
      note.className = "all-clear";
      note.textContent = "Your garden is ready for its next check-in.";
      wateringList.appendChild(note);
    }
    favoriteGrid.replaceChildren.apply(favoriteGrid, plants.slice(0, 3).map(function (plant) {
      return createPlantCard(plant, true);
    }));
  }

  function renderPlants() {
    const query = searchBox.value.trim().toLowerCase();
    const matches = plants.filter(function (plant) {
      const matchesQuery = (plant.name + " " + plant.type).toLowerCase().indexOf(query) !== -1;
      const matchesFilter = activeFilter === "all" || (activeFilter === "due" ? isDue(plant) : !isDue(plant));
      return matchesQuery && matchesFilter;
    });
    grid.replaceChildren.apply(grid, matches.map(function (plant) {
      return createPlantCard(plant, false);
    }));
    emptyMessage.hidden = matches.length > 0;
    resultCount.textContent = matches.length + (matches.length === 1 ? " plant" : " plants");
  }

  function render() {
    renderDashboard();
    renderPlants();
  }

  searchBox.addEventListener("input", renderPlants);

  document.querySelectorAll(".filter-button").forEach(function (button) {
    button.addEventListener("click", function () {
      activeFilter = button.dataset.filter;
      document.querySelectorAll(".filter-button").forEach(function (filterButton) {
        const selected = filterButton === button;
        filterButton.classList.toggle("is-active", selected);
        filterButton.setAttribute("aria-pressed", selected ? "true" : "false");
      });
      renderPlants();
    });
  });

  const addForm = document.getElementById("add-plant-form");
  document.getElementById("show-add-form").addEventListener("click", function () {
    addForm.hidden = !addForm.hidden;
    if (!addForm.hidden) addForm.elements.name.focus();
  });
  document.querySelector(".welcome-row .button").addEventListener("click", function () {
    window.setTimeout(function () {
      addForm.hidden = false;
      addForm.elements.name.focus();
    }, 0);
  });
  addForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const formData = new FormData(addForm);
    const plant = {
      id: "custom-" + Date.now(),
      name: formData.get("name").trim(),
      type: formData.get("type").trim(),
      interval: Number(formData.get("interval")),
      lastWateredAt: Date.now(),
      image: PLANTS[plants.length % PLANTS.length].image,
      color: PLANTS[plants.length % PLANTS.length].color
    };
    plants.unshift(plant);
    savePlants();
    addForm.reset();
    addForm.hidden = true;
    searchBox.value = "";
    activeFilter = "all";
    document.querySelectorAll(".filter-button").forEach(function (button) {
      const selected = button.dataset.filter === "all";
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    render();
  });

  render();
  showView();
})();
