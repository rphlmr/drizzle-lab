import { firstNames, lastNames, loremWords } from "./dictionary";

/* -------------------------------------------------------------------------- */
/*                              Random generator                              */
/* -------------------------------------------------------------------------- */

const random = {
  /**
   * Generates a random UUID
   */
  uuid() {
    return crypto.randomUUID();
  },
  /**
   * Generates a random integer between min and max
   * @param min The minimum value (default: -10_000)
   * @param max The maximum value (default: 10_000)
   */
  integer(min = -10_000, max = 10_000) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
  /**
   * Generates a sequence of integers from 0 to length - 1
   * @param length The length of the array
   *
   * @example
   * ```
   * $.random.sequence(5) // [0, 1, 2, 3, 4]
   * ```
   */
  sequence(length: number) {
    return Array.from({ length }, (_, i) => i);
  },
  /**
   * Generates a random decimal between min and max
   * @param min The minimum value (default: -10_000)
   * @param max The maximum value (default: 10_000)
   */
  decimal(min = -10_000, max = 10_000) {
    return (Math.random() * (max - min) + min).toFixed(2);
  },
  /**
   * Generates a random string of lorem ipsum words
   * @param wordCount The number of words to generate (default: 5)
   */
  lorem(wordCount: number = 5): string {
    return Array.from({ length: wordCount }, () => loremWords[Math.floor(Math.random() * loremWords.length)]).join(" ");
  },
  /**
   * Generates a random first name
   */
  firstName(): string {
    return firstNames[Math.floor(Math.random() * firstNames.length)];
  },
  /**
   * Generates a random last name
   */
  lastName(): string {
    return lastNames[Math.floor(Math.random() * lastNames.length)];
  },
  /**
   * Generates a random full name
   */
  fullName(): string {
    return `${this.firstName()} ${this.lastName()}`;
  },
  /**
   * Generates a random email address
   */
  email(): string {
    const chars = "abcdefghijklmnopqrstuvwxyz";
    const length = this.integer(5, 10);
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const number = this.integer(0, 999);
    return `${result}${number}@email.com`;
  },
  /**
   * Generates a random date between start and end
   * @param start The start date (default: 1970-01-01)
   * @param end The end date (default: current date)
   */
  date(start: Date = new Date(1970, 0, 1), end: Date = new Date()): Date {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  },
  /**
   * Generates a random URL
   */
  url(): string {
    const domainName = this.lorem(1).toLowerCase();
    return `https://www.${domainName}.com`;
  },
  /**
   * Generates a random image URL
   */
  imageUrl(): string {
    const id = this.integer(0, 99);
    return `https://picsum.photos/id/${id}/200/200`;
  },
  /**
   * Generates an array
   * @param length The length of the array
   * @param generator The generator function
   *
   * @example
   * ```
   * $.random.array(4, $.random.date)
   * ```
   */
  array<T extends () => unknown>(length: number, generator: T) {
    return Array.from({ length }, () => generator()) as ReturnType<T>[];
  },
} as const;

/* ------------------------------------------------------------------------- */
/*                                   Utils                                   */
/* ------------------------------------------------------------------------- */

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type PlaygroundTools = {
  random: typeof random;
  wait: typeof wait;
};

declare global {
  // eslint-disable-next-line no-var
  var $: PlaygroundTools;

  interface Window {
    $: PlaygroundTools;
  }
}

export const PlaygroundTools = {
  random,
  wait,
};
