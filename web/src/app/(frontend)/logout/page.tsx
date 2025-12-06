import { LogoutClient } from "./logout-client";

type LogoutPageProps = {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
};

export default async function LogoutPage({ searchParams }: LogoutPageProps) {
  const params = await searchParams;
  const callbackUrl =
    typeof params?.callbackUrl === "string" && params.callbackUrl.length > 0
      ? params.callbackUrl
      : "/";

  return (
    <div className="relative min-h-screen overflow-hidden bg-base-75">
      <div className="pointer-events-none absolute inset-0 grid-overlay opacity-30" />
      <div className="pointer-events-none absolute -top-32 right-0 h-72 w-72 rounded-full bg-gradient-to-br from-orange-200 via-amber-100 to-sky-200 blur-3xl dark:from-orange-500/15 dark:via-amber-500/10 dark:to-sky-500/15" />
      <div className="pointer-events-none absolute -bottom-28 left-0 h-72 w-72 rounded-full bg-gradient-to-tr from-purple-200 via-white to-amber-100 blur-3xl dark:from-purple-500/15 dark:via-slate-500/10 dark:to-amber-500/15" />
      <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
        <LogoutClient callbackUrl={callbackUrl} />
      </div>
    </div>
  );
}
