const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");

class App {
  #map;
  #mapEvent;
  #mapZoomLevel = 12;
  #workOuts = [];
  constructor() {
    this._getPosition();

    form.addEventListener("submit", this._newWorkOut.bind(this));
    inputType.addEventListener("change", this._toggleElevation);
    containerWorkouts.addEventListener("click", this._MoveMarker.bind(this));

    this._getLocalStorage();
  }

  _getPosition() {
    navigator.geolocation.getCurrentPosition(
      this._loadMap.bind(this),
      function () {
        alert("cant read your location");
      }
    );
  }
  _loadMap(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    const coords = [latitude, longitude];
    this.#map = L.map("map").setView(coords, this.#mapZoomLevel);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on("click", this._showForm.bind(this));

    //if workout available on local storage populate its marker area

    this.#workOuts.forEach((data) => {
      this._renderWorkoutMarker(data);
    });
  }

  _showForm(mapEvt) {
    form.classList.remove("hidden");
    inputDistance.focus();
    this.#mapEvent = mapEvt;
  }

  _toggleElevation() {
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
  }

  _newWorkOut(e) {
    e.preventDefault();
    let distance = +inputDistance.value;
    let duration = +inputDuration.value;

    let type = inputType.value;

    const { lat, lng } = this.#mapEvent.latlng;

    let workout;
    const validateInput = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp));
    const allPositiveNumber = (...inputs) => inputs.every((inp) => inp > 0);

    if (type == "running") {
      let cadence = +inputCadence.value;
      if (
        !validateInput(distance, duration, cadence) ||
        !allPositiveNumber(distance, duration, cadence)
      )
        return alert("Inputs needs to be all positive and valid numbers");

      workout = new running([lat, lng], distance, duration, cadence);
    }

    if (type == "cycling") {
      let elevation = +inputElevation.value;
      if (
        !validateInput(distance, duration, elevation) ||
        !allPositiveNumber(distance, duration, elevation)
      )
        return alert("Inputs needs to be all positive and valid numbers");

      workout = new cycling([lat, lng], distance, duration, elevation);
    }
    this.#workOuts.push(workout);
    this._renderWorkoutMarker(workout);
    this._renderWorkout(workout);
    form.classList.add("hidden");
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        "";

    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
    
      <h2 class="workout__title">${
        workout.description
      }   &nbsp; &nbsp; &nbsp;&nbsp; &nbsp; &nbsp;&nbsp; &nbsp; &nbsp;&nbsp; &nbsp; &nbsp;&nbsp; &nbsp; &nbsp;&nbsp; &nbsp; &nbsp;&nbsp; &nbsp; &nbsp;&nbsp; &nbsp; &nbsp;<button class="btn--close-modal">x</button></h2>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>
  `;

    if (workout.type === "running")
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
    </li>
    `;

    if (workout.type === "cycling")
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
      </div>
    </li>
    `;

    form.insertAdjacentHTML("afterend", html);
  }

  _MoveMarker(e) {
    if (!this.#map) return;
    const elm = e.target.closest(".workout");
    if (!elm) return;
    if (e.target.classList.contains("btn--close-modal")) {
      const id = elm.dataset.id;
      const workout = this.#workOuts.find((a) => a.id == id);
      this.#map.eachLayer((layer) => {
        const latlng = layer._latlng;
        if (!latlng) return;
        const coords = [layer._latlng.lat, layer._latlng.lng];
        if (JSON.stringify(coords) == JSON.stringify(workout.coords)) {
          debugger;
          this.#map.removeLayer(layer);
        }
      });
      elm.remove();
      const index = this.#workOuts.findIndex((a) => a.id == id);
      this.#workOuts.splice(index, 1);
      this._setLocalStorage();
      return;
    }

    const workout = this.#workOuts.find((work) => work.id == elm.dataset.id);

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: { duration: 1 },
    });
  }

  _setLocalStorage() {
    localStorage.setItem("workouts", JSON.stringify(this.#workOuts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("workouts"));
    if (!data) return;
    this.#workOuts = data;
    this.#workOuts.forEach((data) => {
      this._renderWorkout(data);
    });
  }
}

class workOut {
  date = new Date();
  id = (Date.now() + "").slice(-10);
  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class running extends workOut {
  type = "running";
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class cycling extends workOut {
  type = "cycling";
  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.elevation = elevation;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

const app = new App();
