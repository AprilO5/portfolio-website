# StreamScout

StreamScout is a Netflix-inspired React application that helps users search TV and streaming titles, compare details, and save a watchlist.

## Setup Instructions

Open `index.html` in a browser, or visit the deployed GitHub Pages URL:

https://aprilo5.github.io/portfolio-website/netflix-react-api-app/

No installation is required because the app loads React from an ES module CDN.

## API Used

The app uses the public TVmaze API:

- Search endpoint: `https://api.tvmaze.com/search/shows?q={query}`
- Example endpoint: `https://api.tvmaze.com/search/shows?q=netflix`

The original research target was a Netflix API listing, but that listing points to Netflix internal/open-source services rather than a simple browser-friendly public catalog endpoint. TVmaze was selected because it is free, public, and does not require an API key.

## Features

- Dynamic fetch to an external API
- Loading, error, empty, and success display states
- Search by title or keyword
- Genre filtering and result sorting
- Detail modal for each title
- Local watchlist using browser storage
- Three app views: Search, Watchlist, and About

## Known Challenges

- TVmaze does not guarantee that every result is available on Netflix.
- Some API results do not include poster images or ratings, so the UI handles missing data gracefully.
