import chalk from "chalk";

export const withStyle = {
  error: (str: string) =>
    `${chalk.red(`${chalk.white.bgRed(" Invalid input ")} ${str}`)}`,
  warning: (str: string) => `${chalk.white.bgGray(" Warning ")} ${str}`,
  errorWarning: (str: string) =>
    `${chalk.red(`${chalk.white.bgRed(" Warning ")} ${str}`)}`,
  fullWarning: (str: string) =>
    `${chalk.black.bgYellow(" Warning ")} ${chalk.bold(str)}`,
  suggestion: (str: string) => `${chalk.white.bgGray(" Suggestion ")} ${str}`,
  info: (str: string) => `${chalk.grey(str)}`,
};
