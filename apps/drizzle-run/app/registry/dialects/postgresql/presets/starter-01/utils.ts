/**
 * Here you can write any utilities you want to use in the playground
 * 💡Tip: you can use the `$` global variable to access goodies
 */
import { sql } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";

type SupabaseToken = {
  iss?: string;
  sub?: string;
  aud?: string[] | string;
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
  role?: string;
};

export function createDrizzle<Database extends PgDatabase<any, any, any>, Token extends SupabaseToken = SupabaseToken>(
  token: Token,
  { admin, client }: { admin: Database; client: Database },
) {
  return {
    admin,
    rls: (async (transaction, ...rest) => {
      return client.transaction(
        async (tx) => {
          // Supabase exposes auth.uid() and auth.jwt()
          // https://supabase.com/docs/guides/database/postgres/row-level-security#helper-functions

          await tx.execute(sql`
          -- auth.uid()
          select set_config('request.jwt.claim.sub', '${sql.raw(token.sub ?? "")}', TRUE);												
          `);
          await tx.execute(sql`
          -- role
            set local role postgres;											
          `);
          await tx.execute(sql`
          -- role
            set local role ${sql.raw(token.role ?? "anon")};											
          `);

          const result = await transaction(tx);
          await tx.execute(sql`
            -- reset
            select set_config('request.jwt.claim.sub', NULL, TRUE);
            `);
          await tx.execute(sql`
            -- reset
            reset role;
            `);
          return result;
        },
        ...rest,
      );
    }) as typeof client.transaction,
  };
}
