# Customization reference

The app has three portable customization surfaces: interface wording, roster files, and marble level files. Runtime edits are stored in the current browser; exported JSON files move data between computers.

## Interface wording

[`app/ui-text.json`](../app/ui-text.json) is the single checked-in source for editable main-menu and wheel wording.

```json
{
  "mainMenu": {
    "eyebrow": "RANDOM SELECTOR",
    "titleFirstLine": "Up next!",
    "titleSecondLine": "Let chance decide."
  },
  "wheelScreen": {
    "spinButton": "SPIN THE WHEEL",
    "winnerBanner": "THE GAME HAS SPOKEN"
  }
}
```

Keep every existing key. The application safely merges older saved browser text with newly added defaults, but the checked-in JSON must be complete. In-app red-dot editors save to local storage under `random-selector-game-room-text-v3`.

After editing the file, use `npm run dev` for live reload or restart `npm start` to rebuild the production app.

## Roster file

The preferred versioned format is:

```json
{
  "version": 1,
  "members": [
    {
      "name": "Alex North",
      "nickname": "Alex",
      "image": "/portraits/alex-north.jpg",
      "eligible": true
    }
  ]
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | Yes | Unique ignoring case; 1–120 characters |
| `nickname` | string | No | Displayed instead of the full name; up to 80 characters |
| `image` | string | No | Local path, data URL, or browser-accessible URL; up to 2,048 characters |
| `eligible` | boolean | No | Defaults to `true`; `false` keeps the person out of both games |

The app accepts 1–100 members. It also accepts a raw member array and a simple string array such as `["Alex", "Jordan"]`. Exports always use the versioned object format.

### Local portraits

1. Copy `.jpg`, `.jpeg`, `.png`, `.webp`, or `.svg` files into `public/portraits/`.
2. Set the roster path to `/portraits/filename.jpg`.
3. Match capitalization exactly for Linux compatibility.

Broken paths use an initials fallback. Remote URLs require internet access, so local files are recommended for offline meetings.

The in-app roster is stored under `random-selector-game-room-roster-v1`. Export before clearing browser data or moving to another machine.

## Level files

Level exports use version `1`:

```json
{
  "version": 1,
  "name": "Tool Booth Classic",
  "width": 1000,
  "height": 10500,
  "finishY": 10250,
  "start": {
    "x": 500,
    "y": 230,
    "outerRadius": 190,
    "innerRadius": 75
  },
  "background": "#68d3e4",
  "rails": [],
  "pegs": [],
  "spinners": [],
  "cannons": [],
  "labels": []
}
```

### Collections

| Object | Required numeric fields | Other fields |
|---|---|---|
| Rail | `ax`, `ay`, `bx`, `by`, `width` | `id`, `color`, optional `platform` |
| Peg / bumper | `x`, `y`, `radius` | `id`, `color`, optional `bounce`, `kick` |
| Spinner | `x`, `y`, `length`, `arms`, `speed` | `id`, optional `color`; 1–32 integer arms |
| Cannon | `x`, `y`, `minAngle`, `maxAngle`, `phase`, `delay`, `interval`, `speed` | `id`, `color`, optional positive `distance` |
| Label | `x`, `y` | `id`, `text` up to 200 characters |

Object IDs must be unique. Width is limited to 500–10,000 pixels; height to 1,200–100,000 pixels. The editor rejects malformed JSON, unsupported versions, missing collections, duplicate IDs, invalid dimensions, and unsafe collection sizes without replacing the current draft.

### Editor controls

- Pick a palette tool, then click the course to place an object.
- Drag while placing a rail to set its endpoint.
- Choose **Select**, then drag an object to move it.
- Use the inspector for exact values, duplication, and deletion.
- Scroll inside the course viewport. The surrounding page stays fixed.
- Set **Test** from 1 to 100, then choose **Run**.
- Export before resetting to the default course.
