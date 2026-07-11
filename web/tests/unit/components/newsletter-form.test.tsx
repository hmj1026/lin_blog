import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
});
