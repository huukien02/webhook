import { Suspense } from "react";
import { EndpointInspector } from "@/components/EndpointInspector";
import { InspectorSkeleton } from "@/components/InspectorSkeleton";

export default function EndpointPage() {
  return (
    <Suspense fallback={<InspectorSkeleton />}>
      <EndpointInspector />
    </Suspense>
  );
}
