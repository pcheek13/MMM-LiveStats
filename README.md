# MMM-LiveStats

MMM-LiveStats is a MagicMirror² module that tracks your favorite team with real-time box scores and a steady stream of upcoming matchups. It supports a single league at a time—NCAA men's basketball, the NBA, the WNBA, or the NHL—so you can dedicate the mirror space to the club that matters most. When a game is live you will see animated alerts, live scores, and player statistics tuned to each sport; between games the module always highlights the next three contests on the schedule. A touch-friendly league switcher makes it easy to hop between leagues right on the mirror, and each league can have its own preset favorite so only the teams you care about appear as choices.

## Features

- Works with NCAA men's basketball, NBA, WNBA, and NHL teams using ESPN's public data feeds (no API key required).
- Always-on upcoming schedule that shows the next three games even when no live event is in progress.
- Flashing red live indicator on the stats table whenever your team is playing.
- Team crests and color logos for your favorite team and every opponent.
- Favorite-team banner with medium-sized crest and the current season record.
- Scoreboard that keeps both teams' scores, names, and logos front and center.
- On-demand stats toggle that flips the live player table between your team and the opponent with a single tap.
- Fouls column for basketball leagues and hockey-centric stats (goals, assists, points, shots, PIM) for NHL matchups.
- Configurable polling interval, module header, team presets, and an optional on-screen league switcher.

## Installation

Copy and paste the commands below on your MagicMirror² host (including Raspberry Pi OS on a Raspberry Pi 5) to clone the repository into the proper module directory and install its dependencies:

```bash
cd ~/MagicMirror/modules && \
  git clone https://github.com/pcheek13/MMM-LiveStats.git && \
  cd MMM-LiveStats && \
  npm install
```

After installation, add the module to your `config/config.js` file.

## Configuration

Add MMM-LiveStats to the `modules` array in `config.js`:

```javascript
{
  module: "MMM-LiveStats",
  position: "top_left",
  config: {
    league: "wnba", // starting league; must exist in leagueFavorites
    leagueFavorites: {
      wnba: "indiana_fever", // defaults to the Indiana Fever
      nba: "indiana_pacers", // optional – include only the leagues you want to switch between
      ncaa_mbb: "indiana_state"
    },
    teamPreset: "indiana_fever", // optional override for the active league
    availableLeagues: ["wnba", "nba"], // order controls the on-screen switcher
    enableLeagueSwitch: true,
    updateInterval: 5 * 60 * 1000,
    maxUpcoming: 3
  }
}
```

### Configuration Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `league` | `string` | `"wnba"` | Determines which league to display on startup. Supported values: `"ncaa_mbb"`, `"nba"`, `"wnba"`, `"nhl"`. The league must also have an entry in `leagueFavorites`. |
| `leagueFavorites` | `object` | `{ wnba: "indiana_fever" }` | Maps leagues to preset keys. Only leagues present in this object appear in the UI. Leave a league out (or set it to an empty value) to hide it from the switcher. |
| `teamPreset` | `string` | `"indiana_fever"` | Convenience override for the active league. Presets include `"indiana_state"`, `"purdue"`, `"kansas"`, `"duke"`, `"north_carolina"`, `"gonzaga"`, `"uconn"`, `"indiana_pacers"`, `"boston_celtics"`, `"denver_nuggets"`, `"los_angeles_lakers"`, `"golden_state_warriors"`, `"miami_heat"`, `"new_york_knicks"`, `"indiana_fever"`, `"atlanta_dream"`, `"chicago_sky"`, `"connecticut_sun"`, `"dallas_wings"`, `"las_vegas_aces"`, `"los_angeles_sparks"`, `"minnesota_lynx"`, `"new_york_liberty"`, `"phoenix_mercury"`, `"seattle_storm"`, `"washington_mystics"`, `"chicago_blackhawks"`, `"detroit_red_wings"`, `"colorado_avalanche"`, `"toronto_maple_leafs"`, `"boston_bruins"`, `"edmonton_oilers"`, and `"vegas_golden_knights"`. |
| `team` | `object` | `{}` | Optional helper that lets you supply custom identifiers when a preset is unavailable. When set it fills `favoriteTeamId`, `favoriteTeamDisplayName`, and `favoriteTeamShortDisplayName`. |
| `favoriteTeamId` | `string` | League-specific default | Overrides the team ID used in API calls. Typically populated from `teamPreset` or `team`. |
| `favoriteTeamDisplayName` | `string` | League-specific default | Overrides the friendly team name shown in the UI. |
| `favoriteTeamShortDisplayName` | `string` | League-specific default | Optional shorter label used in compact areas such as headings. |
| `headerText` | `string` | `<Team Name> Live Stats` | Custom text displayed in the MagicMirror module header. When omitted the module builds a header from the favorite team name. |
| `updateInterval` | `number` | `300000` | Polling frequency in milliseconds. The module enforces a minimum interval of 60 seconds. |
| `maxUpcoming` | `number` | `3` | Number of upcoming games to display (minimum of 1). |
| `availableLeagues` | `array` or `string` | Derived from `leagueFavorites` | Controls which leagues appear in the on-screen selector. Accepts an array or a comma/space separated string of league keys. Any entries not present in `leagueFavorites` are ignored. |
| `enableLeagueSwitch` | `boolean` | `true` | Toggles the on-screen league selector. Set to `false` to hide the dropdown entirely. |

