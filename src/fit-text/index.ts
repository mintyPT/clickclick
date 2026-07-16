import type { Page } from "playwright";
import type { FitTextTarget, RenderWarning } from "../types.js";

interface BrowserFitTarget {
  selector: string;
  minFontSize: number;
  maxFontSize?: number;
  onOverflow: "warn" | "error";
}

export function normalizeFitTextTargets(targets: FitTextTarget[] = []): BrowserFitTarget[] {
  return targets.map((target) => ({
    selector: target.selector,
    minFontSize: target.minFontSize ?? 12,
    maxFontSize: target.maxFontSize,
    onOverflow: target.onOverflow ?? "warn",
  }));
}

interface BrowserFitPayload {
  configuredTargets: BrowserFitTarget[];
}

export async function runTextFitting(page: Pick<Page, "evaluate">, targets: FitTextTarget[] = []): Promise<RenderWarning[]> {
  const normalizedTargets = normalizeFitTextTargets(targets);
  return page.evaluate<RenderWarning[], BrowserFitPayload>(
    ({ configuredTargets }: BrowserFitPayload) => {
      const attributeTargets = Array.from(document.querySelectorAll<HTMLElement>("[data-clickclick-fit]")).map((element) => ({
        element,
        selector: element.id ? `#${CSS.escape(element.id)}` : "[data-clickclick-fit]",
        minFontSize: Number(element.dataset.clickclickMinFontSize ?? 12),
        maxFontSize: element.dataset.clickclickMaxFontSize ? Number(element.dataset.clickclickMaxFontSize) : undefined,
        onOverflow: (element.dataset.clickclickOnOverflow === "error" ? "error" : "warn") as "warn" | "error",
      }));

      const configured = configuredTargets.flatMap((target) =>
        Array.from(document.querySelectorAll<HTMLElement>(target.selector)).map((element) => ({ element, ...target })),
      );

      const warnings: RenderWarning[] = [];
      for (const target of [...attributeTargets, ...configured]) {
        const min = Number.isFinite(target.minFontSize) ? target.minFontSize : 12;
        const computed = window.getComputedStyle(target.element);
        const max = target.maxFontSize && Number.isFinite(target.maxFontSize)
          ? target.maxFontSize
          : Number.parseFloat(computed.fontSize);

        let low = min;
        let high = Math.max(min, max);
        let best = min;
        target.element.style.fontSize = `${high}px`;

        for (let i = 0; i < 14; i += 1) {
          const mid = (low + high) / 2;
          target.element.style.fontSize = `${mid}px`;
          if (fits(target.element)) {
            best = mid;
            low = mid;
          } else {
            high = mid;
          }
        }

        target.element.style.fontSize = `${Math.floor(best * 100) / 100}px`;
        if (!fits(target.element)) {
          const warning = {
            code: "TEXT_FIT_OVERFLOW" as const,
            message: `Text still overflows at ${min}px.`,
            selector: target.selector,
            text: target.element.textContent?.trim() ?? "",
            onOverflow: target.onOverflow,
            minFontSize: min,
            widthOverflow: target.element.scrollWidth > target.element.clientWidth + 1,
            heightOverflow: target.element.scrollHeight > target.element.clientHeight + 1,
          };
          warnings.push(warning);
        }
      }

      return warnings;

      function fits(element: HTMLElement): boolean {
        return element.scrollWidth <= element.clientWidth + 1 && element.scrollHeight <= element.clientHeight + 1;
      }
    },
    { configuredTargets: normalizedTargets },
  ) as Promise<RenderWarning[]>;
}
