/**
 * Read flag values from a CLI argv in either form — `--flag value` or `--flag=value`.
 * Format parity itself is pinned by the exact-args test in compat/cli-args.test.ts.
 */
export function argValues(args: readonly string[], flag: string): string[] {
  const values: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === flag && i + 1 < args.length) values.push(args[i + 1]);
    else if (args[i].startsWith(`${flag}=`)) values.push(args[i].slice(flag.length + 1));
  }
  return values;
}

/** First value of `flag`, or undefined. */
export function argValue(args: readonly string[], flag: string): string | undefined {
  return argValues(args, flag)[0];
}

/** Whether `flag` appears at all, bare or as `--flag=value`. */
export function hasFlag(args: readonly string[], flag: string): boolean {
  return args.some((a) => a === flag || a.startsWith(`${flag}=`));
}
