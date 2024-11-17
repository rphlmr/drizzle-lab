# Drizzle Run

![drizzle-run-app](https://github.com/rphlmr/drizzle-run/assets/20722140/03c97e54-d15a-4ca9-8ae1-53bf97337dbd)

> [!NOTE]
> Documentation is WIP

## Development

Run the Vite dev server:

```shellscript
npm run dev
```

## Deployment

First, build your app for production:

```sh
npm run build
```

Then run the app in production mode:

```sh
npm start
```

Now you'll need to pick a host to deploy it to.

### DIY

If you're familiar with deploying Node applications, the built-in Remix app server is production-ready.

Make sure to deploy the output of `npm run build`

- `build/server`
- `build/client`
