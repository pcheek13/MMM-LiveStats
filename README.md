# MMM-LiveStats

MMM-LiveStats is a MagicMirror² module that follows your chosen team with real-time box scores and a steady stream of upcoming matchups. It supports a single league at a time—NCAA men's basketball, the NBA, the WNBA, or the NHL—so you can dedicate the mirror space to the club that matters most. When a game is live you will see animated alerts, live scores, and player statistics tuned to each sport; between games the module always highlights the next three contests on the schedule. Touch-friendly dropdowns let you swap leagues and teams right on the mirror, so you no longer have to predefine "favorites" in the configuration file.

## Features

- Works with NCAA men's basketball, NBA, WNBA, and NHL teams using ESPN's public data feeds (no API key required).
- Always-on upcoming schedule that shows the next three games even when no live event is in progress.
- Flashing red live indicator on the stats table whenever your team is playing.
- Team crests and color logos for your selected team and every opponent.
- Selected-team banner with medium-sized crest and the current season record.
- Scoreboard that keeps both teams' scores, names, and logos front and center.
- Player list that shows jersey numbers alongside names for quick identification.
- On-demand stats toggle that flips the live player table between your team and the opponent with a single tap.
- Fouls column for basketball leagues and hockey-centric stats (goals, assists, points, shots, PIM) for NHL matchups.
- Configurable polling interval, module header, deep team preset catalog, and optional on-screen league and team switchers.

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
    league: "ncaa_mbb", // starting league
    teamSelections: {
      ncaa_mbb: "indiana_state",
      wnba: "indiana_fever",
      nba: "indiana_pacers"
    },
    availableLeagues: ["ncaa_mbb", "wnba", "nba"], // order controls the on-screen switcher
    enableLeagueSwitch: true,
    updateInterval: 5 * 60 * 1000,
    maxUpcoming: 3
  }
}
```

### Configuration Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `league` | `string` | `"ncaa_mbb"` | Determines which league to display on startup. Supported values: `"ncaa_mbb"`, `"nba"`, `"wnba"`, `"nhl"`. |
| `teamSelections` | `object` | `{ ncaa_mbb: "indiana_state" }` | Maps leagues to preset keys so each league can remember a starting team. If a league is omitted the module falls back to its default preset. |
| `teamPreset` | `string` | `""` | Convenience override for the active league. Presets include `"indiana_state"`, `"purdue"`, `"kansas"`, `"duke"`, `"north_carolina"`, `"gonzaga"`, `"uconn"`, `"arizona"`, `"kentucky"`, `"michigan_state"`, `"ucla"`, `"houston"`, `"villanova"`, `"baylor"`, `"tennessee"`, `"indiana_pacers"`, `"atlanta_hawks"`, `"boston_celtics"`, `"brooklyn_nets"`, `"chicago_bulls"`, `"cleveland_cavaliers"`, `"dallas_mavericks"`, `"denver_nuggets"`, `"golden_state_warriors"`, `"los_angeles_clippers"`, `"los_angeles_lakers"`, `"memphis_grizzlies"`, `"miami_heat"`, `"milwaukee_bucks"`, `"new_orleans_pelicans"`, `"new_york_knicks"`, `"philadelphia_76ers"`, `"phoenix_suns"`, `"sacramento_kings"`, `"indiana_fever"`, `"atlanta_dream"`, `"chicago_sky"`, `"connecticut_sun"`, `"dallas_wings"`, `"las_vegas_aces"`, `"los_angeles_sparks"`, `"minnesota_lynx"`, `"new_york_liberty"`, `"phoenix_mercury"`, `"seattle_storm"`, `"washington_mystics"`, `"chicago_blackhawks"`, `"boston_bruins"`, `"colorado_avalanche"`, `"detroit_red_wings"`, `"edmonton_oilers"`, `"los_angeles_kings"`, `"new_york_rangers"`, `"pittsburgh_penguins"`, `"tampa_bay_lightning"`, `"toronto_maple_leafs"`, `"vancouver_canucks"`, `"vegas_golden_knights"`, and `"washington_capitals"`. |
| `team` | `object` | `{}` | Optional helper that lets you supply custom identifiers when a preset is unavailable. When set it fills `favoriteTeamId`, `favoriteTeamDisplayName`, and `favoriteTeamShortDisplayName`. |
| `favoriteTeamId` | `string` | League-specific default | Overrides the team ID used in API calls. Typically populated from `teamPreset` or `team`. |
| `favoriteTeamDisplayName` | `string` | League-specific default | Overrides the friendly team name shown in the UI. |
| `favoriteTeamShortDisplayName` | `string` | League-specific default | Optional shorter label used in compact areas such as headings. |
| `headerText` | `string` | `<Team Name> Live Stats` | Custom text displayed in the MagicMirror module header. When omitted the module builds a header from the favorite team name. |
| `updateInterval` | `number` | `300000` | Polling frequency in milliseconds. The module enforces a minimum interval of 60 seconds. |
| `maxUpcoming` | `number` | `3` | Number of upcoming games to display (minimum of 1). |
| `availableLeagues` | `array` or `string` | `["ncaa_mbb", "nba", "nhl", "wnba"]` | Controls which leagues appear in the on-screen selector. Accepts an array or a comma/space separated string of league keys. Any entries not supported by the module are ignored. |
| `enableLeagueSwitch` | `boolean` | `true` | Toggles the on-screen league selector. Set to `false` to hide the dropdown entirely. |

The optional values above stack together so you can start with a preset and override only the pieces you need:

- `teamSelections` seeds a preset for every league you care about so the module knows which team to load when you switch between them.
- `teamPreset` fills in `favoriteTeamId`, names, and ESPN pathing for the active league. As long as you pick a preset that matches the selected league, no other identifiers are required.
- Setting the `team` helper object lets you supply custom IDs and display names when a preset is missing. Any keys you leave out continue to fall back to the preset or league defaults.
- Direct overrides like `favoriteTeamId` or `headerText` always win last, which makes it easy to fine-tune the UI without abandoning the preset conveniences.

Because the module only renders one league at a time, identifiers resolve in this order: explicit overrides → `team` helper → `teamPreset` → league defaults. This keeps your configuration minimal while still supporting edge cases such as alternate ESPN abbreviations.

### Configuration Examples

**Single-league setup using only a team preset**

```javascript
{
  module: "MMM-LiveStats",
  position: "top_left",
  config: {
    league: "ncaa_mbb",
    teamSelections: {
      ncaa_mbb: "indiana_state"
    },
    enableLeagueSwitch: false
  }
}
```

This configuration keeps the mirror locked on NCAA men's basketball and relies entirely on the preset helper for the Indiana State Sycamores—no manual IDs necessary.

**Multi-league setup with several teams**

```javascript
{
  module: "MMM-LiveStats",
  position: "top_left",
  config: {
    league: "wnba",
    teamSelections: {
      wnba: "indiana_fever",
      nba: "indiana_pacers",
      ncaa_mbb: "indiana_state"
    },
    availableLeagues: ["wnba", "nba", "ncaa_mbb"],
    headerText: "Hoops Hub"
  }
}
```

Here the mirror boots into the WNBA but the on-screen selectors let you jump between the Fever, Pacers, and Sycamores. Each entry points to a preset so the module automatically retrieves the correct ESPN identifiers, logos, and records for every league.

### Switching Teams

Use `teamSelections` to declare which presets you want to load first, then pick your starting league with `config.league`. The on-screen team dropdown always lists every preset for the active league, so you can experiment at runtime without editing `config.js`. When you need a team that is not in the preset catalog you can fall back to explicit identifiers. The ESPN endpoints expect the identifiers used on `espn.com`. Some common examples:

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

When you supply `teamSelections`, the module automatically pulls logos and season records from ESPN for each league you enable. You can override any piece individually by setting `teamPreset`, the `team` helper, or the related explicit options (`favoriteTeamId`, `favoriteTeamDisplayName`, etc.). Leagues you leave out fall back to their default presets but can still be enabled through `availableLeagues` if you want to surface their dropdown entries.

### Switching Leagues On-Screen

If `enableLeagueSwitch` is true and `availableLeagues` contains at least two entries, the module renders a touch-friendly dropdown on the top-right of the selected-team banner. Picking a league from the selector reloads the module with the appropriate defaults and immediately fetches fresh data—no need to edit `config.js` when you want to peek at another league.

The league selector is paired with a team dropdown for the active league. It lists every preset for that sport so you can flip between teams with a tap; the choice persists thanks to `teamSelections`, and you can still override the identifiers manually if a preset is missing.

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

