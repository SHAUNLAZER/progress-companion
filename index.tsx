import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bodywise Progress Companion" },
      { name: "description", content: "Track your Bodywise routine daily, log rest days, and see honest progress over time." },
      { property: "og:title", content: "Bodywise Progress Companion" },
      { property: "og:description", content: "Track your Bodywise routine daily, log rest days, and see honest progress over time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

// The companion is a self-contained static app served from /companion/.
function Index() {
  return (
    <iframe
      src="/companion/index.html"
      title="Bodywise Progress Companion"
      className="fixed inset-0 h-full w-full border-0"
    />
  );
}
