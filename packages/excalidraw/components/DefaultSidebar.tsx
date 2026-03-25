import clsx from "clsx";

import {
  CANVAS_SEARCH_TAB,
  DEFAULT_SIDEBAR,
  composeEventHandlers,
} from "@excalidraw/common";

import type { MarkOptional, Merge } from "@excalidraw/common/utility-types";

import { useTunnels } from "../context/tunnels";
import { useUIAppState } from "../context/ui-appState";

import "../components/dropdownMenu/DropdownMenu.scss";

import { useExcalidrawSetAppState } from "./App";
import { SearchMenu } from "./SearchMenu";
import { Sidebar } from "./Sidebar/Sidebar";
import { withInternalFallback } from "./hoc/withInternalFallback";
import { searchIcon } from "./icons";

import type { SidebarProps, SidebarTriggerProps } from "./Sidebar/common";

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

const DefaultSidebarTrigger = withInternalFallback(
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
DefaultSidebarTrigger.displayName = "DefaultSidebarTrigger";

const DefaultTabTriggers = ({ children }: { children: React.ReactNode }) => {
  const { DefaultSidebarTabTriggersTunnel } = useTunnels();
  return (
    <DefaultSidebarTabTriggersTunnel.In>
      {children}
    </DefaultSidebarTabTriggersTunnel.In>
  );
};
DefaultTabTriggers.displayName = "DefaultTabTriggers";

export const DefaultSidebar = Object.assign(
  withInternalFallback(
    "DefaultSidebar",
    ({
      children,
      className,
      onDock,
      docked,
      ...rest
    }: Merge<
      MarkOptional<Omit<SidebarProps, "name">, "children">,
      {
        /** pass `false` to disable docking */
        onDock?: SidebarProps["onDock"] | false;
      }
    >) => {
      const appState = useUIAppState();
      const setAppState = useExcalidrawSetAppState();

      const { DefaultSidebarTabTriggersTunnel } = useTunnels();

      const isForceDocked = appState.openSidebar?.tab === CANVAS_SEARCH_TAB;

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
            // `onDock=false` disables docking.
            // if `docked` passed, but no onDock passed, disable manual docking.
            isForceDocked || onDock === false || (!onDock && docked != null)
              ? undefined
              : // compose to allow the host app to listen on default behavior
                composeEventHandlers(onDock, (docked) => {
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
                <DefaultSidebarTabTriggersTunnel.Out />
              </Sidebar.TabTriggers>
            </Sidebar.Header>
            <Sidebar.Tab tab={CLIENTS_TAB}>
              {children}
            </Sidebar.Tab>
            <Sidebar.Tab tab={CANVAS_SEARCH_TAB}>
              <SearchMenu />
            </Sidebar.Tab>
          </Sidebar.Tabs>
        </Sidebar>
      );
    },
  ),
  {
    Trigger: DefaultSidebarTrigger,
    TabTriggers: DefaultTabTriggers,
  },
);
