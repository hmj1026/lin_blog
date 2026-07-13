import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { NewsletterForm } from "@/components/newsletter-form";

vi.mock("@/env.public", () => ({
  publicEnv: { NEXT_PUBLIC_RECAPTCHA_SITE_KEY: "test-site-key" },
}));

type GrecaptchaCallbacks = {
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
};

function installGrecaptchaStub() {
  let captured: GrecaptchaCallbacks = {};
  const render = vi.fn((_container: unknown, params: GrecaptchaCallbacks) => {
    captured = params;
    return 0;
  });
  const reset = vi.fn();
  (window as any).grecaptcha = { render, reset };
  return {
    render,
    reset,
    issueToken: (token: string) => captured.callback?.(token),
    expireToken: () => captured["expired-callback"]?.(),
    errorToken: () => captured["error-callback"]?.(),
  };
}

async function fillValidFormAndVerify(grecaptcha: ReturnType<typeof installGrecaptchaStub>) {
  fireEvent.change(screen.getByLabelText("姓名"), { target: { value: "Ada" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@example.com" } });
  await waitFor(() => expect(grecaptcha.render).toHaveBeenCalled());
  grecaptcha.issueToken("captcha-token");
}

describe("NewsletterForm", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    delete (window as any).grecaptcha;
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("has visible, programmatically associated labels for name and email", () => {
    installGrecaptchaStub();
    render(<NewsletterForm />);
    expect(screen.getByLabelText("姓名")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("renders the reCAPTCHA widget via window.grecaptcha.render with the public site key", async () => {
    const grecaptcha = installGrecaptchaStub();
    render(<NewsletterForm />);

    await waitFor(() => expect(grecaptcha.render).toHaveBeenCalled());
    expect(grecaptcha.render.mock.calls[0][1]).toMatchObject({ sitekey: "test-site-key" });
  });

  it("does not initialize the CAPTCHA while the form instance is not visible (e.g. CSS-hidden breakpoint duplicate)", async () => {
    // 文章頁同時 SSR sidebar 與 stacked 兩個實例、以 CSS 依斷點切換顯示；
    // 不可見的實例不得載入第二個 widget/iframe。以永不 intersect 的
    // IntersectionObserver 模擬 display:none 的實例。
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe = observe;
        disconnect = disconnect;
        unobserve = vi.fn();
      }
    );
    const grecaptcha = installGrecaptchaStub();
    render(<NewsletterForm />);

    expect(observe).toHaveBeenCalled();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(grecaptcha.render).not.toHaveBeenCalled();
  });

  it("initializes the CAPTCHA once the form instance becomes visible", async () => {
    let trigger: ((entries: { isIntersecting: boolean }[]) => void) | null = null;
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
          trigger = callback;
        }
        observe = vi.fn();
        disconnect = vi.fn();
        unobserve = vi.fn();
      }
    );
    const grecaptcha = installGrecaptchaStub();
    render(<NewsletterForm />);

    expect(grecaptcha.render).not.toHaveBeenCalled();
    trigger!([{ isIntersecting: true }]);

    await waitFor(() => expect(grecaptcha.render).toHaveBeenCalled());
  });

  it("shows field-level validation errors and moves focus to the first invalid field without submitting", async () => {
    const grecaptcha = installGrecaptchaStub();
    render(<NewsletterForm />);
    await waitFor(() => expect(grecaptcha.render).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /訂閱/ }));

    expect(await screen.findByText("姓名為必填欄位")).toBeInTheDocument();
    expect(screen.getByLabelText("姓名")).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a validation error and moves focus to the email field when only email is invalid", async () => {
    const grecaptcha = installGrecaptchaStub();
    render(<NewsletterForm />);
    await waitFor(() => expect(grecaptcha.render).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText("姓名"), { target: { value: "Ada" } });
    fireEvent.click(screen.getByRole("button", { name: /訂閱/ }));

    expect(await screen.findByText("Email 為必填欄位")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits the exact request body shape and no secret-like fields", async () => {
    const grecaptcha = installGrecaptchaStub();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ success: true, data: { status: "subscribed" } }),
    });
    render(<NewsletterForm />);
    await fillValidFormAndVerify(grecaptcha);

    fireEvent.click(screen.getByRole("button", { name: /訂閱/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/newsletter/subscribe");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toEqual({ name: "Ada", email: "ada@example.com", captchaToken: "captcha-token" });
  });

  it("disables the submit button while the request is pending (no double submit)", async () => {
    const grecaptcha = installGrecaptchaStub();
    let resolveFetch: (value: unknown) => void = () => {};
    fetchMock.mockReturnValueOnce(new Promise((resolve) => { resolveFetch = resolve; }));
    render(<NewsletterForm />);
    await fillValidFormAndVerify(grecaptcha);

    const submitButton = screen.getByRole("button", { name: /訂閱/ });
    fireEvent.click(submitButton);

    await waitFor(() => expect(submitButton).toBeDisabled());
    fireEvent.click(submitButton);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ success: true, data: { status: "subscribed" } }),
    });
  });

  it("shows the same generic success message for both first-time and already-subscribed results", async () => {
    const grecaptcha = installGrecaptchaStub();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ success: true, data: { status: "already-subscribed" } }),
    });
    render(<NewsletterForm />);
    await fillValidFormAndVerify(grecaptcha);

    fireEvent.click(screen.getByRole("button", { name: /訂閱/ }));

    expect(await screen.findByRole("status")).toHaveTextContent(/感謝訂閱/);
  });

  it("shows a generic error (not success) when a 2xx response body is not a success envelope", async () => {
    // 規格要求：只有收到成功/已訂閱的泛化結果才顯示成功；HTTP 2xx 但 body 為錯誤時不得顯示成功
    const grecaptcha = installGrecaptchaStub();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ success: false, message: "internal error" }),
    });
    render(<NewsletterForm />);
    await fillValidFormAndVerify(grecaptcha);

    fireEvent.click(screen.getByRole("button", { name: /訂閱/ }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/稍後再試/));
    expect(screen.getByRole("status")).not.toHaveTextContent(/感謝訂閱/);
  });

  it("shows a generic error (not success) when a 2xx response body is not valid JSON", async () => {
    const grecaptcha = installGrecaptchaStub();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    });
    render(<NewsletterForm />);
    await fillValidFormAndVerify(grecaptcha);

    fireEvent.click(screen.getByRole("button", { name: /訂閱/ }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/稍後再試/));
    expect(screen.getByRole("status")).not.toHaveTextContent(/感謝訂閱/);
  });

  it("shows a generic recoverable error for a 400/500/502 server response and preserves input values", async () => {
    const grecaptcha = installGrecaptchaStub();
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 502,
      headers: new Headers(),
      json: async () => ({ success: false, message: "provider error" }),
    });
    render(<NewsletterForm />);
    await fillValidFormAndVerify(grecaptcha);

    fireEvent.click(screen.getByRole("button", { name: /訂閱/ }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/稍後再試/));
    expect(screen.getByLabelText("姓名")).toHaveValue("Ada");
    expect(screen.getByLabelText("Email")).toHaveValue("ada@example.com");
  });

  it("shows a wait message using Retry-After on a 429 response", async () => {
    const grecaptcha = installGrecaptchaStub();
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: new Headers({ "Retry-After": "120" }),
      json: async () => ({ success: false, message: "rate limited" }),
    });
    render(<NewsletterForm />);
    await fillValidFormAndVerify(grecaptcha);

    fireEvent.click(screen.getByRole("button", { name: /訂閱/ }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/120/));
  });

  it("resets the captcha token and moves focus to a re-verify control after the reCAPTCHA widget expires, preserving inputs", async () => {
    const grecaptcha = installGrecaptchaStub();
    render(<NewsletterForm />);
    await fillValidFormAndVerify(grecaptcha);

    grecaptcha.expireToken();

    const reverify = await screen.findByRole("button", { name: /重新驗證/ });
    expect(reverify).toHaveFocus();
    expect(screen.getByLabelText("姓名")).toHaveValue("Ada");
    expect(screen.getByLabelText("Email")).toHaveValue("ada@example.com");

    fireEvent.click(reverify);
    expect(grecaptcha.reset).toHaveBeenCalled();
  });

  it("resets the captcha token and moves focus to a re-verify control after the reCAPTCHA widget errors out, preserving inputs", async () => {
    const grecaptcha = installGrecaptchaStub();
    render(<NewsletterForm />);
    await fillValidFormAndVerify(grecaptcha);

    grecaptcha.errorToken();

    const reverify = await screen.findByRole("button", { name: /重新驗證/ });
    expect(reverify).toHaveFocus();
    expect(screen.getByLabelText("姓名")).toHaveValue("Ada");
    expect(screen.getByLabelText("Email")).toHaveValue("ada@example.com");

    fireEvent.click(reverify);
    expect(grecaptcha.reset).toHaveBeenCalled();
  });

  it("shows a generic unavailable/retry state when the reCAPTCHA site key is missing (fail closed)", async () => {
    vi.doMock("@/env.public", () => ({ publicEnv: { NEXT_PUBLIC_RECAPTCHA_SITE_KEY: undefined } }));
    vi.resetModules();
    const { NewsletterForm: NewsletterFormNoKey } = await import("@/components/newsletter-form");
    render(<NewsletterFormNoKey />);

    expect(screen.getByText(/目前無法使用|暫時無法使用/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /訂閱/ })).toBeDisabled();
    vi.doUnmock("@/env.public");
  });

  describe("CAPTCHA test-double widget gating (test-only seam, tasks.md 9.5)", () => {
    afterEach(() => {
      vi.doUnmock("@/env.public");
    });

    it("never renders the stub when the site key is a normal (non-test-double) value", async () => {
      vi.doMock("@/env.public", () => ({
        publicEnv: { NEXT_PUBLIC_RECAPTCHA_SITE_KEY: "real-site-key", NODE_ENV: "development" },
      }));
      vi.resetModules();
      installGrecaptchaStub();
      const { NewsletterForm: Form } = await import("@/components/newsletter-form");
      render(<Form />);

      expect(screen.queryByTestId("recaptcha-stub")).not.toBeInTheDocument();
      expect(screen.getByTestId("recaptcha-widget")).toBeInTheDocument();
    });

    it("never renders the stub when the site key is missing entirely", async () => {
      vi.doMock("@/env.public", () => ({
        publicEnv: { NEXT_PUBLIC_RECAPTCHA_SITE_KEY: undefined, NODE_ENV: "development" },
      }));
      vi.resetModules();
      const { NewsletterForm: Form } = await import("@/components/newsletter-form");
      render(<Form />);

      expect(screen.queryByTestId("recaptcha-stub")).not.toBeInTheDocument();
    });

    it("never renders the stub for the test-double site key under a production build (fail closed)", async () => {
      vi.doMock("@/env.public", () => ({
        publicEnv: { NEXT_PUBLIC_RECAPTCHA_SITE_KEY: "e2e-test", NODE_ENV: "production" },
      }));
      vi.resetModules();
      installGrecaptchaStub();
      const { NewsletterForm: Form } = await import("@/components/newsletter-form");
      render(<Form />);

      expect(screen.queryByTestId("recaptcha-stub")).not.toBeInTheDocument();
    });

    it("renders the stub and lets a token button drive captchaToken when the flag is present in a non-production build", async () => {
      vi.doMock("@/env.public", () => ({
        publicEnv: { NEXT_PUBLIC_RECAPTCHA_SITE_KEY: "e2e-test", NODE_ENV: "test" },
      }));
      vi.resetModules();
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ success: true, data: { status: "subscribed" } }),
      });
      const { NewsletterForm: Form } = await import("@/components/newsletter-form");
      render(<Form />);

      expect(screen.getByTestId("recaptcha-stub")).toBeInTheDocument();
      expect(screen.queryByTestId("recaptcha-widget")).not.toBeInTheDocument();

      fireEvent.change(screen.getByLabelText("姓名"), { target: { value: "Ada" } });
      fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@example.com" } });
      fireEvent.click(screen.getByTestId("recaptcha-stub-token-e2e-pass"));
      fireEvent.click(screen.getByRole("button", { name: /訂閱/ }));

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
      expect(body.captchaToken).toBe("e2e-pass");
    });
  });

  // fix-recaptcha-render-race-and-sitemap：Google api.js 兩段式載入下，
  // grecaptcha 物件可能先於 grecaptcha.render 出現。widget 只能在 render 確實
  // 可呼叫後渲染；任何 readiness 失敗都要走可恢復的重新載入 UI，且不留 stale callback。
  describe("reCAPTCHA render race resilience", () => {
    const RECAPTCHA_SCRIPT_QUERY = 'script[src^="https://www.google.com/recaptcha/api.js"]';

    function findScript() {
      return document.querySelector<HTMLScriptElement>(RECAPTCHA_SCRIPT_QUERY);
    }

    it("does not throw or render while grecaptcha exists with ready() but no render, then renders after ready flushes (task 1.1)", async () => {
      vi.useFakeTimers();
      try {
        const readyQueue: Array<() => void> = [];
        render(<NewsletterForm />);

        // 兩段式載入：loader stub 提供 ready() 佇列但 release script 尚未提供 render。
        const renderMock = vi.fn((_container: unknown, _params: unknown) => 0);
        (window as any).grecaptcha = { ready: (cb: () => void) => readyQueue.push(cb) };
        const script = findScript();
        expect(script).toBeTruthy();
        await act(async () => {
          fireEvent.load(script!);
        });

        // render 尚不可呼叫 → 不得渲染、不得拋未處理例外，並已排入 ready 佇列。
        expect(renderMock).not.toHaveBeenCalled();
        expect(readyQueue.length).toBeGreaterThan(0);
        expect(screen.queryByTestId("recaptcha-load-failed")).not.toBeInTheDocument();

        // release script 到位並 flush ready 佇列 → widget 以正確 container/sitekey 渲染。
        (window as any).grecaptcha.render = renderMock;
        await act(async () => {
          readyQueue.splice(0).forEach((cb) => cb());
        });
        expect(renderMock).toHaveBeenCalledTimes(1);
        expect(renderMock.mock.calls[0][0]).toBe(screen.getByTestId("recaptcha-widget"));
        expect(renderMock.mock.calls[0][1]).toMatchObject({ sitekey: "test-site-key" });
      } finally {
        vi.useRealTimers();
      }
    });

    it("surfaces the recoverable reload UI when grecaptcha.render throws, and retry re-initializes (task 1.2)", async () => {
      const throwingRender = vi.fn(() => {
        throw new Error("provider boom");
      });
      (window as any).grecaptcha = { render: throwingRender, reset: vi.fn() };
      render(<NewsletterForm />);

      expect(await screen.findByTestId("recaptcha-load-failed")).toBeInTheDocument();
      expect(throwingRender).toHaveBeenCalledTimes(1);

      // 點「重新載入驗證」後以成功 stub 重新初始化 → widget 恢復，降級 UI 消失。
      const okRender = vi.fn(() => 0);
      (window as any).grecaptcha.render = okRender;
      fireEvent.click(screen.getByRole("button", { name: /重新載入驗證/ }));

      await waitFor(() => expect(okRender).toHaveBeenCalled());
      expect(screen.queryByTestId("recaptcha-load-failed")).not.toBeInTheDocument();
    });

    it("fails via the readiness deadline when render never becomes callable; script load does not cancel it and polling stops (task 1.4)", async () => {
      vi.useFakeTimers();
      try {
        render(<NewsletterForm />);

        // grecaptcha 物件出現但 render 永遠不是 function，ready 也不 flush。
        (window as any).grecaptcha = { ready: (_cb: () => void) => {} };
        const script = findScript();
        // script load 不得清除唯一的 render-readiness deadline。
        await act(async () => {
          fireEvent.load(script!);
        });
        expect(screen.queryByTestId("recaptcha-load-failed")).not.toBeInTheDocument();

        // 逾越 readiness deadline → 走 onError 降級 UI。
        await act(async () => {
          await vi.advanceTimersByTimeAsync(10000);
        });
        expect(screen.getByTestId("recaptcha-load-failed")).toBeInTheDocument();

        // polling 已停止：再推進時間不會拋錯或改寫狀態。
        await act(async () => {
          await vi.advanceTimersByTimeAsync(5000);
        });
        expect(screen.getByTestId("recaptcha-load-failed")).toBeInTheDocument();
      } finally {
        vi.useRealTimers();
      }
    });

    it("does not render or update state from a stale ready callback after unmount (task 1.5)", async () => {
      vi.useFakeTimers();
      try {
        const readyQueue: Array<() => void> = [];
        const renderMock = vi.fn(() => 0);
        (window as any).grecaptcha = { ready: (cb: () => void) => readyQueue.push(cb) };
        const { unmount } = render(<NewsletterForm />);

        expect(readyQueue.length).toBeGreaterThan(0);
        unmount();

        // unmount 後 release script 到位並 flush 舊 ready 佇列 → 舊 callback 不得 render。
        (window as any).grecaptcha.render = renderMock;
        await act(async () => {
          readyQueue.splice(0).forEach((cb) => cb());
        });
        expect(renderMock).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it("renders the widget at most once even if ready and polling both fire (task 1.5)", async () => {
      vi.useFakeTimers();
      try {
        const readyQueue: Array<() => void> = [];
        const renderMock = vi.fn(() => 0);
        (window as any).grecaptcha = { ready: (cb: () => void) => readyQueue.push(cb) };
        render(<NewsletterForm />);

        (window as any).grecaptcha.render = renderMock;
        // ready flush 先渲染，隨後 polling tick 也嘗試 → 仍只能 render 一次。
        await act(async () => {
          readyQueue.splice(0).forEach((cb) => cb());
        });
        await act(async () => {
          await vi.advanceTimersByTimeAsync(600);
        });
        expect(renderMock).toHaveBeenCalledTimes(1);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
