"use client";

import { FormEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import { publicEnv } from "@/env.public";
import { useHydrated } from "@/hooks/use-hydrated";
import { validateSubscriberInput, type SubscriberFieldErrors } from "@/modules/newsletter/client";
import { RecaptchaTestDoubleWidget } from "@/components/newsletter/recaptcha-test-double-widget";

interface NewsletterFormProps {
  /** 使用緊湊版型（適合側邊欄等狹窄空間） */
  compact?: boolean;
}

const RECAPTCHA_SCRIPT_SRC = "https://www.google.com/recaptcha/api.js";
const RECAPTCHA_SCRIPT_SELECTOR = `script[src^="${RECAPTCHA_SCRIPT_SRC}"]`;

/**
 * CAPTCHA 測試替身的特殊 site key 值（僅供 Playwright E2E，見 tasks.md 9.5）。
 * 只有在此值 **且** 非 production 建置時才渲染 {@link RecaptchaTestDoubleWidget}
 * 取代 Google 的 reCAPTCHA v2 widget；即使誤將此值設進 production 建置，
 * `publicEnv.NODE_ENV === "production"` 的檢查也會擋下 stub 渲染（fail closed，
 * 不新增 npm 依賴，也不呼叫 Google）。真正的安全邊界在伺服器端
 * `NEWSLETTER_CAPTCHA_TEST_DOUBLE` + `NODE_ENV` 閘控（見
 * `src/modules/newsletter/infrastructure/captcha/test-double.ts`）。
 */
const RECAPTCHA_TEST_DOUBLE_SITE_KEY = "e2e-test";

type Status = "idle" | "submitting" | "success" | "error";
type ErrorKind = "validation" | "captcha" | "rate-limit" | "generic" | null;

/** window.grecaptcha 的最小介面（reCAPTCHA v2 checkbox）。 */
type Grecaptcha = {
  render: (
    container: HTMLElement,
    params: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    }
  ) => number;
  reset: (widgetId?: number) => void;
};

declare global {
  interface Window {
    grecaptcha?: Grecaptcha;
  }
}

/** reCAPTCHA script 載入逾時（毫秒）：逾時仍無 grecaptcha 即視為載入失敗。 */
const RECAPTCHA_LOAD_TIMEOUT_MS = 10000;

type LoadRecaptchaHandlers = {
  onReady: () => void;
  /** script 載入失敗或逾時（例如被廣告攔截器／網路封鎖）時呼叫，供 UI 呈現可恢復入口。 */
  onError: () => void;
};

/**
 * 懶載入 Google reCAPTCHA script。除了 `load` 事件外，另監聽 `error` 事件並設定
 * 逾時：任一失敗路徑都會呼叫 `onError`，讓表單能顯示重新載入控制項，而非留下空白
 * widget。回傳一個 cleanup 函式以移除監聽器與計時器（供 effect 卸載或重試時呼叫）。
 */
function loadRecaptchaScript({ onReady, onError }: LoadRecaptchaHandlers): () => void {
  if (typeof document === "undefined") return () => {};
  if (window.grecaptcha) {
    onReady();
    return () => {};
  }

  let settled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const clearTimer = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };
  const handleLoad = () => {
    if (settled) return;
    settled = true;
    clearTimer();
    onReady();
  };
  const handleError = () => {
    if (settled) return;
    settled = true;
    clearTimer();
    onError();
  };

  const existing = document.querySelector<HTMLScriptElement>(RECAPTCHA_SCRIPT_SELECTOR);
  const script = existing ?? document.createElement("script");
  if (!existing) {
    script.src = `${RECAPTCHA_SCRIPT_SRC}?render=explicit`;
    script.async = true;
    script.defer = true;
  }
  script.addEventListener("load", handleLoad, { once: true });
  script.addEventListener("error", handleError, { once: true });
  if (!existing) document.head.appendChild(script);

  // 逾時 backstop：涵蓋 script 標籤已存在卻永遠不觸發 load/error 的被封鎖情境。
  timer = setTimeout(() => {
    if (window.grecaptcha) handleLoad();
    else handleError();
  }, RECAPTCHA_LOAD_TIMEOUT_MS);

  return () => {
    script.removeEventListener("load", handleLoad);
    script.removeEventListener("error", handleError);
    clearTimer();
  };
}

