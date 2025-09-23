# MMM-LiveStats

MMM-LiveStats is a MagicMirror² module that tracks your favorite basketball program with real-time box scores and a steady stream of upcoming matchups. It supports a single league at a time—NCAA men's basketball, the NBA, or the WNBA—so you can dedicate the mirror space to the team that matters most. When a game is live you will see animated alerts, live scores, and player statistics; between games the module always highlights the next three contests on the schedule. A touch-friendly league switcher makes it easy to hop between leagues right on the mirror.

## Features

- Works with NCAA men's basketball, NBA, and WNBA teams using ESPN's public data feeds (no API key required).
- Always-on upcoming schedule that shows the next three games even when no live event is in progress.
- Flashing red live indicator on the stats table whenever your team is playing.
- Team crests and color logos for your favorite team and every opponent.
- Favorite-team banner with medium-sized crest and the current season record.
- Scoreboard that keeps both teams' scores, names, and logos front and center.
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
    league: "ncaa_mbb", // "nba" or "wnba" are also supported
    team: {
      id: "282", // Indiana State Sycamores by default
      displayName: "Indiana State Sycamores",
      shortDisplayName: "Indiana State"
    },
    teamPreset: "", // optional helper such as "indiana_pacers" or "las_vegas_aces"
    availableLeagues: ["ncaa_mbb", "nba", "wnba"], // order controls the on-screen switcher
    enableLeagueSwitch: true,
    updateInterval: 5 * 60 * 1000,
    maxUpcoming: 3
  }
}
```

### Configuration Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `league` | `string` | `"ncaa_mbb"` | Determines which league to display. Supported values: `"ncaa_mbb"` for NCAA men's basketball, `"nba"` for the NBA, and `"wnba"` for the WNBA. Only one league can be active at a time. |
| `team` | `object` | `{ id: "282", displayName: "Indiana State Sycamores", shortDisplayName: "Indiana State" }` | Helper object that seeds the favorite team information. Values supplied here populate `favoriteTeamId`, `favoriteTeamDisplayName`, and `favoriteTeamShortDisplayName`. |
| `teamPreset` | `string` | `""` | Convenience shortcut that fills the `team` helper for you. Available presets include `"indiana_state"`, `"purdue"`, `"kansas"`, `"indiana_pacers"`, `"denver_nuggets"`, `"boston_celtics"`, `"indiana_fever"`, `"las_vegas_aces"`, and `"new_york_liberty"`. |
| `favoriteTeamId` | `string` | League-specific default | Overrides the team ID used in API calls. When omitted, the module falls back to `team.id` and then the league default (`282` for NCAA, `ind` for WNBA). |
| `favoriteTeamDisplayName` | `string` | League-specific default | Overrides the friendly team name shown in the UI. |
| `favoriteTeamShortDisplayName` | `string` | League-specific default | Optional shorter label used in compact areas such as headings. |
| `headerText` | `string` | `<Team Name> Live Stats` | Custom text displayed in the MagicMirror module header. When omitted the module builds a header from the favorite team name. |
| `updateInterval` | `number` | `300000` | Polling frequency in milliseconds. The module enforces a minimum interval of 60 seconds. |
| `maxUpcoming` | `number` | `3` | Number of upcoming games to display (minimum of 1). |
| `availableLeagues` | `array` or `string` | `["ncaa_mbb","nba","wnba"]` | Controls which leagues appear when cycling with the on-screen button. Accepts an array or a comma/space separated string of league keys. |
| `enableLeagueSwitch` | `boolean` | `true` | Toggles the on-screen league switch button. Set to `false` to hide it entirely. |

### Switching Teams

Use `config.league` together with either `teamPreset` or the `team` helper to follow a different school or franchise. The ESPN endpoints expect the identifiers used on `espn.com`. Some common examples:

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

When you supply a `team` helper object—or select one of the built-in `teamPreset` keys—the module automatically pulls logos and season records from ESPN and adapts the header text. You can override any piece individually by setting the related option (`favoriteTeamId`, `favoriteTeamDisplayName`, etc.).

### Switching Leagues On-Screen

If `enableLeagueSwitch` is true and `availableLeagues` contains at least two entries, the module renders a touch-friendly button underneath the favorite-team banner. Tapping or clicking the button cycles through the configured leagues in order, reloads the module with the appropriate defaults, and immediately fetches fresh data—no need to edit `config.js` when you want to peek at another league.

## Data Sources

MMM-LiveStats uses public ESPN endpoints—no API key is required:

- NCAA Men's Basketball: `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams/{teamId}/schedule`
- NBA: `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/{teamId}/schedule`
- WNBA: `https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/teams/{teamId}/schedule`
- Game summaries (all leagues): `https://site.api.espn.com/apis/site/v2/sports/basketball/{leaguePath}/summary?event={eventId}`

Replace `{leaguePath}` with `mens-college-basketball`, `nba`, or `wnba` to match the active league.

The module gracefully handles data or network errors by displaying a readable message in the MagicMirror interface.

## License

MIT – see the [LICENSE](LICENSE) file for details.

