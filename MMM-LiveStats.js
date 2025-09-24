/* global Module */

const LEAGUE_DEFAULTS = {
  ncaa_mbb: {
    name: "NCAA Men's Basketball",
    sportPath: "basketball/mens-college-basketball",
    favoriteTeamId: "282",
    favoriteTeamDisplayName: "Indiana State Sycamores",
    favoriteTeamShortDisplayName: "Indiana State"
  },
  nba: {
    name: "NBA",
    sportPath: "basketball/nba",
    favoriteTeamId: "ind",
    favoriteTeamDisplayName: "Indiana Pacers",
    favoriteTeamShortDisplayName: "Pacers"
  },
  nhl: {
    name: "NHL",
    sportPath: "hockey/nhl",
    favoriteTeamId: "chi",
    favoriteTeamDisplayName: "Chicago Blackhawks",
    favoriteTeamShortDisplayName: "Blackhawks"
  },
  wnba: {
    name: "WNBA",
    sportPath: "basketball/wnba",
    favoriteTeamId: "ind",
    favoriteTeamDisplayName: "Indiana Fever",
    favoriteTeamShortDisplayName: "Indiana Fever"
  }
};

const TEAM_PRESETS = {
  ncaa_mbb: {
    indiana_state: {
      id: "282",
      displayName: "Indiana State Sycamores",
      shortDisplayName: "Indiana State"
    },
    purdue: {
      id: "2509",
      displayName: "Purdue Boilermakers",
      shortDisplayName: "Purdue"
    },
    kansas: {
      id: "2305",
      displayName: "Kansas Jayhawks",
      shortDisplayName: "Kansas"
    },
    duke: {
      id: "150",
      displayName: "Duke Blue Devils",
      shortDisplayName: "Duke"
    },
    north_carolina: {
      id: "153",
      displayName: "North Carolina Tar Heels",
      shortDisplayName: "North Carolina"
    },
    gonzaga: {
      id: "2250",
      displayName: "Gonzaga Bulldogs",
      shortDisplayName: "Gonzaga"
    },
    uconn: {
      id: "41",
      displayName: "UConn Huskies",
      shortDisplayName: "UConn"
    }
  },
  nba: {
    indiana_pacers: {
      id: "ind",
      displayName: "Indiana Pacers",
      shortDisplayName: "Pacers"
    },
    boston_celtics: {
      id: "bos",
      displayName: "Boston Celtics",
      shortDisplayName: "Celtics"
    },
    denver_nuggets: {
      id: "den",
      displayName: "Denver Nuggets",
      shortDisplayName: "Nuggets"
    },
    los_angeles_lakers: {
      id: "lal",
      displayName: "Los Angeles Lakers",
      shortDisplayName: "Lakers"
    },
    golden_state_warriors: {
      id: "gs",
      displayName: "Golden State Warriors",
      shortDisplayName: "Warriors"
    },
    miami_heat: {
      id: "mia",
      displayName: "Miami Heat",
      shortDisplayName: "Heat"
    },
    new_york_knicks: {
      id: "ny",
      displayName: "New York Knicks",
      shortDisplayName: "Knicks"
    }
  },
  nhl: {
    chicago_blackhawks: {
      id: "chi",
      displayName: "Chicago Blackhawks",
      shortDisplayName: "Blackhawks"
    },
    detroit_red_wings: {
      id: "det",
      displayName: "Detroit Red Wings",
      shortDisplayName: "Red Wings"
    },
    colorado_avalanche: {
      id: "col",
      displayName: "Colorado Avalanche",
      shortDisplayName: "Avalanche"
    },
    toronto_maple_leafs: {
      id: "tor",
      displayName: "Toronto Maple Leafs",
      shortDisplayName: "Maple Leafs"
    },
    boston_bruins: {
      id: "bos",
      displayName: "Boston Bruins",
      shortDisplayName: "Bruins"
    },
    edmonton_oilers: {
      id: "edm",
      displayName: "Edmonton Oilers",
      shortDisplayName: "Oilers"
    },
    vegas_golden_knights: {
      id: "vgk",
      displayName: "Vegas Golden Knights",
      shortDisplayName: "Golden Knights"
    }
  },
  wnba: {
    indiana_fever: {
      id: "ind",
      displayName: "Indiana Fever",
      shortDisplayName: "Indiana Fever"
    },
    atlanta_dream: {
      id: "atl",
      displayName: "Atlanta Dream",
      shortDisplayName: "Dream"
    },
    chicago_sky: {
      id: "chi",
      displayName: "Chicago Sky",
      shortDisplayName: "Sky"
    },
    connecticut_sun: {
      id: "conn",
      displayName: "Connecticut Sun",
      shortDisplayName: "Sun"
    },
    dallas_wings: {
      id: "dal",
      displayName: "Dallas Wings",
      shortDisplayName: "Wings"
    },
    las_vegas_aces: {
      id: "lv",
      displayName: "Las Vegas Aces",
      shortDisplayName: "Aces"
    },
    los_angeles_sparks: {
      id: "la",
      displayName: "Los Angeles Sparks",
      shortDisplayName: "Sparks"
    },
    minnesota_lynx: {
      id: "min",
      displayName: "Minnesota Lynx",
      shortDisplayName: "Lynx"
    },
    new_york_liberty: {
      id: "ny",
      displayName: "New York Liberty",
      shortDisplayName: "Liberty"
    },
    phoenix_mercury: {
      id: "phx",
      displayName: "Phoenix Mercury",
      shortDisplayName: "Mercury"
    },
    seattle_storm: {
      id: "sea",
      displayName: "Seattle Storm",
      shortDisplayName: "Storm"
    },
    washington_mystics: {
      id: "wsh",
      displayName: "Washington Mystics",
      shortDisplayName: "Mystics"
    }
  }
};