The optional values above stack together so you can start with a preset and override only the pieces you need:

- `teamPreset` fills in `favoriteTeamId`, names, and ESPN pathing for you. As long as you pick a preset that matches the active league, no other identifiers are required.
- Setting the `team` helper object lets you supply custom IDs and display names when a preset is missing. Any keys you leave out continue to fall back to the preset or league defaults.
- Direct overrides like `favoriteTeamId` or `headerText` always win last, which makes it easy to fine-tune the UI without abandoning the preset conveniences.

Because each league holds exactly one favorite at a time, the module resolves identifiers in this order: explicit overrides → `team` helper → `teamPreset` → league defaults. This keeps your configuration minimal while still supporting edge cases such as alternate ESPN abbreviations.

### Configuration Examples

**Single-league setup using only a team preset**

```javascript
{
  module: "MMM-LiveStats",
  position: "top_left",
  config: {
    league: "ncaa_mbb",
    leagueFavorites: {
      ncaa_mbb: "indiana_state"
    },
    teamPreset: "indiana_state",
    enableLeagueSwitch: false
  }
}
```

This configuration keeps the mirror locked on NCAA men's basketball and relies entirely on the preset helper for the Indiana State Sycamores—no manual IDs necessary.

**Multi-league setup with several favorites**

```javascript
{
  module: "MMM-LiveStats",
  position: "top_left",
  config: {
    league: "wnba",
    leagueFavorites: {
      wnba: "indiana_fever",
      nba: "indiana_pacers",
      ncaa_mbb: "indiana_state"
    },
    availableLeagues: ["wnba", "nba", "ncaa_mbb"],
    teamPreset: "indiana_fever",
    headerText: "Hoops Hub"
  }
}
```

Here the mirror boots into the WNBA but the on-screen selector lets you jump between the Fever, Pacers, and Sycamores. Each entry points to a preset so the module automatically retrieves the correct ESPN identifiers, logos, and records for every league.

### Switching Teams

Use `leagueFavorites` to declare which teams you care about, then pick your starting league with `config.league`. Each entry should point at a preset helper key so the module can fill in the correct ESPN identifiers. The ESPN endpoints expect the identifiers used on `espn.com`. Some common examples:

| League | Team | Identifier |
| ------ | ---- | ---------- |
| NCAA Men's Basketball | Indiana State Sycamores | `282` |
| NCAA Men's Basketball | Duke Blue Devils | `150` |
| NCAA Men's Basketball | Kansas Jayhawks | `2305` |
| NBA | Indiana Pacers | `ind` |
| NBA | Boston Celtics | `bos` |
| NBA | Denver Nuggets | `den` |
| WNBA | Indiana Fever | `ind` |
| WNBA | Las Vegas Aces | `lv` |
| WNBA | New York Liberty | `ny` |
| NHL | Chicago Blackhawks | `chi` |
| NHL | Detroit Red Wings | `det` |
| NHL | Toronto Maple Leafs | `tor` |

When you supply `leagueFavorites`, the module automatically pulls logos and season records from ESPN for each league you enable. You can override any piece individually by setting `teamPreset`, the `team` helper, or the related explicit options (`favoriteTeamId`, `favoriteTeamDisplayName`, etc.). Leagues without a favorite preset are omitted from the UI so the on-screen selector only lists valid teams.

### Switching Leagues On-Screen

If `enableLeagueSwitch` is true and `availableLeagues` contains at least two entries, the module renders a touch-friendly dropdown on the top-right of the favorite-team banner. Picking a league from the selector reloads the module with the appropriate defaults and immediately fetches fresh data—no need to edit `config.js` when you want to peek at another league.

## Data Sources

MMM-LiveStats uses public ESPN endpoints—no API key is required:

- NCAA Men's Basketball: `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams/{teamId}/schedule`
- NBA: `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/{teamId}/schedule`
- WNBA: `https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/teams/{teamId}/schedule`
- NHL: `https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/teams/{teamId}/schedule`
- Game summaries (all leagues): `https://site.api.espn.com/apis/site/v2/sports/{leaguePath}/summary?event={eventId}` where `leaguePath` matches the active league's `sportPath` (for example `basketball/nba` or `hockey/nhl`).

Replace `{leaguePath}` with `mens-college-basketball`, `nba`, or `wnba` to match the active league.

The module gracefully handles data or network errors by displaying a readable message in the MagicMirror interface.

## License

MIT – see the [LICENSE](LICENSE) file for details.

