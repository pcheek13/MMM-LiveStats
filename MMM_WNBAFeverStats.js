/* global Module */

Module.register("MMM-WNBAFeverStats", {
  defaults: {
    favoriteTeamId: "ind",
    favoriteTeamDisplayName: "Indiana Fever",
    updateInterval: 5 * 60 * 1000,
    animationSpeed: 1000,
    maxUpcoming: 3,
    headerText: "Indiana Fever Live Stats"
  },

  start() {
    this.normalizeConfig();
    this.loaded = false;
    this.error = null;
    this.liveGame = null;
    this.upcomingGames = [];
    this.favoriteTeam = null;
    this.sendSocketNotification("CONFIG", this.config);
  },

  getHeader() {
    return this.config.headerText;
  },

  getStyles() {
    return ["MMM-WNBAFeverStats.css"];
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "GAME_DATA") {
      this.error = null;
      this.loaded = true;
      const fallbackTeam =
        this.favoriteTeam || {
          displayName: this.config.favoriteTeamDisplayName,
          logos: { primary: "" },
          record: null
        };
      const favoriteTeam = payload.favoriteTeam || fallbackTeam;
      this.favoriteTeam = {
        displayName: favoriteTeam.displayName || this.config.favoriteTeamDisplayName,
        logos: favoriteTeam.logos || fallbackTeam.logos,
        record:
          typeof favoriteTeam.record !== "undefined"
            ? favoriteTeam.record
            : fallbackTeam.record
      };
      this.liveGame = payload.liveGame;
      this.upcomingGames = payload.upcomingGames;
      this.updateDom(this.config.animationSpeed);
    } else if (notification === "GAME_ERROR") {
      this.error = payload.message;
      this.loaded = true;
      this.favoriteTeam = null;
      this.liveGame = null;
      this.upcomingGames = [];
      this.updateDom(this.config.animationSpeed);
    }
  },

  getDom() {
    const wrapper = document.createElement("div");
    wrapper.className = "mmm-wnba-fever-stats";

    if (!this.loaded) {
      wrapper.innerHTML = `<div class="loading">Loading ${this.config.favoriteTeamDisplayName} data...</div>`;
      return wrapper;
    }

    if (this.error) {
      wrapper.innerHTML = `<div class="error">${this.translate("ERROR")}: ${this.error}</div>`;
      return wrapper;
    }

    if (this.favoriteTeam) {
      wrapper.appendChild(this.renderFavoriteHeader());
    }

    if (this.liveGame) {
      wrapper.appendChild(this.renderLiveGame());
      wrapper.appendChild(
        this.renderUpcoming(`Upcoming ${this.config.favoriteTeamDisplayName} matchups:`)
      );
    } else {
      wrapper.appendChild(
        this.renderUpcoming(`No live games. Next ${this.config.favoriteTeamDisplayName} matchups:`)
      );
    }

    return wrapper;
  },

  renderLiveGame() {
    const container = document.createElement("div");
    container.className = "live-game";

    const title = document.createElement("div");
    title.className = "section-title";
    const favoriteName = this.liveGame.favorite && (this.liveGame.favorite.displayName || this.liveGame.favorite.shortDisplayName)
      ? this.liveGame.favorite.displayName || this.liveGame.favorite.shortDisplayName
      : this.config.favoriteTeamDisplayName;
    const opponentName = this.liveGame.opponent && (this.liveGame.opponent.displayName || this.liveGame.opponent.shortDisplayName)
      ? this.liveGame.opponent.displayName || this.liveGame.opponent.shortDisplayName
      : "Opponent";
    title.innerHTML = `<span class="status">${this.liveGame.status}</span> <span class="matchup">${favoriteName} vs ${opponentName}</span>`;
    container.appendChild(title);

    container.appendChild(this.renderScoreboard());

    if (this.liveGame.venue) {
      const venue = document.createElement("div");
      venue.className = "venue";
      venue.innerText = `${this.formatDateTime(this.liveGame.startTime)} • ${this.liveGame.venue}`;
      container.appendChild(venue);
    }

    const tableWrapper = document.createElement("div");
    tableWrapper.className = "stats-table-wrapper";

    const indicator = document.createElement("span");
    indicator.className = "live-indicator";
    indicator.setAttribute("aria-label", "Live game in progress");
    indicator.setAttribute("title", "Live game in progress");
    tableWrapper.appendChild(indicator);

    const table = document.createElement("table");
    table.className = "stats-table";

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    ["Player", "PTS", "REB", "AST", "STL"].forEach((label) => {
      const th = document.createElement("th");
      th.innerText = label;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    (this.liveGame.players || []).forEach((player) => {
      const row = document.createElement("tr");

      const nameCell = document.createElement("td");
      nameCell.className = "player";
      nameCell.innerText = player.name;
      row.appendChild(nameCell);

      const stats = [player.points, player.rebounds, player.assists, player.steals];
      stats.forEach((value) => {
        const td = document.createElement("td");
        td.innerText = value || "-";
        row.appendChild(td);
      });

      tbody.appendChild(row);
    });

    if (!tbody.hasChildNodes()) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 5;
      cell.className = "no-data";
      cell.innerText = "Live player stats are not currently available.";
      row.appendChild(cell);
      tbody.appendChild(row);
    }

    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    container.appendChild(tableWrapper);

    return container;
  },

  renderUpcoming(titleText) {
    const container = document.createElement("div");
    container.className = "upcoming";

    const title = document.createElement("div");
    title.className = "section-title";
    title.innerText = titleText || `Next ${this.config.favoriteTeamDisplayName} matchups:`;
    container.appendChild(title);

    const list = document.createElement("ul");
    list.className = "upcoming-list";

    const games = Array.isArray(this.upcomingGames)
      ? this.upcomingGames.slice(0, this.config.maxUpcoming)
      : [];

    if (games.length === 0) {
      const li = document.createElement("li");
      li.className = "no-data";
      li.innerText = "No upcoming games found.";
      list.appendChild(li);
    } else {
      games.forEach((game) => {
        const li = document.createElement("li");
        li.className = "upcoming-item";

        const prefix = game.isHome ? "vs" : "@";

        if (game.opponentLogo) {
          const logo = document.createElement("img");
          logo.className = "team-logo upcoming-logo";
          logo.src = game.opponentLogo;
          logo.alt = `${game.opponent} logo`;
          li.appendChild(logo);
        }

        const textWrapper = document.createElement("div");
        textWrapper.className = "upcoming-text";
        textWrapper.innerHTML = `<span class="opponent">${prefix} ${game.opponent}</span><span class="datetime">${this.formatDateTime(game.date)}</span>`;
        li.appendChild(textWrapper);

        if (game.venue) {
          const venue = document.createElement("div");
          venue.className = "venue";
          venue.innerText = game.venue;
          li.appendChild(venue);
        }

        list.appendChild(li);
      });
    }

    container.appendChild(list);
    return container;
  },

  renderFavoriteHeader() {
    const container = document.createElement("div");
    container.className = "favorite-team";

    const logoUrl = this.getLogoUrl(this.favoriteTeam && this.favoriteTeam.logos && this.favoriteTeam.logos.primary);
    if (logoUrl) {
      const logo = document.createElement("img");
      logo.className = "team-logo favorite-logo";
      logo.src = logoUrl;
      logo.alt = `${this.favoriteTeam.displayName} logo`;
      container.appendChild(logo);
    }

    const text = document.createElement("div");
    text.className = "favorite-team-text";

    const name = document.createElement("div");
    name.className = "favorite-team-name";
    name.innerText = this.favoriteTeam.displayName || this.config.favoriteTeamDisplayName;
    text.appendChild(name);

    const record = this.favoriteTeam.record || null;
    const recordEl = document.createElement("div");
    recordEl.className = "favorite-team-record";
    const wins = record && typeof record.wins === "number" ? record.wins : null;
    const losses = record && typeof record.losses === "number" ? record.losses : null;
    const summary = record && record.summary ? record.summary : "";
    const label = wins !== null && losses !== null ? `${wins}-${losses}` : summary || "--";
    recordEl.innerText = `Record: ${label}`;
    text.appendChild(recordEl);

    container.appendChild(text);

    return container;
  },

  renderScoreboard() {
    const scoreboard = document.createElement("div");
    scoreboard.className = "scoreboard";

    scoreboard.appendChild(this.renderScoreboardTeam(this.liveGame.favorite, true));

    const status = document.createElement("div");
    status.className = "scoreboard-status";
    status.innerText = this.liveGame.status;
    scoreboard.appendChild(status);

    scoreboard.appendChild(this.renderScoreboardTeam(this.liveGame.opponent, false));

    return scoreboard;
  },

  renderScoreboardTeam(team, isFavorite) {
    const container = document.createElement("div");
    container.className = `scoreboard-team ${isFavorite ? "favorite" : "opponent"}`;

    const logoUrl = this.getLogoUrl(team && team.logo);
    if (logoUrl) {
      const logo = document.createElement("img");
      logo.className = "team-logo scoreboard-logo";
      logo.src = logoUrl;
      logo.alt = `${team && (team.displayName || team.shortDisplayName || "Team")} logo`;
      container.appendChild(logo);
    }

    const text = document.createElement("div");
    text.className = "scoreboard-text";

    const name = document.createElement("div");
    name.className = "team-name";
    name.innerText = team && (team.shortDisplayName || team.displayName) ? (team.shortDisplayName || team.displayName) : "Team";
    text.appendChild(name);

    const score = document.createElement("div");
    score.className = "team-score";
    score.innerText = team && team.score ? team.score : "0";
    text.appendChild(score);

    container.appendChild(text);

    return container;
  },

  getLogoUrl(value) {
    if (!value) {
      return "";
    }

    if (typeof value === "string") {
      return value;
    }

    if (value && value.href) {
      return value.href;
    }

    return "";
  },

  normalizeConfig() {
    const teamConfig = this.config.team || {};

    if (!this.config.favoriteTeamId) {
      this.config.favoriteTeamId = teamConfig.id || this.defaults.favoriteTeamId;
    }

    if (!this.config.favoriteTeamDisplayName) {
      this.config.favoriteTeamDisplayName = teamConfig.displayName || this.defaults.favoriteTeamDisplayName;
    }

    const upcomingLimit = parseInt(this.config.maxUpcoming, 10);
    if (Number.isNaN(upcomingLimit) || upcomingLimit <= 0) {
      this.config.maxUpcoming = this.defaults.maxUpcoming;
    } else {
      this.config.maxUpcoming = upcomingLimit;
    }

    const defaultHeader = this.defaults.headerText;
    if (
      (!this.config.headerText || this.config.headerText === defaultHeader) &&
      this.config.favoriteTeamDisplayName &&
      this.config.favoriteTeamDisplayName !== this.defaults.favoriteTeamDisplayName
    ) {
      this.config.headerText = `${this.config.favoriteTeamDisplayName} Live Stats`;
    }
  },

  formatDateTime(dateString) {
    if (!dateString) {
      return "";
    }

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return dateString;
    }

    const options = {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    };

    return date.toLocaleString(undefined, options);
  }
});
