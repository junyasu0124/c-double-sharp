export { findLast, findLastIndex, debounce, delay, repaint };

function findLast<T>(array: T[], predicate: (value: T, index: number, array: T[]) => boolean): T | undefined {
  for (let i = array.length - 1; i >= 0; i--) {
      if (predicate(array[i], i, array)) {
          return array[i];
      }
  }
  return undefined;
}

function findLastIndex<T>(array: T[], predicate: (value: T, index: number, obj: T[]) => boolean, startIndex?: number, thisArgs?: any): number {
  for (let i = startIndex ? startIndex : (array.length - 1); i >= 0; i--) {
    if (predicate.call(thisArgs, array[i], i, array)) {
      return i;
    }
  }
  return -1;
}

type DebounceFunction = (...args: any[]) => void;
function debounce<T extends DebounceFunction>(func: T, wait: number, immediate: boolean = false): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (this: ThisParameterType<T>, ...args: Parameters<T>): void {
    const callNow = immediate && timeoutId === null;

    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (!immediate) {
        func.apply(this, args);
      }
    }, wait);

    if (callNow) {
      func.apply(this, args);
    }
  } as T;
}

function delay(milliseconds: number) {
  return new Promise(function (resolve) {
    setTimeout(resolve, milliseconds);
  });
}

async function repaint() {
  await new Promise(resolve => requestAnimationFrame(resolve));
  await new Promise(resolve => requestAnimationFrame(resolve));
}
