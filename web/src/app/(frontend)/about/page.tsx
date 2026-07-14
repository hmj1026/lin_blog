import { notFound } from "next/navigation";
import { InlineToc } from "@/components/inline-toc";
import { RawHtmlPostFrame } from "@/components/raw-html-post-frame";
import { prepareContent, prepareRawHtmlContent } from "@/lib/utils/content";
import { siteSettingsQueries } from "@/lib/server-queries";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  let settings;
  try {
    settings = await siteSettingsQueries.getDefault();
  } catch {
    return notFound();
  }
  if (!settings?.showAbout) return notFound();

  const title = settings.aboutTitle?.trim() ? settings.aboutTitle : "關於我";
  const rawContent = settings.aboutContent ?? "";
  const isRawHtml = settings.aboutAllowRawHtml;
  const { html: contentHtml, tocItems } = isRawHtml
    ? prepareRawHtmlContent(rawContent)
    : prepareContent(rawContent);

  return (
    <article className="space-y-16" data-testid="about-page">
      <header className="bg-white/70 dark:bg-[#2a2320]/60">
        <div className="section-shell py-12">
          <h1 className="font-display text-4xl leading-tight text-primary dark:text-amber-100">
            {title}
          </h1>
        </div>
      </header>

      {isRawHtml ? (
        <RawHtmlPostFrame
          html={contentHtml}
          tocItems={tocItems}
          showRawHtmlToc={settings.aboutShowRawHtmlToc}
        />
      ) : (
        <section className="section-shell">
          <div className="wysiwyg rounded-3xl border border-line bg-white p-8 shadow-card dark:bg-base-100">
            <InlineToc items={tocItems} />
            <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
          </div>
        </section>
      )}
    </article>
  );
}
