import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pb-20">{children}</main>
      <Footer />
    </div>
  );
}
