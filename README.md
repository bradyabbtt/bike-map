# Waypoint Route Planner — Vercel Deployment

This folder is ready to deploy as a static HTML site with a Vercel Function that protects the OpenRouteService API key.

## Deploy

1. Create a new GitHub repository and upload everything in this folder, keeping `index.html`, `vercel.json`, and the `api` folder at the repository root.
2. In Vercel, choose **Add New → Project**, import the repository, and leave the Framework Preset as **Other**.
3. Before the production deployment, open **Project Settings → Environment Variables** and add:
   - Name: `ORS_API_KEY`
   - Value: your OpenRouteService API key
   - Environments: Production, Preview, and Development
4. Redeploy the project after saving the environment variable.

You can also deploy from this directory with the Vercel CLI:

```bash
npx vercel
```

Then add `ORS_API_KEY` in the Vercel dashboard and run:

```bash
npx vercel --prod
```

## Important

- Do not paste the ORS key into `index.html`.
- The map, address search, route generation, snapping, and elevation requests use `/api/ors`.
- Saved routes and custom waypoint names remain browser-local through `localStorage`.
- The page still loads Leaflet, fonts, and map tiles from their existing external providers.
