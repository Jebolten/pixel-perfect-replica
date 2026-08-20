import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const VRScene = lazy(() => import("../components/vr/VRScene"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Virtual Agnosia: Morning Routine — VR" },
      {
        name: "description",
        content:
          "A WebXR experience: teleport across an open floor under a gradient sky and pick a level from the floating menu.",
      },
      { property: "og:title", content: "Virtual Agnosia: Morning Routine — VR" },
      {
        property: "og:description",
        content:
          "Teleport-based VR movement, snap turning and a floating level menu in a calm gradient-sky world.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <ClientOnly
      fallback={
        <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
          Loading VR scene…
        </div>
      }
    >
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
            Loading VR scene…
          </div>
        }
      >
        <VRScene />
      </Suspense>
    </ClientOnly>
  );
}
