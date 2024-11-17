/**
 * Split SQL statements from a SQL dump
 * @param sqlDump - SQL dump
 * @returns SQL statements
 */
export function splitSqlStatements(sqlDump: string): string[] {
  const statements: string[] = [];
  let currentStatement = "";
  let inBlock = false;

  for (const line of sqlDump.split("\n")) {
    currentStatement += line + "\n";

    if (line.trim().startsWith("DO $$")) {
      inBlock = true;
    }

    if (inBlock && line.trim() === "END $$;") {
      inBlock = false;
      statements.push(currentStatement.trim());
      currentStatement = "";
    } else if (!inBlock && line.trim().endsWith(";")) {
      statements.push(currentStatement.trim());
      currentStatement = "";
    }
  }

  if (currentStatement.trim()) {
    statements.push(currentStatement.trim());
  }

  return statements;
}

export function escapeSingleQuotes(str: string) {
  return str.replace(/'/g, "''");
}
