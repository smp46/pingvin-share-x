import { getRandomNumber } from "./crypto.util";

// Reference :- https://github.com/bitwarden/jslib/blob/master/common/src/services/passwordGeneration.service.ts#L516
export function shuffleArray<T>(array: T[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = getRandomNumber(0, i);
    [array[i], array[j]] = [array[j], array[i]];
  }
}
