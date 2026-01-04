// AUTO-GENERATED FILE — DO NOT EDIT
// Generated from WebsiteSpec

import Features from "@/components/sections/Features";
import Footer from "@/components/sections/Footer";
import Hero from "@/components/sections/Hero";
import Pricing from "@/components/sections/Pricing";

export default function Page() {
  return (
    <main>
      <Hero title="Build faster with AI" subtitle="Generate production-ready websites from a single prompt" />
      <Features items={["Prompt-based generation","Deterministic output","Production-ready code"]} />
      <Pricing plans={["Free","Pro","Enterprise"]} />
      <Footer copyright="© 2026 AI Builder" />
    </main>
  );
}
