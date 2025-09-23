const NodeHelper = require("node_helper");
const fetch = require("node-fetch");

module.exports = NodeHelper.create({
  start() {
    this.config = null;
    this.updateTimer = null;
  },

  stop() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "CONFIG") {
      this.config = this.normalizeConfig(payload);
      this.fetchGameData();
      this.scheduleUpdates();
    }
  },

  scheduleUpdates() {
    if (!this.config) {
      return;
    }

    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    const interval = Math.max(parseInt(this.config.updateInterval, 10) || (5 * 60 * 1000), 60 * 1000);
    this.updateTimer = setInterval(() => {
      this.fetchGameData();
    }, interval);
  },

  async fetchGameData() {
    if (!this.config) {
      return;
    }

    try {
      const scheduleUrl = `https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/teams/${this.config.favoriteTeamId}/schedule`;
      const teamInfoPromise = this.fetchTeamInfo(this.config.favoriteTeamId).catch(() => null);
      const schedulePromise = this.fetchJson(scheduleUrl);

      const [favoriteTeam, schedule] = await Promise.all([teamInfoPromise, schedulePromise]);
      const events = Array.isArray(schedule.events) ? schedule.events : [];

      const now = new Date();
      let liveEvent = null;
      const upcomingEvents = [];

      events.forEach((event) => {
        const competition = event.competitions && event.competitions[0];
        if (!competition) {
          return;
        }

        const status = competition.status && competition.status.type && competition.status.type.state;
        const eventDate = event.date ? new Date(event.date) : null;

        if (status === "in" && !liveEvent) {
          liveEvent = event;
        } else if (eventDate && eventDate >= now && status !== "post" && status !== "in") {
          upcomingEvents.push(event);
        }
      });

      const upcomingLimit = Math.max(parseInt(this.config.maxUpcoming, 10) || 3, 1);

      const formattedUpcoming = upcomingEvents
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, upcomingLimit)
        .map((event) => this.formatUpcoming(event))
        .filter(Boolean);

      let liveGame = null;
      if (liveEvent) {
        liveGame = await this.buildLiveGame(liveEvent, favoriteTeam);
      }

      this.sendSocketNotification("GAME_DATA", {
        favoriteTeam,
        liveGame,
        upcomingGames: formattedUpcoming
      });
    } catch (error) {
      this.sendSocketNotification("GAME_ERROR", { message: error.message });
    }
  },

  async buildLiveGame(event, favoriteTeamInfo) {
    const competition = event.competitions && event.competitions[0];
    if (!competition) {
      return null;
    }

    const summaryUrl = `https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/summary?event=${event.id}`;
    const summary = await this.fetchJson(summaryUrl);
    const favorite = this.findFavoriteCompetitor(competition);
    const opponent = this.findOpponent(competition, favorite);
    const venue = competition.venue && (competition.venue.fullName || competition.venue.displayName);

    const players = this.extractPlayerStats(summary.boxscore && summary.boxscore.players, this.config.favoriteTeamId);

    return {
      eventId: event.id,
      status: (competition.status && (competition.status.type && (competition.status.type.detail || competition.status.type.shortDetail)))
        || (event.status && event.status.type && event.status.type.detail)
        || "Live",
      startTime: event.date,
      favorite: this.mapCompetitorTeam(favorite, favoriteTeamInfo),
      opponent: this.mapCompetitorTeam(opponent),
      venue: venue || "",
      players
    };
  },

  extractPlayerStats(playersData, favoriteTeamId) {
    if (!Array.isArray(playersData)) {
      return [];
    }

    const target = (favoriteTeamId || "").toLowerCase();

    const teamEntry = playersData.find((entry) => {
      const team = entry.team || {};
      const candidates = [team.abbreviation, team.shortDisplayName, team.displayName, team.slug, team.id, team.uid];
      return candidates
        .filter(Boolean)
        .map((value) => String(value).toLowerCase())
        .includes(target);
    });

    if (!teamEntry || !Array.isArray(teamEntry.statistics)) {
      return [];
    }

    const statsEntry = teamEntry.statistics.find((stat) => Array.isArray(stat.athletes));
    if (!statsEntry || !Array.isArray(statsEntry.athletes)) {
      return [];
    }

    const labels = Array.isArray(statsEntry.labels) ? statsEntry.labels : [];

    return statsEntry.athletes.map((athlete) => {
      const statLine = this.mapStats(labels, athlete.stats);
      const info = athlete.athlete || {};
      return {
        id: info.id,
        name: info.displayName || info.shortName || "Unknown",
        position: info.position && info.position.abbreviation,
        points: statLine.PTS || statLine.Points || "",
        rebounds: statLine.REB || statLine.Rebounds || "",
        assists: statLine.AST || statLine.Assists || "",
        steals: statLine.STL || statLine.Steals || ""
      };
    });
  },

  mapStats(labels, stats) {
    const result = {};
    if (!Array.isArray(labels) || !Array.isArray(stats)) {
      return result;
    }

    labels.forEach((label, index) => {
      result[label] = stats[index];
    });

    return result;
  },

  formatUpcoming(event) {
    const competition = event.competitions && event.competitions[0];
    if (!competition) {
      return null;
    }

    const favorite = this.findFavoriteCompetitor(competition);
    const opponent = this.findOpponent(competition, favorite);
    const venue = competition.venue && (competition.venue.fullName || competition.venue.displayName);

    return {
      id: event.id,
      date: event.date,
      opponent: opponent && opponent.team ? (opponent.team.displayName || opponent.team.shortDisplayName || opponent.team.name) : "Opponent",
      opponentLogo: this.extractLogo(opponent && opponent.team && opponent.team.logos),
      venue: venue || "",
      isHome: favorite ? favorite.homeAway === "home" : false
    };
  },

  findFavoriteCompetitor(competition) {
    const competitors = Array.isArray(competition.competitors) ? competition.competitors : [];
    const target = (this.config.favoriteTeamId || "").toLowerCase();

    return competitors.find((competitor) => {
      if (!competitor.team) {
        return false;
      }

      const team = competitor.team;
      const candidates = [team.abbreviation, team.shortDisplayName, team.displayName, team.slug, team.id, team.uid];
      return candidates
        .filter(Boolean)
        .map((value) => String(value).toLowerCase())
        .includes(target);
    }) || competitors[0];
  },

  findOpponent(competition, favorite) {
    const competitors = Array.isArray(competition.competitors) ? competition.competitors : [];
    if (!favorite) {
      return competitors[1] || competitors[0] || null;
    }

    return competitors.find((competitor) => competitor !== favorite) || null;
  },

  normalizeConfig(config) {
    const normalized = { ...config };
    const teamConfig = normalized.team || {};

    if (!normalized.favoriteTeamId && teamConfig.id) {
      normalized.favoriteTeamId = teamConfig.id;
    }

    if (!normalized.favoriteTeamDisplayName && teamConfig.displayName) {
      normalized.favoriteTeamDisplayName = teamConfig.displayName;
    }

    if (!normalized.favoriteTeamId) {
      normalized.favoriteTeamId = "ind";
    }

    if (!normalized.favoriteTeamDisplayName) {
      normalized.favoriteTeamDisplayName = "Indiana Fever";
    }

    const upcomingLimit = Math.max(parseInt(normalized.maxUpcoming, 10) || 3, 1);
    normalized.maxUpcoming = upcomingLimit;

    return normalized;
  },

  async fetchTeamInfo(teamId) {
    if (!teamId) {
      return null;
    }

    const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/teams/${teamId}`;
    const response = await this.fetchJson(url);
    const team = response && (response.team || response);
    if (!team) {
      return null;
    }

    const logo = this.extractLogo(team.logos);
    const record = this.extractRecord(team.record);

    return {
      id: team.id || team.slug || team.abbreviation || teamId,
      displayName: team.displayName || team.name || teamId,
      shortDisplayName: team.shortDisplayName || team.nickname || team.displayName || teamId,
      logos: {
        primary: logo,
        all: Array.isArray(team.logos) ? team.logos : []
      },
      record
    };
  },

  mapCompetitorTeam(competitor, fallbackInfo) {
    if (!competitor) {
      if (!fallbackInfo) {
        return null;
      }

      return {
        id: fallbackInfo.id,
        displayName: fallbackInfo.displayName,
        shortDisplayName: fallbackInfo.shortDisplayName,
        score: "0",
        logo: fallbackInfo.logos && fallbackInfo.logos.primary,
        record: fallbackInfo.record || null
      };
    }

    const team = competitor.team || {};
    const logo = this.extractLogo(team.logos) || (fallbackInfo && fallbackInfo.logos && fallbackInfo.logos.primary) || "";

    return {
      id: team.id || (fallbackInfo && fallbackInfo.id) || null,
      displayName: team.displayName || team.shortDisplayName || team.name || (fallbackInfo && fallbackInfo.displayName) || "",
      shortDisplayName: team.shortDisplayName || team.abbreviation || (fallbackInfo && fallbackInfo.shortDisplayName) || "",
      score: competitor.score || "0",
      logo,
      record: this.extractRecord(team.record) || (fallbackInfo && fallbackInfo.record) || null
    };
  },

  extractLogo(logos) {
    if (!Array.isArray(logos) || logos.length === 0) {
      return "";
    }

    const prioritized = logos.find((logo) => Array.isArray(logo.rel) && (logo.rel.includes("full") || logo.rel.includes("primary")));
    const selected = prioritized || logos[0];
    return selected && selected.href ? selected.href : "";
  },

  extractRecord(recordData) {
    if (!recordData || !Array.isArray(recordData.items)) {
      return null;
    }

    const overall = recordData.items.find((item) => item.type === "total" || item.summary) || recordData.items[0];
    if (!overall) {
      return null;
    }

    let wins;
    let losses;

    if (Array.isArray(overall.stats)) {
      overall.stats.forEach((stat) => {
        if (!stat || typeof stat.value === "undefined") {
          return;
        }

        if (stat.name === "wins") {
          wins = parseInt(stat.value, 10);
        } else if (stat.name === "losses") {
          losses = parseInt(stat.value, 10);
        }
      });
    }

    if (typeof wins === "undefined" || typeof losses === "undefined") {
      const summary = overall.summary || "";
      const match = summary.match(/(\d+)[-–](\d+)/);
      if (match) {
        wins = parseInt(match[1], 10);
        losses = parseInt(match[2], 10);
      }
    }

    if (typeof wins === "undefined" && typeof losses === "undefined") {
      return null;
    }

    return {
      wins: typeof wins === "number" ? wins : null,
      losses: typeof losses === "number" ? losses : null,
      summary: overall.summary || (typeof wins === "number" && typeof losses === "number" ? `${wins}-${losses}` : "")
    };
  },

  async fetchJson(url) {
    const response = await fetch(url, { headers: { "User-Agent": "MagicMirror-Module" } });
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return response.json();
  }
});
