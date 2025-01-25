const colors = {
  red: (str: string) => `\x1b[31m${str}\x1b[0m`,
  white: (str: string) => `\x1b[37m${str}\x1b[0m`,
  gray: (str: string) => `\x1b[90m${str}\x1b[0m`,
  black: (str: string) => `\x1b[30m${str}\x1b[0m`,
  yellow: (str: string) => `\x1b[33m${str}\x1b[0m`,
  bold: (str: string) => `\x1b[1m${str}\x1b[0m`,
};

const bg = {
  red: (str: string) => `\x1b[41m${str}\x1b[0m`,
  gray: (str: string) => `\x1b[100m${str}\x1b[0m`,
  yellow: (str: string) => `\x1b[43m${str}\x1b[0m`,
};

export const withStyle = {
  error: (str: string) =>
    `${colors.red(`${bg.red(colors.white(" Invalid input "))} ${str}`)}`,
  warning: (str: string) => `${bg.gray(colors.white(" Warning "))} ${str}`,
  errorWarning: (str: string) =>
    `${colors.red(`${bg.red(colors.white(" Warning "))} ${str}`)}`,
  fullWarning: (str: string) =>
    `${bg.yellow(colors.black(" Warning "))} ${colors.bold(str)}`,
  suggestion: (str: string) =>
    `${bg.gray(colors.white(" Suggestion "))} ${str}`,
  info: (str: string) => `${colors.gray(str)}`,
};
