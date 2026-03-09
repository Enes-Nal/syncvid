const scriptPromises = new Map<string, Promise<void>>();

export function loadScript(src: string) {
  const existing = scriptPromises.get(src);
  if (existing) {
    return existing;
  }

  const promise = new Promise<void>((resolve, reject) => {
    const found = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (found) {
      if (found.dataset.loaded === "true") {
        resolve();
        return;
      }
      found.addEventListener("load", () => resolve(), { once: true });
      found.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true }
    );
    script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
    document.head.appendChild(script);
  });

  scriptPromises.set(src, promise);
  return promise;
}
