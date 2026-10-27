import Link from "next/link";
import { HeroSearch } from "@/components/home/HeroSearch";
import { Container } from "@/components/site/Container";

export default function NotFound() {
  return (
    <Container className="py-20">
      <p className="text-[14px] font-medium text-accent">404</p>
      <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.03em]">That page isn&rsquo;t here</h1>
      <p className="mt-2 max-w-[60ch] text-[16px] text-ink-2">
        The model may have been renamed or retired, or the link is mistyped. Search for it instead:
      </p>
      <div className="mt-6">
        <HeroSearch placeholder="Search models, labs and hosts…" />
      </div>
      <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[15px]">
        <Link href="/models" className="text-accent hover:underline">
          All models
        </Link>
        <Link href="/releases" className="text-accent hover:underline">
          New releases
        </Link>
        <Link href="/retiring" className="text-accent hover:underline">
          Retiring soon
        </Link>
        <Link href="/" className="text-accent hover:underline">
          Home
        </Link>
      </div>
    </Container>
  );
}
