const NodeHelper = require("node_helper");
const fetch = require("node-fetch");

const LEAGUE_SETTINGS = {
  ncaa_mbb: {
    name: "NCAA Men's Basketball",
    sportPath: "basketball/mens-college-basketball",
    defaultTeam: {
      id: "282",
      displayName: "Indiana State Sycamores",
      shortDisplayName: "Indiana State"
    }
  },
  wnba: {
    name: "WNBA",
    sportPath: "basketball/wnba",
    defaultTeam: {
      id: "ind",
      displayName: "Indiana Fever",
      shortDisplayName: "Indiana Fever"
    },
    aliases: {
      lv: ["lva", "las vegas aces", "aces"],
      ny: ["nya", "nyl", "new york liberty"],
      la: ["la", "lasparks", "los angeles sparks"]
    }
  }
};

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

    const interval = Math.max(parseInt(this.config.updateInterval, 10) || 5 * 60 * 1000, 60 * 1000);
    this.updateTimer = setInterval(() => {
      this.fetchGameData();
    }, interval);
  },

  async fetchGameData() {
    if (!this.config) {
      return;
    }

    try {
      const scheduleUrl = `${this.config.apiBase}/teams/${this.config.favoriteTeamId}/schedule`;
      const teamInfoPromise = this.fetchTeamInfo(this.config.favoriteTeamId).catch(() => null);
      const schedulePromise = this.fetchJson(scheduleUrl);

      const [teamInfo, schedule] = await Promise.all([teamInfoPromise, schedulePromise]);
      const favoriteTeam = this.buildFavoriteTeamProfile(teamInfo);

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
        .map((event) => this.formatUpcoming(event, favoriteTeam))
        .filter(Boolean);

      let liveGame = null;
      if (liveEvent) {
        liveGame = await this.buildLiveGame(liveEvent, favoriteTeam);
      }

      this.sendSocketNotification("GAME_DATA", {
        favoriteTeam: this.stripFavoriteForClient(favoriteTeam),
        liveGame,
        upcomingGames: formattedUpcoming
      });
    } catch (error) {
      this.sendSocketNotification("GAME_ERROR", { message: error.message });
    }
  },
  {
  async buildLiveGame(event, favoriteTeam) {
    const competition = event.competitions && event.competitions[0];
    if (!competition) {
      return null;
    }

    const summaryUrl = `${this.config.apiBase}/summary?event=${event.id}`;
    const summary = await this.fetchJson(summaryUrl);
    const favorite = this.findFavoriteCompetitor(competition, favoriteTeam);
    const opponent = this.findOpponent(competition, favorite);
    const venue = competition.venue && (competition.venue.fullName || competition.venue.displayName);

    const players = this.extractPlayerStats(summary.boxscore && summary.boxscore.players, favoriteTeam);

    return {
      eventId: event.id,
      status:
        (competition.status && competition.status.type && (competition.status.type.detail || competition.status.type.shortDetail)) ||
        (event.status && event.status.type && event.status.type.detail) ||
        "Live",
      startTime: event.date,
      favorite: this.mapCompetitorTeam(favorite, favoriteTeam),
      opponent: this.mapCompetitorTeam(opponent),
      venue: venue || "",
      players
    };
  },

  extractPlayerStats(playersData, favoriteTeam) {
    if (!Array.isArray(playersData)) {
      return [];
    }

    const identifiers = this.buildIdentifierSet(favoriteTeam);

    const teamEntry = playersData.find((entry) => {
      const team = entry.team || {};
      const candidates = [
        team.abbreviation,
        team.shortDisplayName,
        team.displayName,
        team.slug,
        team.id,
        team.uid,
        team.name,
        team.location,
        team.nickname
      ];

      if (team.alternateIds) {
        candidates.push(...Object.values(team.alternateIds));
      }

      if (Array.isArray(team.alternateIdentifiers)) {
        candidates.push(...team.alternateIdentifiers);
      }

      return candidates
        .filter((value) => typeof value !== "undefined" && value !== null)
        .map((value) => String(value).toLowerCase())
        .some((value) => identifiers.has(value));
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

  formatUpcoming(event, favoriteTeam) {
    const competition = event.competitions && event.competitions[0];
    if (!competition) {
      return null;
    }

    const favorite = this.findFavoriteCompetitor(competition, favoriteTeam);
    const opponent = this.findOpponent(competition, favorite);
    const venue = competition.venue && (competition.venue.fullName || competition.venue.displayName);

    return {
      id: event.id,
      date: event.date,
      opponent:
        opponent && opponent.team
          ? opponent.team.displayName || opponent.team.shortDisplayName || opponent.team.name || "Opponent"
          : "Opponent",
      opponentLogo: this.extractLogo(opponent && opponent.team && opponent.team.logos),
      venue: venue || "",
      isHome: favorite ? favorite.homeAway === "home" : false
    };
  },

  findFavoriteCompetitor(competition, favoriteTeam) {
    const competitors = Array.isArray(competition.competitors) ? competition.competitors : [];
    const identifiers = this.buildIdentifierSet(favoriteTeam);

    return (
      competitors.find((competitor) => {
        if (!competitor.team) {
          return false;
        }

        const team = competitor.team;
        const candidates = [
          team.abbreviation,
          team.shortDisplayName,
          team.displayName,
          team.slug,
          team.id,
          team.uid,
          team.name,
          team.location,
          team.nickname
        ];

        if (team.alternateIds) {
          candidates.push(...Object.values(team.alternateIds));
        }

        if (Array.isArray(team.alternateIdentifiers)) {
          candidates.push(...team.alternateIdentifiers);
        }

        return candidates
          .filter((value) => typeof value !== "undefined" && value !== null)
          .map((value) => String(value).toLowerCase())
          .some((value) => identifiers.has(value));
      }) || competitors.find((competitor) => competitor.homeAway === "home") || competitors[0] || null
    );
  },

  findOpponent(competition, favorite) {
    const competitors = Array.isArray(competition.competitors) ? competition.competitors : [];
    if (!favorite) {
      return competitors[1] || competitors[0] || null;
    }

    return competitors.find((competitor) => competitor !== favorite) || null;
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
      shortDisplayName:
        team.shortDisplayName || team.abbreviation || (fallbackInfo && fallbackInfo.shortDisplayName) || "",
      score: typeof competitor.score !== "undefined" ? competitor.score : "0",
      logo,
      record: this.extractRecord(team.record) || (fallbackInfo && fallbackInfo.record) || null
    };
  },

  buildFavoriteTeamProfile(teamInfo) {
    const league = LEAGUE_SETTINGS[this.config.league] || LEAGUE_SETTINGS.ncaa_mbb;
    const baseTeam = league.defaultTeam || {};
    const teamConfig = this.config.team || {};
    const team = teamInfo && (teamInfo.team || teamInfo) ? teamInfo.team || teamInfo : {};

    const identifiers = new Set();
    const addIdentifier = (value) => {
      if (value === null || typeof value === "undefined") {
        return;
      }
      const normalized = String(value).toLowerCase();
      if (normalized) {
        identifiers.add(normalized);
      }
    };

    [
      this.config.favoriteTeamId,
      this.config.favoriteTeamDisplayName,
      this.config.favoriteTeamShortDisplayName,
      teamConfig.id,
      teamConfig.slug,
      teamConfig.abbreviation,
      teamConfig.displayName,
      teamConfig.shortDisplayName,
      baseTeam.id,
      baseTeam.displayName,
      baseTeam.shortDisplayName,
      team.id,
      team.slug,
      team.abbreviation,
      team.displayName,
      team.shortDisplayName,
      team.name,
      team.location,
      team.nickname
    ].forEach(addIdentifier);

    if (team.alternateIds) {
      Object.values(team.alternateIds).forEach(addIdentifier);
    }

    if (Array.isArray(team.alternateIdentifiers)) {
      team.alternateIdentifiers.forEach(addIdentifier);
    }

    const leagueAliases = (league.aliases && league.aliases[this.config.favoriteTeamId]) || [];
    leagueAliases.forEach(addIdentifier);

    const logos = Array.isArray(team.logos) ? team.logos : teamInfo && Array.isArray(teamInfo.logos) ? teamInfo.logos : [];
    const primaryLogo = this.extractLogo(logos);
    const record = this.extractRecord(team.record || (teamInfo && teamInfo.record));

    return {
      id: team.id || this.config.favoriteTeamId || baseTeam.id || null,
      slug: team.slug || null,
      abbreviation: team.abbreviation || null,
      displayName: team.displayName || team.name || this.config.favoriteTeamDisplayName || baseTeam.displayName || "",
      shortDisplayName:
        team.shortDisplayName || team.abbreviation || this.config.favoriteTeamShortDisplayName || baseTeam.shortDisplayName || "",
      logos: {
        primary: primaryLogo,
        all: logos
      },
      record: typeof record !== "undefined" ? record : null,
      identifiers: Array.from(identifiers)
    };
  },

  stripFavoriteForClient(favoriteTeam) {
    if (!favoriteTeam) {
      return null;
    }

    const { displayName, shortDisplayName, logos, record } = favoriteTeam;
    return { displayName, shortDisplayName, logos, record };
  },

  buildIdentifierSet(favoriteTeam) {
    const identifiers = new Set();
    const add = (value) => {
      if (value === null || typeof value === "undefined") {
        return;
      }
      const normalized = String(value).toLowerCase();
      if (normalized) {
        identifiers.add(normalized);
      }
    };

    add(this.config.favoriteTeamId);
    add(this.config.favoriteTeamDisplayName);
    add(this.config.favoriteTeamShortDisplayName);

    const teamConfig = this.config.team || {};
    [teamConfig.id, teamConfig.slug, teamConfig.abbreviation, teamConfig.displayName, teamConfig.shortDisplayName].forEach(add);

    if (favoriteTeam) {
      [
        favoriteTeam.id,
        favoriteTeam.slug,
        favoriteTeam.abbreviation,
        favoriteTeam.displayName,
        favoriteTeam.shortDisplayName
      ].forEach(add);

      if (Array.isArray(favoriteTeam.identifiers)) {
        favoriteTeam.identifiers.forEach(add);
      }
    }

    const league = LEAGUE_SETTINGS[this.config.league];
    if (league && league.aliases) {
      const aliases = league.aliases[this.config.favoriteTeamId];
      if (Array.isArray(aliases)) {
        aliases.forEach(add);
      }
    }

    return identifiers;
  },

  normalizeConfig(config) {
    const normalized = { ...config };
    const configuredLeague = (normalized.league || "ncaa_mbb").toLowerCase();
    const league = LEAGUE_SETTINGS[configuredLeague] || LEAGUE_SETTINGS.ncaa_mbb;

    normalized.league = configuredLeague;
    normalized.sportPath = league.sportPath;
    normalized.apiBase = `https://site.api.espn.com/apis/site/v2/sports/${league.sportPath}`;

    const teamConfig = normalized.team || {};
    const defaultTeam = league.defaultTeam || {};

    if (!normalized.favoriteTeamId) {
      normalized.favoriteTeamId = teamConfig.id || defaultTeam.id;
    }

    if (!normalized.favoriteTeamDisplayName) {
      normalized.favoriteTeamDisplayName = teamConfig.displayName || defaultTeam.displayName;
    }

    if (!normalized.favoriteTeamShortDisplayName) {
      normalized.favoriteTeamShortDisplayName =
        teamConfig.shortDisplayName || defaultTeam.shortDisplayName || normalized.favoriteTeamDisplayName;
    }

    normalized.maxUpcoming = Math.max(parseInt(normalized.maxUpcoming, 10) || 3, 1);
    normalized.updateInterval = Math.max(parseInt(normalized.updateInterval, 10) || 5 * 60 * 1000, 60 * 1000);

    return normalized;
  },

  async fetchTeamInfo(teamId) {
    if (!teamId) {
      return null;
    }

    const url = `${this.config.apiBase}/teams/${teamId}`;
    const response = await this.fetchJson(url);
    if (!response) {
      return null;
    }

    return response.team || response;
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

