This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/pages/api-reference/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.js`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.js`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) instead of React pages.

This project uses [`next/font`](https://nextjs.org/docs/pages/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn-pages-router) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/pages/building-your-application/deploying) for more details.
# Dawai Sahi

Medicine brand lookup for India, with generic composition results from Eka Care and a PMBJP / Jan Aushadhi price comparison.

## Configure the medicine lookup

1. Request access to Eka Care's Indian branded medicine search API and obtain a JWT. The endpoint used is `https://api.eka.care/eka-mcp/medications/v1/search` with the `drug_name` query parameter and a Bearer token.
2. Copy `.env.local.example` to `.env.local` and set `EKA_API_TOKEN` to the JWT. Keep the token on the server; the browser calls this app's `/api/medicine` route and never receives the secret.
3. Restart the Next.js development server.

## Add official PMBJP prices

PMBI publishes a searchable Product & MRP list on [pmbi.co.in/ProductList.aspx](https://www.pmbi.co.in/ProductList.aspx) and the [Jan Aushadhi product list](https://janaushadhi.gov.in/product-portfolio/product-view-list). This project uses a local JSON copy because PMBI does not document a public JSON API. Export/download the current official list, then enter or convert each matching product in `src/data/pmbjp-products.json` using this shape:

```json
[
  {
    "drugCode": "official PMBI drug code",
    "name": "Product name from current PMBI list",
    "genericName": "Active ingredient or ingredients",
    "strength": "Strength exactly as listed",
    "packSize": "Official unit / pack size",
    "mrp": 0.00
  }
]
```

Replace the example values with verified current list data; do not treat the blank starter file as a price catalogue. Refresh it when PMBI updates its list. The app only compares Jan Aushadhi prices when a matching record is present. Generic-price matching should be reviewed for combination medicines and strength/form differences before presenting a result as equivalent.

The branded pack price is currently entered by the user because Eka Care's documented search response provides medicine name, generic name, manufacturer and product type, but not a retail price. The comparison is only meaningful when the branded and PMBJP pack prices use the same pack size; the app labels the branded price as user-entered.
