# MMM-WNBAFeverStats

MagicMirror² module that keeps WNBA fans up to date with live player statistics and the next scheduled games for any favorite team. When the selected team is on the court the module shows real-time box score details for every player, complete with a flashing indicator so you immediately know a game is in progress. Between games the next three matchups are always visible so you always know when to tune in.

## Features

- Live game detection powered by the public ESPN WNBA API.
- Animated live game indicator that pulses whenever your team is playing.
- Player level stat lines for points, rebounds, assists, and steals.
- Automatic scoreboard with full-color team logos, opponent info, venue, and current game clock description.
- Favorite team crest and current season record featured at the top of the module.
- Upcoming schedule list that always shows the next three matchups, complete with opponent logos, even during live games.
- Configurable favorite team identifier, title text, and update interval.
- Optional team helper object that makes it easy to switch the module to any other WNBA franchise.

## Installation

Copy and paste the commands below on your MagicMirror² host (including Raspberry Pi OS on a Raspberry Pi 5) to clone the repository and install its dependencies:

```bash
cd ~/MagicMirror/modules && \
  git clone https://github.com/pcheek13/MMM-WNBAFeverStats && \
  cd MMM-WNBAFeverStats && \
  npm install
```

> **Note:** The module depends on the public ESPN API. Depending on your network setup you may need to allow outbound HTTPS requests for the MagicMirror² host.

After installation, configure the module in `config/config.js` as shown below.

## Configuration

Add the module to the `modules` array in your MagicMirror `config.js` file:

```javascript
{
  module: "MMM-WNBAFeverStats",
  position: "top_left",
  config: {
    team: {
      id: "ind", // ESPN identifier for your favorite WNBA franchise
      displayName: "Indiana Fever"
    },
    favoriteTeamId: "ind", // Optional: overrides team.id if provided
    favoriteTeamDisplayName: "Indiana Fever", // Optional: overrides team.displayName
    headerText: "Indiana Fever Live Stats",
    updateInterval: 5 * 60 * 1000, // 5 minutes
    maxUpcoming: 3
  }
}
```

### Configuration Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `team` | `object` | `{ id: "ind", displayName: "Indiana Fever" }` | Optional helper object that lets you define both the team schedule identifier (`team.id`) and a friendly name (`team.displayName`). Values supplied here automatically populate the `favoriteTeamId`, `favoriteTeamDisplayName`, and `headerText` defaults, and the module will pull the appropriate logo and record for your favorite franchise. |
| `favoriteTeamId` | `string` | `"ind"` | Team identifier used by the ESPN API. The default is the Indiana Fever. |
| `favoriteTeamDisplayName` | `string` | `"Indiana Fever"` | Friendly team name used within the UI. |
| `headerText` | `string` | `"Indiana Fever Live Stats"` | Custom header text displayed by MagicMirror². |
| `updateInterval` | `number` | `300000` | Refresh interval in milliseconds. Minimum enforced interval is 60 seconds. |
| `maxUpcoming` | `number` | `3` | Maximum number of upcoming games to show in the schedule list. |

### Switching Teams

The ESPN schedule endpoint expects the short team identifier used on `espn.com`. The table below lists the values for every current WNBA franchise. Set either `config.team.id` or `config.favoriteTeamId` to the identifier you need and adjust the display name to taste.

| Team | Identifier |
| ---- | ---------- |
| Atlanta Dream | `atl` |
| Chicago Sky | `chi` |
| Connecticut Sun | `conn` |
| Dallas Wings | `dal` |
| Indiana Fever | `ind` |
| Las Vegas Aces | `lv` |
| Los Angeles Sparks | `la` |
| Minnesota Lynx | `min` |
| New York Liberty | `ny` |
| Phoenix Mercury | `phx` |
| Seattle Storm | `sea` |
| Washington Mystics | `was` |

If you prefer to control the settings individually you can omit the `team` object and instead set `favoriteTeamId` and `favoriteTeamDisplayName` directly. The module automatically keeps the header text in sync with your chosen team unless you supply your own `headerText` value.

## Data Sources

All statistics and schedule information are fetched from the ESPN public WNBA endpoints:

- `https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/teams/{teamId}/schedule`
- `https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/summary?event={eventId}`

The ESPN endpoints are publicly accessible—no API key is required. The module gracefully handles network or data errors by showing an error message in the MagicMirror² interface.

## Development Notes

- The Node helper caches the module configuration and polls the ESPN API at the configured interval.
- Player statistics are dynamically mapped based on the label names provided by the API so new fields can be added in the future with minimal changes.
- Upcoming game entries show whether your team is home (`vs`) or away (`@`), include opponent logos, and display the scheduled tip time using the MagicMirror host locale.

## License

MIT – see the [LICENSE](LICENSE) file for details.
