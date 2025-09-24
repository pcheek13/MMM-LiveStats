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
  nba: {
    name: "NBA",
    sportPath: "basketball/nba",
    defaultTeam: {
      id: "ind",
      displayName: "Indiana Pacers",
      shortDisplayName: "Pacers"
    }
  },
  nhl: {
    name: "NHL",
    sportPath: "hockey/nhl",
    defaultTeam: {
      id: "chi",
      displayName: "Chicago Blackhawks",
      shortDisplayName: "Blackhawks"
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

  // NOTE: The live-game builder follows `fetchGameData` directly; keep this method
  // declaration adjacent so there isn't an extra block (`{`) inserted between them.
  async buildLiveGame(event, favoriteTeam) {
    const eventCompetition = event.competitions && event.competitions[0];

    const summaryUrl = `${this.config.apiBase}/summary?event=${event.id}`;
    const summary = await this.fetchJson(summaryUrl);

    const summaryCompetition =
      summary &&
      summary.header &&
      Array.isArray(summary.header.competitions) &&
      summary.header.competitions.length > 0
        ? summary.header.competitions[0]
        : null;

    const competition = summaryCompetition || eventCompetition;
    if (!competition) {
      return null;
    }

    const favorite = this.findFavoriteCompetitor(competition, favoriteTeam);
    const opponent = this.findOpponent(competition, favorite);

    let venueSource = competition;
    if (!venueSource || !venueSource.venue) {
      venueSource = eventCompetition;
    }
    const venue =
      venueSource &&
      venueSource.venue &&
      (venueSource.venue.fullName || venueSource.venue.displayName);

    const statColumns = this.getStatColumnsForLeague(this.config.league);

    const players = this.extractPlayerStats(
      summary.boxscore && summary.boxscore.players,
      favoriteTeam,
      favorite,
      opponent,
      statColumns
    );

    const statusSource = summaryCompetition || eventCompetition || event;

    return {
      eventId: event.id,
      status:
        (statusSource.status &&
          statusSource.status.type &&
          (statusSource.status.type.detail || statusSource.status.type.shortDetail)) ||
        (event.status && event.status.type && event.status.type.detail) ||
        "Live",
      startTime: (competition && competition.date) || event.date,
      favorite: this.mapCompetitorTeam(favorite, favoriteTeam),
      opponent: this.mapCompetitorTeam(opponent),
      venue: venue || "",
      players,
      statColumns
    };
  },

  extractPlayerStats(playersData, favoriteTeamProfile, favoriteCompetitor, opponentCompetitor, statColumns) {
    if (!Array.isArray(playersData)) {
      return { favorite: [], opponent: [] };
    }

    const favoriteIdentifiers = this.mergeIdentifierSets(
      this.buildIdentifierSet(favoriteTeamProfile),
      this.buildCompetitorIdentifierSet(favoriteCompetitor)
    );
    const opponentIdentifiers = this.buildCompetitorIdentifierSet(opponentCompetitor);

    return {
      favorite: this.extractTeamPlayerStats(playersData, favoriteIdentifiers, statColumns),
      opponent: this.extractTeamPlayerStats(playersData, opponentIdentifiers, statColumns)
    };
  },

  extractTeamPlayerStats(playersData, identifiers, statColumns) {
    if (!identifiers || identifiers.size === 0) {
      return [];
    }

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
      const stats = {};

      (Array.isArray(statColumns) ? statColumns : []).forEach((column) => {
        const sources = Array.isArray(column.sources) && column.sources.length > 0 ? column.sources : [column.label];
        stats[column.key] = this.resolveStatValue(statLine, sources) || "";
      });

      return {
        id: info.id,
        name: info.displayName || info.shortName || "Unknown",
        position: info.position && info.position.abbreviation,
        stats
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

  resolveStatValue(statLine, sources) {
    if (!statLine || typeof statLine !== "object") {
      return "";
    }

    for (const source of sources) {
      if (typeof statLine[source] !== "undefined" && statLine[source] !== null) {
        return statLine[source];
      }
    }

    return "";
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

  buildCompetitorIdentifierSet(competitor) {
    const identifiers = new Set();
    if (!competitor) {
      return identifiers;
    }

    const add = (value) => {
      if (value === null || typeof value === "undefined") {
        return;
      }
      const normalized = String(value).toLowerCase();
      if (normalized) {
        identifiers.add(normalized);
      }
    };

    [competitor.id, competitor.uid].forEach(add);

    const team = competitor.team || {};
    [
      team.abbreviation,
      team.shortDisplayName,
      team.displayName,
      team.slug,
      team.id,
      team.uid,
      team.name,
      team.location,
      team.nickname
    ].forEach(add);

    if (team.alternateIds) {
      Object.values(team.alternateIds).forEach(add);
    }

    if (Array.isArray(team.alternateIdentifiers)) {
      team.alternateIdentifiers.forEach(add);
    }

    return identifiers;
  },

  mergeIdentifierSets(...sets) {
    const merged = new Set();
    sets.forEach((set) => {
      if (!set || typeof set.forEach !== "function") {
        return;
      }

      set.forEach((value) => {
        if (value === null || typeof value === "undefined") {
          return;
        }
        const normalized = String(value).toLowerCase();
        if (normalized) {
          merged.add(normalized);
        }
      });
    });

    return merged;
  },

  normalizeConfig(config) {
    const normalized = { ...config };
    let configuredLeague = (normalized.league || "wnba").toLowerCase();

    const favorites = this.normalizeLeagueFavorites(normalized.leagueFavorites);
    const favoriteLeagues = Object.keys(favorites);

    const orderSource =
      typeof normalized.availableLeagueOrder !== "undefined" ? normalized.availableLeagueOrder : normalized.availableLeagues;
    const normalizedOrder = this.normalizeLeagueOrder(orderSource, favoriteLeagues);
    normalized.availableLeagueOrder = normalizedOrder.length ? normalizedOrder : favoriteLeagues;
    normalized.availableLeagues = [...normalized.availableLeagueOrder];

    if (!favoriteLeagues.includes(configuredLeague)) {
      configuredLeague = normalized.availableLeagueOrder[0] || favoriteLeagues[0] || configuredLeague;
    }

    normalized.league = configuredLeague;

    const league = LEAGUE_SETTINGS[configuredLeague] || LEAGUE_SETTINGS.wnba;
    normalized.sportPath = league.sportPath;
    normalized.apiBase = `https://site.api.espn.com/apis/site/v2/sports/${league.sportPath}`;

    normalized.leagueFavorites = Object.fromEntries(
      Object.entries(favorites).map(([leagueKey, data]) => [leagueKey, data.key])
    );

    const presetTeam = favorites[configuredLeague] || this.resolveTeamPreset(configuredLeague, normalized.teamPreset);
    let teamConfig = (presetTeam && presetTeam.team) || {};

    if (presetTeam && presetTeam.key) {
      normalized.teamPreset = presetTeam.key;
    } else {
      normalized.teamPreset = "";
      if (normalized.team && typeof normalized.team === "object" && Object.keys(normalized.team).length > 0) {
        teamConfig = { ...normalized.team };
      }
    }

    if (!teamConfig || Object.keys(teamConfig).length === 0) {
      const defaultTeamConfig = league.defaultTeam || {};
      teamConfig = { ...defaultTeamConfig };
    }

    const fallbackDisplayName = (league.defaultTeam && league.defaultTeam.displayName) || "Favorite Team";
    const fallbackShortDisplayName = (league.defaultTeam && league.defaultTeam.shortDisplayName) || fallbackDisplayName;

    normalized.favoriteTeamId = teamConfig.id || (league.defaultTeam && league.defaultTeam.id) || normalized.favoriteTeamId;
    normalized.favoriteTeamDisplayName = teamConfig.displayName || fallbackDisplayName;
    normalized.favoriteTeamShortDisplayName =
      teamConfig.shortDisplayName || fallbackShortDisplayName || normalized.favoriteTeamDisplayName;

    normalized.maxUpcoming = Math.max(parseInt(normalized.maxUpcoming, 10) || 3, 1);
    normalized.updateInterval = Math.max(parseInt(normalized.updateInterval, 10) || 5 * 60 * 1000, 60 * 1000);

    normalized.team = { ...teamConfig };

    return normalized;
  },

  normalizeLeagueFavorites(favorites) {
    const result = {};
    if (favorites && typeof favorites === "object") {
      Object.entries(favorites).forEach(([leagueKey, presetKey]) => {
        const normalizedLeague = String(leagueKey || "").toLowerCase();
        if (!Object.prototype.hasOwnProperty.call(LEAGUE_SETTINGS, normalizedLeague)) {
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

  normalizeLeagueOrder(value, allowedLeagues) {
    const allowedSet = Array.isArray(allowedLeagues) && allowedLeagues.length > 0 ? new Set(allowedLeagues) : null;

    const normalizeList = (list) =>
      list
        .map((leagueKey) => String(leagueKey || "").toLowerCase())
        .filter((leagueKey) => Object.prototype.hasOwnProperty.call(LEAGUE_SETTINGS, leagueKey))
        .filter((leagueKey) => !allowedSet || allowedSet.has(leagueKey));

    if (typeof value === "string" && value.trim().length > 0) {
      return normalizeList(value.split(/[;,\s]+/).filter(Boolean));
    }

    if (Array.isArray(value) && value.length > 0) {
      return normalizeList(value);
    }

    return allowedSet ? Array.from(allowedSet) : Object.keys(LEAGUE_SETTINGS);
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
  },

  getStatColumnsForLeague(league) {
    const normalized = String(league || "").toLowerCase();

    if (normalized === "nhl") {
      return [
        { key: "goals", label: "G", sources: ["G", "Goals"] },
        { key: "assists", label: "A", sources: ["A", "Assists"] },
        { key: "points", label: "P", sources: ["P", "Points"] },
        { key: "shots", label: "SOG", sources: ["SOG", "Shots", "Shots on Goal"] },
        { key: "pim", label: "PIM", sources: ["PIM", "Penalty Minutes"] }
      ];
    }

    return [
      { key: "points", label: "PTS", sources: ["PTS", "Points"] },
      { key: "rebounds", label: "REB", sources: ["REB", "Rebounds"] },
      { key: "assists", label: "AST", sources: ["AST", "Assists"] },
      { key: "steals", label: "STL", sources: ["STL", "Steals"] },
      { key: "fouls", label: "PF", sources: ["PF", "Fouls", "Personal Fouls"] }
    ];
  }
});