Module.register("MMM-LiveStats", {
  defaults: {
    league: "wnba",
    updateInterval: 5 * 60 * 1000,
    animationSpeed: 1000,
    maxUpcoming: 3,
    headerText: "",
    team: {},
    teamPreset: "indiana_fever",
    leagueFavorites: {
      wnba: "indiana_fever"
    },
    availableLeagues: [],
    enableLeagueSwitch: true
  },

  start() {
    this.normalizeConfig();
    this.loaded = false;
    this.error = null;
    this.liveGame = null;
    this.upcomingGames = [];
    this.favoriteTeam = null;
    this.activeStatsTeam = "favorite";
    this.availableLeagueOrder = this.config.availableLeagueOrder;
    this.resolvedLeagueFavorites = this.resolvedLeagueFavorites || {};
    this.sendSocketNotification("CONFIG", this.config);
  },

  getHeader() {
    return this.config.headerText;
  },

  getStyles() {
    return ["MMM-LiveStats.css"];
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "GAME_DATA") {
      this.error = null;
      this.loaded = true;
      const previousLiveGame = this.liveGame;
      const fallbackTeam =
        this.favoriteTeam || {
          displayName: this.config.favoriteTeamDisplayName,
          shortDisplayName: this.config.favoriteTeamShortDisplayName,
          logos: { primary: "" },
          record: null
        };
      const favoriteTeam = payload.favoriteTeam || fallbackTeam;
      this.favoriteTeam = {
        displayName: favoriteTeam.displayName || this.config.favoriteTeamDisplayName,
        shortDisplayName: favoriteTeam.shortDisplayName || favoriteTeam.displayName || this.config.favoriteTeamShortDisplayName,
        logos: favoriteTeam.logos || fallbackTeam.logos,
        record:
          typeof favoriteTeam.record !== "undefined"
            ? favoriteTeam.record
            : fallbackTeam.record
      };
      this.liveGame = payload.liveGame;
      if (!this.liveGame || !previousLiveGame || this.liveGame.eventId !== previousLiveGame.eventId) {
        this.activeStatsTeam = "favorite";
      }
      this.upcomingGames = payload.upcomingGames || [];
      this.updateDom(this.config.animationSpeed);
    } else if (notification === "GAME_ERROR") {
      this.error = payload.message;
      this.loaded = true;
      this.favoriteTeam = null;
      this.liveGame = null;
      this.upcomingGames = [];
      this.activeStatsTeam = "favorite";
      this.updateDom(this.config.animationSpeed);
    }
  },

  getDom() {
    const wrapper = document.createElement("div");
    wrapper.className = "mmm-live-stats";

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
        this.renderUpcoming(`Upcoming ${this.config.favoriteTeamShortDisplayName} games:`)
      );
    } else {
      wrapper.appendChild(this.renderNoLiveGameMessage());
      wrapper.appendChild(
        this.renderUpcoming(`Next ${this.config.favoriteTeamShortDisplayName} games:`)
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
      const start = this.formatDateTime(this.liveGame.startTime);
      venue.innerText = start ? `${start} • ${this.liveGame.venue}` : this.liveGame.venue;
      container.appendChild(venue);
    }

    const tableWrapper = document.createElement("div");
    tableWrapper.className = "stats-table-wrapper";

    const controls = document.createElement("div");
    controls.className = "stats-controls";

    const activeKey = this.getActiveStatsTeamKey();
    const activeTeam = this.getLiveGameTeamByKey(activeKey);
    const activeName = this.getTeamName(activeTeam, activeKey);

    const currentLabel = document.createElement("div");
    currentLabel.className = "stats-current-team";
    currentLabel.innerText = `${activeName} player stats`;
    controls.appendChild(currentLabel);

    if (this.liveGame && this.liveGame.favorite && this.liveGame.opponent) {
      const nextKey = activeKey === "favorite" ? "opponent" : "favorite";
      const otherTeam = this.getLiveGameTeamByKey(nextKey);
      const otherName = this.getTeamName(otherTeam, nextKey);
      const toggleButton = document.createElement("button");
      toggleButton.type = "button";
      toggleButton.className = "stats-toggle-button";
      toggleButton.innerText = `Show ${otherName} stats`;
      toggleButton.setAttribute("aria-label", `Show ${otherName} stats`);
      toggleButton.addEventListener("click", () => {
        this.toggleLiveStatsTeam();
      });
      controls.appendChild(toggleButton);
    }

    tableWrapper.appendChild(controls);

    const statColumns = this.getLiveStatColumns();

    const table = document.createElement("table");
    table.className = "stats-table";

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    const headers = ["Player", ...statColumns.map((column) => column.label || column.key.toUpperCase())];
    headers.forEach((label) => {
      const th = document.createElement("th");
      th.innerText = label;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    const players = this.getActiveLivePlayers();
    players.forEach((player) => {
      const row = document.createElement("tr");

      const nameCell = document.createElement("td");
      nameCell.className = "player";
      const jerseyLabel = player.jersey ? `#${player.jersey}` : "";
      nameCell.innerText = jerseyLabel ? `${jerseyLabel} ${player.name}` : player.name;
      row.appendChild(nameCell);

      statColumns.forEach((column) => {
        const value = player.stats ? player.stats[column.key] : "";
        const td = document.createElement("td");
        td.innerText = value || "-";
        row.appendChild(td);
      });

      tbody.appendChild(row);
    });

    if (!tbody.hasChildNodes()) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 1 + statColumns.length;
      cell.className = "no-data";
      const activeTeamName = this.getTeamName(activeTeam, activeKey);
      cell.innerText = `Live player stats are not currently available for ${activeTeamName}.`;
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
    title.innerText = titleText || `Next ${this.config.favoriteTeamShortDisplayName} games:`;
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
        textWrapper.innerHTML = `<span class="opponent">${prefix} ${game.opponent}</span><span class="datetime">${this.formatDateTime(
          game.date
        )}</span>`;
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
    container.className = "favorite-header";

    const favoriteInfo = document.createElement("div");
    favoriteInfo.className = "favorite-team";

    const favoriteTeamData = this.favoriteTeam || {};
    const favoriteDisplayName =
      favoriteTeamData.displayName || this.config.favoriteTeamDisplayName || "Favorite team";
    const logoUrl = this.getLogoUrl(favoriteTeamData.logos && favoriteTeamData.logos.primary);
    const shouldShowIndicator = Boolean(this.liveGame);
    if (logoUrl || shouldShowIndicator) {
      const logoWrapper = document.createElement("div");
      logoWrapper.className = "favorite-logo-wrapper";

      if (logoUrl) {
        const logo = document.createElement("img");
        logo.className = "team-logo favorite-logo";
        logo.src = logoUrl;
        logo.alt = `${favoriteDisplayName} logo`;
        logoWrapper.appendChild(logo);
      }

      if (shouldShowIndicator) {
        const indicator = document.createElement("span");
        indicator.className = "live-indicator";
        indicator.setAttribute("aria-label", "Live game in progress");
        indicator.setAttribute("title", "Live game in progress");
        logoWrapper.appendChild(indicator);
      }

      favoriteInfo.appendChild(logoWrapper);
    }

    const text = document.createElement("div");
    text.className = "favorite-team-text";

    const name = document.createElement("div");
    name.className = "favorite-team-name";
    name.innerText = favoriteDisplayName;
    text.appendChild(name);

    const record = favoriteTeamData.record || null;
    const recordEl = document.createElement("div");
    recordEl.className = "favorite-team-record";
    const wins = record && typeof record.wins === "number" ? record.wins : null;
    const losses = record && typeof record.losses === "number" ? record.losses : null;
    const summary = record && record.summary ? record.summary : "";
    const label = wins !== null && losses !== null ? `${wins}-${losses}` : summary || "--";
    recordEl.innerText = `Record: ${label}`;
    text.appendChild(recordEl);

    favoriteInfo.appendChild(text);

    container.appendChild(favoriteInfo);

    if (this.shouldShowLeagueSwitch()) {
      container.appendChild(this.renderLeagueSwitch());
    }

    return container;
  },

  renderLeagueSwitch() {
    const container = document.createElement("div");
    container.className = "league-switch";

    const selectId = `${this.identifier || "mmm-live-stats"}-league-switch`;

    const label = document.createElement("label");
    label.className = "league-switch-label";
    label.setAttribute("for", selectId);
    label.innerText = "League";
    container.appendChild(label);

    const select = document.createElement("select");
    select.className = "league-switch-select";
    select.id = selectId;
    select.setAttribute("aria-label", "Select league");

    (Array.isArray(this.availableLeagueOrder) ? this.availableLeagueOrder : []).forEach((league) => {
      const option = document.createElement("option");
      option.value = league;
      option.innerText = this.getLeagueName(league);
      if (league === this.config.league) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    select.addEventListener("change", (event) => {
      const value = event.target.value;
      this.changeLeague(value);
    });

    container.appendChild(select);

    return container;
  },

  renderNoLiveGameMessage() {
    const message = document.createElement("div");
    message.className = "no-live-game";
    message.innerText = "No live game right now.";
    return message;
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
    name.innerText = team && (team.shortDisplayName || team.displayName)
      ? team.shortDisplayName || team.displayName
      : "Team";
    text.appendChild(name);

    const score = document.createElement("div");
    score.className = "team-score";
    score.innerText = team && typeof team.score !== "undefined" ? team.score : "0";
    text.appendChild(score);

    container.appendChild(text);

    return container;
  },

  getActiveStatsTeamKey() {
    return this.activeStatsTeam === "opponent" ? "opponent" : "favorite";
  },

  getLiveGameTeamByKey(key) {
    if (!this.liveGame) {
      return null;
    }

    if (key === "opponent") {
      return this.liveGame.opponent || null;
    }

    return this.liveGame.favorite || null;
  },

  getTeamName(team, key) {
    if (team && (team.displayName || team.shortDisplayName)) {
      return team.displayName || team.shortDisplayName;
    }

    if (key === "favorite") {
      return this.config.favoriteTeamDisplayName || "Favorite";
    }

    return "Opponent";
  },

  getActiveLivePlayers() {
    if (!this.liveGame || !this.liveGame.players) {
      return [];
    }

    const key = this.getActiveStatsTeamKey();
    const players = this.liveGame.players[key];
    if (!Array.isArray(players)) {
      return [];
    }

    const limit = this.getLivePlayerLimit();
    return players.slice(0, limit);
  },

  getLiveStatColumns() {
    if (this.liveGame && Array.isArray(this.liveGame.statColumns) && this.liveGame.statColumns.length > 0) {
      return this.liveGame.statColumns;
    }

    if ((this.config.league || "").toLowerCase() === "nhl") {
      return [
        { key: "goals", label: "G" },
        { key: "assists", label: "A" },
        { key: "points", label: "P" },
        { key: "shots", label: "SOG" },
        { key: "pim", label: "PIM" }
      ];
    }

    return [
      { key: "points", label: "PTS" },
      { key: "rebounds", label: "REB" },
      { key: "assists", label: "AST" },
      { key: "steals", label: "STL" },
      { key: "turnovers", label: "TO" },
      { key: "fouls", label: "PF" }
    ];
  },

  getLivePlayerLimit() {
    const league = (this.config.league || "").toLowerCase();
    if (this.isBasketballLeague(league)) {
      return 8;
    }

    return 10;
  },

  isBasketballLeague(league) {
    const normalized = (league || "").toLowerCase();
    return normalized === "nba" || normalized === "wnba" || normalized === "ncaa_mbb";
  },

  toggleLiveStatsTeam() {
    this.activeStatsTeam = this.getActiveStatsTeamKey() === "favorite" ? "opponent" : "favorite";
    this.updateDom(300);
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
    let configuredLeague = (this.config.league || this.defaults.league || "wnba").toLowerCase();
    const favorites = this.normalizeLeagueFavorites(this.config.leagueFavorites);
    this.resolvedLeagueFavorites = favorites;

    const favoriteLeagues = Object.keys(favorites);
    const normalizedOrder = this.normalizeLeagueOrder(this.config.availableLeagues, favoriteLeagues);
    this.config.availableLeagueOrder = normalizedOrder.length ? normalizedOrder : favoriteLeagues;
    this.config.availableLeagues = [...this.config.availableLeagueOrder];

    if (!favoriteLeagues.includes(configuredLeague)) {
      configuredLeague = this.config.availableLeagueOrder[0] || favoriteLeagues[0] || configuredLeague;
      this.config.league = configuredLeague;
    }

    this.config.league = configuredLeague;

    const leagueDefaults = LEAGUE_DEFAULTS[configuredLeague] || LEAGUE_DEFAULTS[this.defaults.league] || {};
    this.config.leagueName = leagueDefaults.name || "Basketball";
    this.config.sportPath = leagueDefaults.sportPath || "basketball/mens-college-basketball";

    this.config.leagueFavorites = Object.fromEntries(
      Object.entries(favorites).map(([league, data]) => [league, data.key])
    );

    const presetTeam = favorites[configuredLeague] || this.resolveTeamPreset(configuredLeague, this.config.teamPreset);
    let teamConfig = (presetTeam && presetTeam.team) || {};

    if (presetTeam && presetTeam.key) {
      this.config.teamPreset = presetTeam.key;
    } else {
      this.config.teamPreset = "";
      if (this.config.team && Object.keys(this.config.team).length > 0) {
        teamConfig = { ...this.config.team };
      }
    }

    if (!teamConfig || Object.keys(teamConfig).length === 0) {
      teamConfig = { ...((LEAGUE_DEFAULTS[configuredLeague] && {
        id: LEAGUE_DEFAULTS[configuredLeague].favoriteTeamId,
        displayName: LEAGUE_DEFAULTS[configuredLeague].favoriteTeamDisplayName,
        shortDisplayName: LEAGUE_DEFAULTS[configuredLeague].favoriteTeamShortDisplayName
      }) || {}) };
    }

    const fallbackDisplayName = leagueDefaults.favoriteTeamDisplayName || "Favorite Team";
    const fallbackShortDisplayName = leagueDefaults.favoriteTeamShortDisplayName || fallbackDisplayName;

    this.config.favoriteTeamId = teamConfig.id || leagueDefaults.favoriteTeamId;
    this.config.favoriteTeamDisplayName = teamConfig.displayName || fallbackDisplayName;
    this.config.favoriteTeamShortDisplayName =
      teamConfig.shortDisplayName || fallbackShortDisplayName || this.config.favoriteTeamDisplayName;

    this.config.team = { ...teamConfig };

    const upcomingLimit = parseInt(this.config.maxUpcoming, 10);
    this.config.maxUpcoming = Number.isNaN(upcomingLimit) || upcomingLimit < 1 ? this.defaults.maxUpcoming : upcomingLimit;

    if (!this.config.headerText) {
      const teamName = this.config.favoriteTeamDisplayName || "Live Stats";
      this.config.headerText = `${teamName} Live Stats`;
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
  },

  normalizeLeagueOrder(value, allowedLeagues) {
    const allowedSet = Array.isArray(allowedLeagues) && allowedLeagues.length > 0 ? new Set(allowedLeagues) : null;

    const normalizeList = (list) =>
      list
        .map((league) => String(league || "").toLowerCase())
        .filter((league) => Object.prototype.hasOwnProperty.call(LEAGUE_DEFAULTS, league))
        .filter((league) => !allowedSet || allowedSet.has(league));

    if (typeof value === "string" && value.trim().length > 0) {
      return normalizeList(value.split(/[;,\s]+/).filter(Boolean));
    }

    if (Array.isArray(value) && value.length > 0) {
      return normalizeList(value);
    }

    return allowedSet ? Array.from(allowedSet) : Object.keys(LEAGUE_DEFAULTS);
  },

  normalizeLeagueFavorites(favorites) {
    const result = {};
    if (favorites && typeof favorites === "object") {
      Object.entries(favorites).forEach(([league, presetKey]) => {
        const normalizedLeague = String(league || "").toLowerCase();
        if (!Object.prototype.hasOwnProperty.call(LEAGUE_DEFAULTS, normalizedLeague)) {
          return;
        }
        const resolved = this.resolveTeamPreset(normalizedLeague, presetKey);
        if (resolved) {
          result[normalizedLeague] = resolved;
        }
      });
    }

    if (Object.keys(result).length === 0) {
      const fallback = this.resolveTeamPreset("wnba", "indiana_fever");
      if (fallback) {
        result.wnba = fallback;
      }
    }

    return result;
  },

  resolveTeamPreset(league, presetKey) {
    if (!presetKey) {
      return null;
    }

    const normalizedKey = String(presetKey)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    const presets = TEAM_PRESETS[league];
    if (!presets) {
      return null;
    }

    const entry = Object.entries(presets).find(([key]) => key === normalizedKey);
    return entry ? { key: normalizedKey, team: { ...entry[1] } } : null;
  },

  shouldShowLeagueSwitch() {
    return Boolean(
      this.config.enableLeagueSwitch &&
        Array.isArray(this.availableLeagueOrder) &&
        this.availableLeagueOrder.length > 1
    );
  },

  getNextLeague() {
    if (!Array.isArray(this.availableLeagueOrder) || this.availableLeagueOrder.length === 0) {
      return this.config.league;
    }

    const index = this.availableLeagueOrder.indexOf(this.config.league);
    if (index === -1) {
      return this.availableLeagueOrder[0];
    }

    const nextIndex = (index + 1) % this.availableLeagueOrder.length;
    return this.availableLeagueOrder[nextIndex];
  },

  getLeagueName(league) {
    const info = LEAGUE_DEFAULTS[league];
    return info ? info.name : league;
  },

  changeLeague(newLeague) {
    const normalized = String(newLeague || "").toLowerCase();
    if (!normalized || normalized === this.config.league) {
      return;
    }

    if (!Array.isArray(this.availableLeagueOrder) || !this.availableLeagueOrder.includes(normalized)) {
      return;
    }

    this.config.league = normalized;
    this.config.headerText = "";
    this.normalizeConfig();
    this.availableLeagueOrder = this.config.availableLeagueOrder;
    this.resolvedLeagueFavorites = this.resolvedLeagueFavorites || {};
    this.loaded = false;
    this.error = null;
    this.favoriteTeam = null;
    this.liveGame = null;
    this.upcomingGames = [];
    this.activeStatsTeam = "favorite";
    this.updateDom(0);
    this.sendSocketNotification("CONFIG", this.config);
  },

  cycleLeague() {
    const nextLeague = this.getNextLeague();
    this.changeLeague(nextLeague);
  }
});

