"use client";

import Link from "next/link";
import { Allotment } from "allotment";

import { Navbar } from "./navbar";
import { Id } from "../../../../convex/_generated/dataModel";
import { ConversationSidebar } from "../../conversations/components/conversation-sidebar";
import { useProject } from "../hooks/use-projects";

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 800;
const DEFAULT_CONVERSATION_SIDEBAR_WIDTH = 400;
const DEFAULT_MAIN_SIZE = 1000;

export const ProjectIdLayout = ({
  children,
  projectId,
}: {
  children: React.ReactNode;
  projectId: Id<"projects">;
}) => {
  const project = useProject(projectId);

  // Still loading
  if (project === undefined) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
      </div>
    );
  }

  // Project doesn't exist or unauthorized
  if (project === null) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-2xl font-semibold">Project not found</h1>
        <p className="text-muted-foreground text-sm">
          This project doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Link
          href="/"
          className="text-sm underline underline-offset-4 hover:text-primary transition-colors"
        >
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col">
      <Navbar projectId={projectId} />
      <div className="flex-1 flex overflow-hidden">
        <Allotment
          className="flex-1"
          defaultSizes={[
            DEFAULT_CONVERSATION_SIDEBAR_WIDTH,
            DEFAULT_MAIN_SIZE
          ]}
        >
          <Allotment.Pane
            snap
            minSize={MIN_SIDEBAR_WIDTH}
            maxSize={MAX_SIDEBAR_WIDTH}
            preferredSize={DEFAULT_CONVERSATION_SIDEBAR_WIDTH}
          >
            <ConversationSidebar projectId={projectId} />
          </Allotment.Pane>
          <Allotment.Pane>
            {children}
          </Allotment.Pane>
        </Allotment>
      </div>
    </div>
  );
};