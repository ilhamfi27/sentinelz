import { KEY_SEPARATOR } from "../constants/cache";

export function cacheKey(args: string[]): string {
  return args.join(KEY_SEPARATOR);
}
