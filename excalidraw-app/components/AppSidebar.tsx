import clsx from "clsx";

import {
  CANVAS_SEARCH_TAB,
  DEFAULT_SIDEBAR,
  composeEventHandlers,
} from "@excalidraw/common";

import { useUIAppState } from "@excalidraw/excalidraw/context/ui-appState";
import { useExcalidrawSetAppState } from "@excalidraw/excalidraw/components/App";
import { Sidebar } from "@excalidraw/excalidraw";
import { SearchMenu } from "@excalidraw/excalidraw/components/SearchMenu";
import { searchIcon } from "@excalidraw/excalidraw/components/icons";
import { useTunnels } from "@excalidraw/excalidraw/context/tunnels";
import { withInternalFallback } from "@excalidraw/excalidraw/components/hoc/withInternalFallback";

import type { SidebarTriggerProps } from "@excalidraw/excalidraw/components/Sidebar/common";

import { useAtomValue } from "../app-jotai";
import { currentClientIdAtom } from "../store/drawingState";
import { ClientList } from "./ClientList";
import { DrawingList } from "./DrawingList";

import "./AppSidebar.scss";

const CLIENTS_TAB = "clients";

const ClientsIcon = () => (
  <svg
    viewBox="0 0 20 20"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 4.5h14a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1v-10a1 1 0 011-1z" />
    <path d="M2 4.5l5-1h0" />
    <path d="M7 3.5h0a1 1 0 011 1v0" />
  </svg>
);

const AppSidebarTrigger = withInternalFallback(
  "DefaultSidebarTrigger",
  (
    props: Omit<SidebarTriggerProps, "name"> &
      React.HTMLAttributes<HTMLDivElement>,
  ) => {
    const { DefaultSidebarTriggerTunnel } = useTunnels();
    return (
      <DefaultSidebarTriggerTunnel.In>
        <Sidebar.Trigger
          {...props}
          className="default-sidebar-trigger"
          name={DEFAULT_SIDEBAR.name}
        />
      </DefaultSidebarTriggerTunnel.In>
    );
  },
);

export const AppSidebar = Object.assign(
  withInternalFallback(
    "DefaultSidebar",
    ({
      children,
      className,
      onDock,
      docked,
      ...rest
    }: any) => {
      const appState = useUIAppState();
      const setAppState = useExcalidrawSetAppState();

      const isForceDocked = appState.openSidebar?.tab === CANVAS_SEARCH_TAB;
      const currentClientId = useAtomValue(currentClientIdAtom);

      return (
        <Sidebar
          {...rest}
          name="default"
          key="default"
          className={clsx("default-sidebar", className)}
          docked={
            isForceDocked || (docked ?? appState.defaultSidebarDockedPreference)
          }
          onDock={
            isForceDocked || onDock === false || (!onDock && docked != null)
              ? undefined
              : composeEventHandlers(onDock, (docked: boolean) => {
                  setAppState({ defaultSidebarDockedPreference: docked });
                })
          }
        >
          <Sidebar.Tabs>
            <Sidebar.Header>
              <Sidebar.TabTriggers>
                <Sidebar.TabTrigger tab={CLIENTS_TAB}>
                  <ClientsIcon />
                </Sidebar.TabTrigger>
                <Sidebar.TabTrigger tab={CANVAS_SEARCH_TAB}>
                  {searchIcon}
                </Sidebar.TabTrigger>
              </Sidebar.TabTriggers>
            </Sidebar.Header>
            <Sidebar.Tab tab={CLIENTS_TAB}>
              {currentClientId ? <DrawingList /> : <ClientList />}
            </Sidebar.Tab>
            <Sidebar.Tab tab={CANVAS_SEARCH_TAB}>
              <SearchMenu />
            </Sidebar.Tab>
            {children}
          </Sidebar.Tabs>
        </Sidebar>
      );
    },
  ),
  {
    Trigger: AppSidebarTrigger,
  },
);
