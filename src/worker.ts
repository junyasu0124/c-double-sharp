import { convert } from "./convert";

self.addEventListener('message', (e) => {
  try {
    const converted = convert(e.data);
    self.postMessage(converted);
  } catch (error: any) {
    self.postMessage({ error });
  }
});
