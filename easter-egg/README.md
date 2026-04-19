# Easter Egg Idea

## Concept

Hidden mini-game inside the app.

The user taps a cheeky hidden logo near the bottom of the main menu.
That opens a retro arcade mini-game inspired by Frogger.

## Game Pitch

Instead of crossing traffic, the player is a runner trying to cross a crowded trail to reach a friend at the far end.

- The trail is 10 rows deep.
- Each row has moving people crossing left or right.
- The player can move:
  - forward
  - backward
  - left
  - right
- If the player runs into another person, they trip, fall, lose a life, and restart from the beginning.
- At the far end, the friend is jumping up and down and waving the player over.

## Suggested Version 1

- Hidden button or logo entry point on the main menu
- New `easterEgg` screen in the app
- Simple grid-based movement
- 3 lives
- 10 moving crowd rows
- Different crowd speeds by row
- Collision detection by tile
- Win screen when the player reaches the friend
- Retro 80s arcade look to match the rest of the app

## Recommended Technical Approach

- Keep it as a self-contained React Native screen
- Use a tile/grid system instead of a physics engine
- Use a timer/game loop for crowd movement
- Use simple sprite images or styled views for:
  - runner
  - crowd
  - friend
- Use on-screen movement buttons instead of gestures for version 1

## Why This Approach

- Faster to build
- Easier to debug
- Matches the current app architecture
- Keeps the mini-game isolated from the core shoe and Health features

## Status

Idea saved for later. Not implemented yet.
