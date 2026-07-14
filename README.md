# Random Selector Game Room

A local, browser-based random selector for meetings and streams. Spin the **Decision Wheel** or race up to 100 portrait marbles through the physics-based **Marble Pursuit** course. It includes a roster editor, level editor, presentation mode, local placeholder portraits, and no backend.

Everything runs on your computer. After the first dependency install, the games do not need internet access.

## Quick start

### 1. Install Node.js

Install [Node.js 22](https://nodejs.org/) (the LTS release). This repository pins version **22.13.0** in `.nvmrc` and `.node-version`.

### 2. Start the game

Use the launcher for your operating system from the project folder:

| System | Easiest launch | Terminal command |
|---|---|---|
| Windows | Double-click `start.cmd` | `start.cmd` |
| Windows PowerShell | Right-click `start.ps1`, then **Run with PowerShell** | `.\start.ps1` |
| macOS | Double-click `start.command` | `./start.command` |
| Linux | Open a terminal in the folder | `./start.sh` |

The first launch installs exact dependency versions, builds the app, and starts it. Open [http://127.0.0.1:4173](http://127.0.0.1:4173) after the launcher reports that the app is ready. Press `Ctrl+C` in the launcher window to stop.

Prefer npm? The equivalent one-command workflow is:

```bash
npm start
```

## Use the games

- Choose **Edit Roster** to add people, change names or nicknames, add portrait paths, and unselect anyone who should not appear. It can also generate a unique random name and placeholder portrait, or clear the entire draft roster before you rebuild or import it.
- Choose **Decision Wheel**, then select **Spin the Wheel** or drag the wheel with a pointer.
- Choose **Marble Pursuit**, then select **Release Marbles** or press `Space`.
- In a race, the first finisher wins, but the simulation continues so later places can finish. Select **Leaderboard** after the race for every recorded time.
- Choose **Present** or press `P` to hide editing controls and enter a cleaner broadcast view.

## Customize it

### Roster and portraits

The in-app roster editor is the easiest option. **Export JSON** creates a portable backup; **Import JSON** restores it on another computer. Unselected people remain in the file with `"eligible": false`.

The bundled public sample lives in [`app/default-roster.json`](app/default-roster.json). Put your own images in `public/portraits/` and use paths such as `/portraits/alex.jpg`. A missing or broken image automatically becomes an initials portrait.

See [Customization reference](docs/CUSTOMIZATION.md#roster-file) for the full format and limits.

### Wording

All editable main-menu and wheel wording lives in one file: [`app/ui-text.json`](app/ui-text.json). You can also select the small red dot beside the page label and edit wording inside the app. Browser edits are saved only on that device and take precedence over the checked-in defaults.

### Marble levels

Open **Level Editor** from Marble Pursuit. Pick an object type, click the course to place it, or drag an existing object in Select mode. The editor can import and export versioned JSON levels and test from 1 to 100 marbles. The checked-in default is [`app/default-level.json`](app/default-level.json).

See [Customization reference](docs/CUSTOMIZATION.md#level-files) for supported level objects and validation rules.

## Share over Zoom

For the clearest broadcast:

1. Use a current Chrome or Edge window at **1366×768** or **1280×720**, with browser zoom at 100%. Current Firefox and Safari are also supported.
2. Select **Present** in the game room. You can press `P` at any time to enter or leave presentation mode.
3. In Zoom, share the browser window rather than the whole desktop.
4. Leave **Optimize for video clip** off for sharper names and standings. Turn it on only if animation is choppy for viewers.
5. Enable **Share sound** only if you want viewers to hear wheel ticks or future game audio.

Names, timers, standings, and winner notices use high-contrast broadcast sizing. Normal gameplay does not require page scrolling at common laptop, desktop, and projector resolutions.

## Keyboard and accessibility

- `Space`: start a marble race when focus is not inside a form control.
- `P`: toggle presentation mode.
- `Escape`: close roster and text dialogs; cancel an active editor build tool.
- `Delete` or `Backspace`: remove the selected level object when focus is not in a field.
- `Tab` / `Shift+Tab`: move through buttons, fields, and the scrollable course.

The app provides visible focus styles, labels for controls, portrait fallbacks, and reduced-motion winner effects when the operating system requests reduced motion.

## Update the project

If you cloned with Git:

```bash
git pull
npm ci
npm start
```

If you received a ZIP, export your roster and any custom levels first, replace the old project folder with the new ZIP contents, then import your files.

## Troubleshooting

### “Node is not installed” or “Node.js 22.13.0 or newer is required”

Install Node.js 22 from [nodejs.org](https://nodejs.org/), close the terminal, and launch again.

### PowerShell blocks `start.ps1`

Use `start.cmd`, or run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once in PowerShell if your organization permits it.

### Port 4173 is already in use

Close the other launcher window. Developers can use `npm run dev -- --port 5174` for another port.

### A portrait is missing

Confirm the file is inside `public/portraits/`, the filename capitalization matches, and the roster path begins with `/portraits/`. Initials appear until the path is fixed.

### Roster or level import fails

The on-screen error identifies malformed JSON, duplicate names, unsupported versions, or invalid level fields. Start from [`examples/roster-template.json`](examples/roster-template.json) or export a known-good file from the app.

### Changes disappeared after refresh

Some private browsing modes disable local storage. Export roster and level files before closing the tab, or use a normal browser window.

### The app must run without internet

Run `npm ci` once while connected. Future builds, launches, portraits, games, and exports are local.

## Development

```bash
npm ci
npm run dev
```

Before submitting changes, run:

```bash
npm run check
```

The CI workflow runs linting, all 33 automated tests, a production build, and a real production-startup check on Windows, macOS, and Linux.

## Documentation

- [Customization reference](docs/CUSTOMIZATION.md)
- [Architecture and removed code](docs/ARCHITECTURE.md)
- [Performance report](docs/PERFORMANCE.md)
- [Contributing](CONTRIBUTING.md)

Licensed under the [MIT License](LICENSE).