/**
 * Newsletter 訂閱表單。
 *
 * 狀態機：idle / submitting / success / error（validation / captcha / rate-limit / generic）。
 * 使用 Google reCAPTCHA v2 checkbox（懶載入 `recaptcha/api.js`，不新增 npm 依賴），
 * 送出前先做欄位驗證，再檢查 CAPTCHA token，最後才呼叫伺服器 API；所有狀態轉換透過
 * `aria-live` 宣告，label 不因狀態變化被取代（design.md D5）。
 */
export function NewsletterForm({ compact = false }: NewsletterFormProps) {
  // hydration gate：掛載完成前禁用輸入與送出，避免 controlled input 在
  // onChange 附掛前被寫值（值會停留在 SSR 初始 state）或送出走原生表單行為
  const hydrated = useHydrated();
  const containerId = useId();
  const nameId = useId();
  const emailId = useId();
  const statusId = useId();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<SubscriberFieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [errorKind, setErrorKind] = useState<ErrorKind>(null);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaExpired, setCaptchaExpired] = useState(false);
  const [captchaLoadFailed, setCaptchaLoadFailed] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const reverifyButtonRef = useRef<HTMLButtonElement>(null);
  const retryCaptchaButtonRef = useRef<HTMLButtonElement>(null);
  const widgetContainerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const loadCleanupRef = useRef<(() => void) | null>(null);

  const siteKey = publicEnv.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const captchaUnavailable = !siteKey;
  const isCaptchaTestDouble =
    siteKey === RECAPTCHA_TEST_DOUBLE_SITE_KEY && publicEnv.NODE_ENV !== "production";

  const initCaptcha = useCallback(() => {
    if (captchaUnavailable || isCaptchaTestDouble) return;
    setCaptchaLoadFailed(false);

    function tryRender() {
      if (widgetIdRef.current !== null) return;
      if (!window.grecaptcha || !widgetContainerRef.current) return;
      widgetIdRef.current = window.grecaptcha.render(widgetContainerRef.current, {
        sitekey: siteKey as string,
        callback: (token: string) => {
          setCaptchaToken(token);
          setCaptchaExpired(false);
        },
        "expired-callback": () => {
          setCaptchaToken(null);
          setCaptchaExpired(true);
        },
        "error-callback": () => {
          setCaptchaToken(null);
          setCaptchaExpired(true);
        },
      });
    }

    tryRender();
    loadCleanupRef.current?.();
    loadCleanupRef.current = loadRecaptchaScript({
      onReady: tryRender,
      onError: () => setCaptchaLoadFailed(true),
    });
  }, [captchaUnavailable, isCaptchaTestDouble, siteKey]);

  useEffect(() => {
    // 文章頁同時 SSR sidebar 與 stacked 兩個表單實例、以 CSS 依斷點只顯示其一。
    // CAPTCHA 只在本實例實際可見（進入 viewport；display:none 不會 intersect）
    // 時才初始化，避免同頁載入兩個 widget、effects 與第三方 iframe。
    // 無 IntersectionObserver（舊瀏覽器／jsdom）時退回立即初始化。
    const cleanupLoad = () => {
      loadCleanupRef.current?.();
      loadCleanupRef.current = null;
    };

    const target = widgetContainerRef.current;
    if (typeof IntersectionObserver === "undefined" || !target) {
      initCaptcha();
      return cleanupLoad;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          initCaptcha();
        }
      },
      // 提前於進入 viewport 前 200px 開始載入，避免使用者捲到表單時 widget 尚未就緒。
      { rootMargin: "200px" }
    );
    observer.observe(target);

    return () => {
      observer.disconnect();
      cleanupLoad();
    };
  }, [initCaptcha]);

  /** 重新載入 reCAPTCHA：移除先前失敗的 script 標籤後重新嘗試整個載入流程。 */
  const handleRetryCaptcha = useCallback(() => {
    document.querySelectorAll(RECAPTCHA_SCRIPT_SELECTOR).forEach((el) => el.remove());
    widgetIdRef.current = null;
    initCaptcha();
  }, [initCaptcha]);

  useEffect(() => {
    if (captchaLoadFailed) {
      retryCaptchaButtonRef.current?.focus();
    }
  }, [captchaLoadFailed]);

  useEffect(() => {
    if (captchaExpired) {
      reverifyButtonRef.current?.focus();
    }
  }, [captchaExpired]);

  function resetCaptcha() {
    if (window.grecaptcha && widgetIdRef.current !== null) {
      window.grecaptcha.reset(widgetIdRef.current);
    }
    setCaptchaToken(null);
  }

  function handleReverify() {
    resetCaptcha();
    setCaptchaExpired(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;

    const validation = validateSubscriberInput({ name, email });
    if (!validation.ok) {
      setFieldErrors(validation.errors);
      setStatus("error");
      setErrorKind("validation");
      if (validation.errors.name) nameInputRef.current?.focus();
      else if (validation.errors.email) emailInputRef.current?.focus();
      return;
    }
    setFieldErrors({});

    if (!captchaToken) {
      setStatus("error");
      setErrorKind("captcha");
      return;
    }

    setStatus("submitting");
    setErrorKind(null);
    setRetryAfterSeconds(null);

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: validation.value.name,
          email: validation.value.email,
          captchaToken,
        }),
      });

      if (response.ok) {
        // 規格要求：只有收到成功/已訂閱的泛化結果才顯示成功；
        // HTTP 2xx 但 body 非成功 envelope（或非 JSON）時視為錯誤
        const body = await response.json().catch(() => null);
        if (body && typeof body === "object" && (body as { success?: unknown }).success === true) {
          setStatus("success");
          setErrorKind(null);
          return;
        }
        resetCaptcha();
        setStatus("error");
        setErrorKind("generic");
        return;
      }

      resetCaptcha();
      if (response.status === 429) {
        const header = response.headers.get("Retry-After");
        const seconds = header ? Number.parseInt(header, 10) : null;
        setRetryAfterSeconds(Number.isFinite(seconds) && seconds !== null ? seconds : null);
        setStatus("error");
        setErrorKind("rate-limit");
        return;
      }

      setStatus("error");
      setErrorKind("generic");
    } catch {
      resetCaptcha();
      setStatus("error");
      setErrorKind("generic");
    }
  }

  const statusMessage = (() => {
    if (status === "submitting") return "訂閱送出中，請稍候。";
    if (status === "success") return "感謝訂閱！有新文章時我們會通知您。";
    if (status === "error") {
      if (errorKind === "validation") return "請確認輸入內容後再送出。";
      if (errorKind === "captcha") return "請完成驗證後再送出。";
      if (errorKind === "rate-limit") {
        return retryAfterSeconds
          ? `請求過於頻繁，請等待約 ${retryAfterSeconds} 秒後再試。`
          : "請求過於頻繁，請稍後再試。";
      }
      return "訂閱暫時無法完成，請稍後再試。";
    }
    return "";
  })();

  const containerClass = compact
    ? "relative overflow-hidden rounded-2xl border border-line bg-white p-5 shadow-soft dark:bg-base-100 dark:border-base-200"
    : "relative overflow-hidden rounded-3xl border border-line bg-white p-6 shadow-soft dark:bg-base-100 dark:border-base-200 lg:p-10";

  return (
    // 注意：id 刻意採 useId() 產生而非固定的 "newsletter"，因為文章詳情頁的
    // 探索側欄／堆疊版面會同時掛載兩個 NewsletterForm 實例（僅以 CSS 顯示/隱藏
    // 切換，未 unmount），固定 id 會造成同頁重複 id。目前站內無任何連結指向
    // 固定的 "#newsletter" 錨點（僅存於已註解的未來功能區塊）。
    <div id={containerId} className={containerClass}>
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-orange-50/50 via-transparent to-sky-50/50 dark:from-amber-500/5 dark:via-transparent dark:to-violet-500/5" />
      <div className="relative space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-600">Newsletter</p>
          <h3 className="font-display text-base text-primary leading-snug">訂閱電子報</h3>
          <p className="text-xs text-base-300 dark:text-base-600 leading-relaxed">
            訂閱獲取最新文章與工作坊資訊。
          </p>
        </div>

        {captchaUnavailable ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
              目前無法使用訂閱功能，請稍後再試。
            </p>
            <button
              type="button"
              disabled
              className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-card disabled:cursor-not-allowed disabled:opacity-60 dark:bg-amber-500 dark:text-stone-900"
            >
              訂閱電子報
            </button>
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmit} noValidate>
            <div className="space-y-1.5">
              <label htmlFor={nameId} className="block text-xs font-semibold text-primary">
                姓名
              </label>
              <input
                id={nameId}
                ref={nameInputRef}
                type="text"
                disabled={!hydrated}
                value={name}
                onChange={(event) => setName(event.target.value)}
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? `${nameId}-error` : undefined}
                placeholder="你的姓名"
                className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-primary shadow-inner outline-none ring-accent/30 transition focus:ring dark:bg-base-150 dark:border-base-200 dark:text-primary dark:placeholder:text-base-500"
              />
              {fieldErrors.name && (
                <p id={`${nameId}-error`} className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                  {fieldErrors.name}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor={emailId} className="block text-xs font-semibold text-primary">
                Email
              </label>
              <input
                id={emailId}
                ref={emailInputRef}
                type="email"
                disabled={!hydrated}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? `${emailId}-error` : undefined}
                placeholder="你的 Email"
                className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-primary shadow-inner outline-none ring-accent/30 transition focus:ring dark:bg-base-150 dark:border-base-200 dark:text-primary dark:placeholder:text-base-500"
              />
              {fieldErrors.email && (
                <p id={`${emailId}-error`} className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {isCaptchaTestDouble ? (
              <RecaptchaTestDoubleWidget
                disabled={!hydrated}
                onTokenChange={(token) => {
                  setCaptchaToken(token);
                  setCaptchaExpired(false);
                }}
                onReset={() => setCaptchaToken(null)}
              />
            ) : (
              <div ref={widgetContainerRef} data-testid="recaptcha-widget" />
            )}

            {captchaLoadFailed && !isCaptchaTestDouble && (
              <div className="space-y-2" data-testid="recaptcha-load-failed">
                <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                  驗證元件載入失敗，可能被瀏覽器擴充功能或網路封鎖。
                </p>
                <button
                  type="button"
                  ref={retryCaptchaButtonRef}
                  onClick={handleRetryCaptcha}
                  className="w-full rounded-lg border border-line px-4 py-2.5 text-xs font-semibold text-primary transition hover:border-primary/40"
                >
                  重新載入驗證
                </button>
              </div>
            )}

            {captchaExpired && (
              <button
                type="button"
                ref={reverifyButtonRef}
                onClick={handleReverify}
                className="w-full rounded-lg border border-line px-4 py-2.5 text-xs font-semibold text-primary transition hover:border-primary/40"
              >
                驗證已過期，請重新驗證
              </button>
            )}

            <button
              type="submit"
              disabled={status === "submitting" || !hydrated}
              className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-amber-500 dark:text-stone-900 dark:hover:bg-amber-400"
            >
              {status === "submitting" ? "送出中..." : "訂閱電子報"}
            </button>
          </form>
        )}

        <p id={statusId} role="status" aria-live="polite" className="text-xs font-semibold">
          {statusMessage && (
            <span
              className={
                status === "success"
                  ? "text-teal-700 dark:text-teal-400"
                  : status === "error"
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-base-300 dark:text-base-600"
              }
            >
              {statusMessage}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
