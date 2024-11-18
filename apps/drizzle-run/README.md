# Drizzle Run

![drizzle-run-app](https://github.com/rphlmr/drizzle-run/assets/20722140/03c97e54-d15a-4ca9-8ae1-53bf97337dbd)

> [!NOTE]
> Documentation is WIP

## How to run it locally

> [!IMPORTANT]
> [Install Supabase CLI to self host Supabase](https://supabase.com/docs/guides/local-development/cli/getting-started)

___

> [!IMPORTANT]
> To use GitHub auth, you need to create an OAuth app on GitHub and add the client ID and secret to the `.env` file at the **root** of the project.
> 
> [Follow the docs](https://supabase.com/docs/guides/auth/social-login/auth-github)
> 
> ```env
> SUPABASE_AUTH_GITHUB_CLIENT_ID=
> SUPABASE_AUTH_GITHUB_SECRET=
> ```
> Once done, you can restart the Supabase project with `supabase stop` and `supabase start`.

___

1. Start Supabase locally with `supabase start` and wait until it's done.
2. Create a `.env` file with the required variables by running `cp .env.example .env`. It already contains all the required environment variables and their values.
   * NB: `DATABASE_URL_MIGRATE`, on production, it should point to the port `5432` of your db instance.
3. `npm install`
4. `cd apps/drizzle-run`
5. Apply Drizzle migrations `npm run db:server:migration:deploy`
6. Run `npm run dev` to start the development server

It's a npm workspace monorepo, everything is linked together so if you make changes to `packages/*`, they will be reflected in the app.
