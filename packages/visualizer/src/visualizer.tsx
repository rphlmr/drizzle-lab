"use client";

import type { PartialConfig } from "@drizzle-lab/api/config/node";
import { schemaToSnapshot as mysqlSchemaToSnapshot } from "@drizzle-lab/api/mysql/web";
import { schemaToSnapshot as pgSchemaToSnapshot } from "@drizzle-lab/api/pg/web";
import { schemaToSnapshot as sqliteSchemaToSnapshot } from "@drizzle-lab/api/sqlite/web";
import type { Edge, NodeChange, NodePositionChange, NodeProps } from "@xyflow/react";
import {
  applyNodeChanges,
  Background,
  Handle,
  MiniMap,
  Panel,
  PanOnScrollMode,
  Position,
  ReactFlow,
  useEdgesState,
  useKeyPress,
  useReactFlow,
} from "@xyflow/react";
import {
  BadgeCheckIcon,
  BookTextIcon,
  CableIcon,
  CaptionsIcon,
  CaptionsOffIcon,
  DiamondIcon,
  EyeIcon,
  ImageDownIcon,
  InfoIcon,
  KeyRoundIcon,
  LinkIcon,
  LockIcon,
  SheetIcon,
  ShieldCheckIcon,
  ShrinkIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Separator } from "~/components/ui/separator";
import { Toggle } from "~/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import { ThemeProvider, useTheme } from "./components/theme";
import type { Snapshot, TableNodeDefinition, ViewNodeDefinition } from "./compute";
import { compute } from "./compute";
import { useHighlighter } from "./highlighter";

function storageKey(key: string) {
  return `${key}.nodes.positions`;
}

export type NodePosition = Required<Pick<NodePositionChange, "id" | "position">>;

function saveNodesPositions(projectId: string, nodesPositions: NodePosition[]) {
  sessionStorage.setItem(storageKey(projectId), JSON.stringify(nodesPositions));
}

function getSavedNodesPositions(projectId: string) {
  return JSON.parse(sessionStorage.getItem(storageKey(projectId)) || "[]") as NodePosition[];
}

type DrizzleSchema = Record<string, unknown>;

export function getSnapshot(
  schema: DrizzleSchema,
  dialect: "postgresql" | "mysql" | "sqlite" | "turso",
  config?: PartialConfig
) {
  switch (dialect) {
    case "postgresql": {
      return pgSchemaToSnapshot(schema, config);
    }

    case "turso":
    case "sqlite": {
      return sqliteSchemaToSnapshot(schema, config);
    }

    case "mysql": {
      return mysqlSchemaToSnapshot(schema, config);
    }

    default: {
      throw new Error(`Unsupported dialect: ${dialect}`);
    }
  }
}

type NodeTypes = TableNodeDefinition | ViewNodeDefinition;

type DrizzleVisualizerBaseProps = {
  loading?: boolean;
  className?: string;
  initialNodesPositions?: NodePosition[];
  onNodesPositionsChange?: (nodesPositions: NodePosition[]) => void;
  showMiniMap?: boolean;
  theme?: "dark" | "light";
};

type SnapshotOption = {
  snapshot: Snapshot;
};

type DrizzleSnapshotVisualizerProps = DrizzleVisualizerBaseProps & SnapshotOption;

type SchemaOption = {
  schema: DrizzleSchema;
  dialect: "postgresql" | "mysql" | "sqlite" | "turso";
};

type DrizzleSchemaVisualizerProps = DrizzleVisualizerBaseProps & SchemaOption;

type DrizzleVisualizerProps = DrizzleVisualizerBaseProps &
  (DrizzleSnapshotVisualizerProps | DrizzleSchemaVisualizerProps);

function isSchemaOption(snapshotOrSchema: SnapshotOption | SchemaOption): snapshotOrSchema is SchemaOption {
  return "dialect" in snapshotOrSchema;
}

export function DrizzleVisualizer(props: DrizzleSnapshotVisualizerProps): React.ReactNode;
export function DrizzleVisualizer(props: DrizzleSchemaVisualizerProps): React.ReactNode;
export function DrizzleVisualizer({
  loading,
  className,
  initialNodesPositions,
  onNodesPositionsChange,
  showMiniMap = true,
  theme = "dark",
  ...snapshotOrSchema
}: DrizzleVisualizerProps) {
  const snapshotOrSchemaRef = useRef(snapshotOrSchema);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const projectId = snapshot?.projectId || "drizzle-lab";
  const [withExplain, setWithExplain] = useState(false);
  const [nodes, setNodes] = useState([] as Array<NodeTypes>);
  const [edges, setEdges] = useEdgesState([] as Array<Edge>);
  const nodeTypes = useMemo(() => ({ table: TableNode, view: ViewNode }), []);
  const shiftPressed = useKeyPress("ShiftLeft");
  const hasDescription =
    Object.values(snapshot?.tables || {}).some((table) => table.description) ||
    Object.values(snapshot?.views || {}).some((view) => view.description);

  useEffect(() => {
    const snapshotOrSchema = snapshotOrSchemaRef.current;
    const snapshot = isSchemaOption(snapshotOrSchema)
      ? getSnapshot(snapshotOrSchema.schema, snapshotOrSchema.dialect)
      : snapshotOrSchema.snapshot;

    setSnapshot(snapshot);
  }, []);

  const onNodesChange = useCallback(
    (changes: NodeChange<NodeTypes>[]) => {
      const positionUpdate = changes.filter((change) => change.type === "position" || change.type === "dimensions");

      if (positionUpdate.length === 0) {
        return;
      }

      setNodes((prev) => {
        const updatedNodes = applyNodeChanges(positionUpdate, prev);

        // only save positions when we have finished moving around. it prevents massive triggers
        if (positionUpdate.every((u) => u.type === "position" && !u.dragging)) {
          const updatedNodesPositions: NodePosition[] = updatedNodes.map((node) => ({
            id: node.id,
            position: node.position,
          }));

          onNodesPositionsChange?.(updatedNodesPositions);
          saveNodesPositions(projectId, updatedNodesPositions);
        }

        return updatedNodes;
      });
    },
    [onNodesPositionsChange, projectId]
  );

  useEffect(() => {
    if (!snapshot) {
      return;
    }

    try {
      const { nodes, edges } = compute(snapshot);

      const defaultPositions = initialNodesPositions || getSavedNodesPositions(snapshot.projectId);

      const updatedNodes = nodes.map((node) => {
        const defaultPosition = defaultPositions.find((p) => p.id === node.id);

        if (defaultPosition?.position) {
          node.position = defaultPosition.position;
        }

        return node;
      });

      setNodes(updatedNodes);
      setEdges(edges);
    } catch (error) {
      console.error(error);
    }
  }, [snapshot, setEdges, initialNodesPositions]);

  return (
    <ThemeProvider value={theme}>
      <div data-app="drizzle-visualizer" data-theme={theme} className={cn("dv:size-full", className)}>
        <ReactFlow
          panOnScroll
          panOnScrollMode={shiftPressed ? PanOnScrollMode.Horizontal : PanOnScrollMode.Vertical}
          zoomOnScroll={false}
          nodeTypes={nodeTypes}
          colorMode={theme || "dark"}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          snapToGrid
          snapGrid={[20, 20]}
          fitView
          fitViewOptions={{ maxZoom: 1 }}
          minZoom={0.05}
          proOptions={{ hideAttribution: true }}
        >
          {loading && (
            <div className="dv:absolute dv:flex dv:justify-center dv:items-center dv:size-full">loading...</div>
          )}
          <Panel position="top-right">
            <div className="dv:flex dv:items-center dv:gap-4">
              <div className="dv:flex dv:items-center dv:gap-1">
                <AutoLayoutButton
                  onClick={() => {
                    if (!snapshot) {
                      return;
                    }

                    const { nodes } = compute(snapshot);

                    onNodesChange(
                      nodes.map((node) => ({
                        id: node.id,
                        position: node.position,
                        type: "position",
                      }))
                    );
                  }}
                />
                <FitViewButton />
              </div>
              <div className="dv:flex dv:items-center dv:gap-1">
                {hasDescription && (
                  <ExplainToggle
                    pressed={withExplain}
                    onPressedChange={(pressed) => {
                      setNodes((prev) => {
                        return prev.map((node) => {
                          const update = {
                            ...node,
                          };
                          update.data.withExplain = pressed;
                          return update;
                        });
                      });
                      setWithExplain(pressed);
                    }}
                  />
                )}
                <DownloadSchemaButton />
              </div>

              <InfoButton />
            </div>
          </Panel>
          <Background bgColor={theme === "dark" ? "#0f0f14" : "#fff"} />
          {showMiniMap && (
            <MiniMap
              pannable
              zoomable
              bgColor="transparent"
              maskColor="transparent"
              className="dv:border-2 dv:border-muted-foreground/10 dv:rounded-md"
              nodeColor={theme === "dark" ? "#ffffff10" : undefined}
            />
          )}
        </ReactFlow>
      </div>
    </ThemeProvider>
  );
}

function TableNode({ data }: NodeProps<TableNodeDefinition>) {
  const highlighter = useHighlighter();
  const hiddenNodeConnector = "dv:h-px! dv:w-px! dv:min-w-0! dv:min-h-0! dv:cursor-grab! dv:border-0! dv:opacity-0!";

  return (
    <div className="relative dv:flex dv:flex-col dv:bg-background dv:shadow-md dv:border-2 dv:border-border dv:rounded-lg dv:divide-y dv:divide-border dv:min-w-64 dv:text-foreground">
      <div className="dv:flex dv:p-2 dv:text-base">
        <div className="dv:flex dv:flex-col dv:gap-4">
          <div className="dv:flex dv:justify-between dv:items-center dv:gap-4 dv:text-base">
            <div className="relative dv:flex dv:items-center dv:gap-2">
              <SheetIcon className="dv:size-5" />
              <span>{data.schema ? `${data.schema}.${data.name}` : data.name}</span>
            </div>
            {data.provider && (
              <Badge variant="outline" className="dv:items-center dv:gap-2" data-no-print>
                {!data.isRLSEnabled && <TriangleAlertIcon className="dv:size-4 dv:text-orange-400" />}
                RLS {data.isRLSEnabled ? "enabled" : "disabled"}
              </Badge>
            )}
          </div>
          {data.withExplain && data.description && <Description description={data.description} />}
        </div>
      </div>
      <div className="dv:relative dv:divide-y dv:divide-border dv:cursor-default">
        {data.columns.map((column) => {
          return (
            <div key={column.name} className="dv:relative dv:flex dv:flex-col dv:gap-4 dv:p-2 dv:text-sm">
              <div className="dv:flex dv:justify-between dv:items-center dv:gap-2 dv:w-full">
                <div className="dv:relative dv:flex dv:items-center dv:gap-2">
                  {column.isPrimaryKey && <KeyRoundIcon className="dv:size-4 dv:text-green" />}
                  {column.isForeignKey && (
                    <>
                      <span className="dv:mr-1 dv:size-4" />
                      <Popover data-no-print>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="custom" className="dv:-left-1 dv:absolute dv:p-1">
                            <LinkIcon className="dv:size-4 dv:text-green" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-fit">
                          <div className="dv:flex dv:gap-2 dv:p-2">
                            <span className="dv:text-muted-foreground dv:text-xs">on delete:</span>
                            <span className="dv:text-xs">{column.onDelete}</span>
                            <span className="dv:text-muted-foreground dv:text-xs">on update:</span>
                            <span className="dv:text-xs">{column.onUpdate}</span>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </>
                  )}
                  {column.isUnique && <BadgeCheckIcon className="dv:size-4 dv:text-secondary-foreground" />}
                  <DiamondIcon className={cn("dv:size-4", column.isNotNull && "dv:fill-secondary-foreground")} />
                  {column.name}
                </div>
                <span
                  className="dv:px-2 dv:py-1 dv:text-muted-foreground dv:text-xs"
                  data-no-print={column.default || column.defaultFn || column.jsonShape}
                >
                  {column.enumValues ? column.enumValues.join(" | ") : column.dataType}
                  {!column.isNotNull && " | null"}
                </span>
                {(column.default || column.defaultFn || column.jsonShape) && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="custom" className="dv:right-1 dv:absolute dv:px-2 dv:py-1">
                        <span className="dv:text-muted-foreground dv:text-xs">
                          {column.enumValues ? column.enumValues.join(" | ") : column.dataType}
                          {!column.isNotNull && " | null"}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="dv:flex dv:flex-row dv:items-center dv:gap-2 dv:w-fit">
                      <span className="dv:text-muted-foreground dv:text-xs">
                        {column.jsonShape ? "shape" : "default"}:
                      </span>
                      <pre
                        className="dv:text-sm"
                        dangerouslySetInnerHTML={{
                          __html:
                            highlighter?.codeToHtml(
                              String(column.default || column.defaultFn || column.jsonShape || ""),
                              {
                                theme: "tokyo-night",
                                lang: column.default ? "sql" : "typescript",
                              }
                            ) || "",
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              {data.withExplain && column.description && <Description description={column.description} />}
              <Handle
                type="target"
                position={Position.Left}
                id={`${column.name}-left`}
                className={cn(hiddenNodeConnector, "dv:left-0!")}
              />

              <Handle
                type="source"
                position={Position.Right}
                id={`${column.name}-right`}
                className={cn(hiddenNodeConnector, "dv:right-0!")}
              />
            </div>
          );
        })}

        {data.checks.length > 0 && <Separator className="h-1" />}
        {data.checks.map((check) => {
          return (
            <div key={check.name} className="dv:relative dv:flex dv:text-sm">
              <div className="dv:relative dv:flex dv:justify-between dv:items-center dv:gap-2 dv:p-2 dv:w-full">
                <div className="dv:relative dv:flex dv:items-center dv:gap-2">
                  <span className="dv:mr-1 dv:size-4" />
                  <Popover data-no-print>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="custom" className="dv:-left-1 dv:absolute dv:p-1">
                        <ShieldCheckIcon className="dv:size-4 dv:text-green" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="dv:w-fit">
                      <pre
                        className="dv:text-sm"
                        dangerouslySetInnerHTML={{
                          __html:
                            highlighter?.codeToHtml(String(check.value), {
                              theme: "tokyo-night",
                              lang: "sql",
                            }) || "",
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  {check.name}
                </div>
              </div>
            </div>
          );
        })}

        {data.policies.length > 0 && <Separator className="h-1" />}
        {data.policies.map((policy) => {
          return (
            <div key={policy.name} className="dv:relative dv:flex dv:text-sm">
              <div className="dv:flex dv:justify-between dv:items-center dv:gap-2 dv:p-2 dv:w-full">
                <div className="dv:flex dv:items-center dv:gap-2">
                  <LockIcon className="dv:size-4 dv:text-green" />
                  {policy.name}
                </div>
                <Popover data-no-print>
                  <PopoverTrigger asChild>
                    <Button data-no-print variant="ghost" size="sm" className="dv:border-none">
                      <span>Show definition</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="dv:w-fit">
                    <div className="dv:flex dv:items-center dv:gap-2">
                      <span className="dv:text-muted-foreground dv:text-xs">as</span>
                      <span>{policy.as}</span>
                    </div>
                    <div className="dv:flex dv:items-center dv:gap-2">
                      <span className="dv:text-muted-foreground dv:text-xs">to</span>
                      <span>{policy.to ? policy.to.join(", ") : "public"}</span>
                    </div>
                    <div className="dv:flex dv:items-center dv:gap-2">
                      <span className="dv:text-muted-foreground dv:text-xs">for</span>
                      <span>{policy.for}</span>
                    </div>
                    {policy.using ? (
                      <div className="dv:flex dv:items-center dv:gap-2">
                        <span className="dv:text-muted-foreground dv:text-xs">using</span>
                        <pre
                          className="dv:text-sm"
                          dangerouslySetInnerHTML={{
                            __html:
                              highlighter?.codeToHtml(String(policy.using), {
                                theme: "tokyo-night",
                                lang: "sql",
                              }) || "",
                          }}
                        />
                      </div>
                    ) : null}
                    {policy.withCheck ? (
                      <div className="dv:flex dv:items-center dv:gap-2">
                        <span className="dv:text-muted-foreground dv:text-xs">with check</span>
                        <pre
                          className="dv:text-sm"
                          dangerouslySetInnerHTML={{
                            __html:
                              highlighter?.codeToHtml(String(policy.withCheck), {
                                theme: "tokyo-night",
                                lang: "sql",
                              }) || "",
                          }}
                        />
                      </div>
                    ) : null}
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          );
        })}

        {data.relations.length > 0 && <Separator className="dv:h-1" />}
        {data.relations.map((relation) => {
          return (
            <div key={relation.fieldName} className="dv:relative dv:flex dv:text-sm">
              <div className="dv:flex dv:justify-between dv:items-center dv:gap-2 dv:p-2 dv:w-full">
                <div className="dv:flex dv:items-center dv:gap-2">
                  <CableIcon className="dv:size-4 dv:text-green" />
                  {relation.fieldName}
                  <span className="dv:text-muted-foreground dv:text-xs">{relation.type}</span>
                </div>
                <span className="dv:flex dv:items-center dv:text-muted-foreground dv:text-xs">
                  {relation.referencedTableName}
                  {relation.type === "one" ? " | null" : "[]"}
                </span>
              </div>

              <Handle
                type="target"
                position={Position.Right}
                id={relation.fieldName}
                className={cn(hiddenNodeConnector, "dv:right-0!")}
              />
            </div>
          );
        })}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="relation"
        className={cn(hiddenNodeConnector, "dv:bottom-0!")}
      />
    </div>
  );
}

function ViewNode({ data }: NodeProps<ViewNodeDefinition>) {
  const highlighter = useHighlighter();
  const hiddenNodeConnector = "dv:h-px! dv:w-px! dv:min-w-0! dv:min-h-0! dv:cursor-grab! dv:border-0! dv:opacity-0!";

  return (
    <div className="dv:flex dv:flex-col dv:bg-background dv:shadow-md dv:border-2 dv:border-border dv:rounded-lg dv:divide-y dv:divide-border dv:min-w-64 dv:text-foreground">
      <div className="dv:flex dv:p-2 dv:text-base">
        <div className="dv:flex dv:flex-col dv:gap-4 dv:w-full">
          <div className="dv:flex dv:justify-between dv:items-center dv:gap-4 dv:text-base">
            <div className="dv:relative dv:flex dv:items-center dv:gap-2">
              <EyeIcon className="dv:size-5" />
              <span>{data.schema && data.schema !== "public" ? `${data.schema}.${data.name}` : data.name}</span>
            </div>
            <div className="dv:flex dv:items-center dv:gap-2">
              {data.provider && (
                <Badge variant="outline" className="dv:items-center dv:gap-2" data-no-print>
                  {!data.with?.securityInvoker && <TriangleAlertIcon className="dv:size-4 dv:text-orange-400" />}
                  RLS {data.with?.securityInvoker ? "enabled" : "disabled"}
                </Badge>
              )}
              {data.definition && (
                <Popover data-no-print>
                  <PopoverTrigger asChild>
                    <Button data-no-print variant="ghost" size="sm" className="dv:border-none dv:h-6">
                      <span>Definition</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="dv:w-fit dv:max-w-80">
                    <pre
                      className="dv:flex dv:flex-wrap dv:overflow-hidden dv:text-sm"
                      dangerouslySetInnerHTML={{
                        __html:
                          highlighter?.codeToHtml(String(data.definition), {
                            theme: "tokyo-night",
                            lang: "sql",
                            structure: "inline",
                          }) || "",
                      }}
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
          {data.withExplain && data.description && <Description description={data.description} />}
        </div>
      </div>
      <div className="dv:relative dv:divide-y dv:divide-border dv:cursor-default">
        {data.columns.map((column) => {
          return (
            <div key={column.name} className="dv:relative dv:flex dv:flex-col dv:gap-4 dv:p-2 dv:text-sm">
              <div className="dv:flex dv:justify-between dv:items-center dv:gap-2 dv:w-full">
                <div className="dv:flex dv:items-center dv:gap-2">
                  {column.isPrimaryKey && <KeyRoundIcon className="dv:size-4 dv:text-green" />}
                  {/* {column.isForeignKey && (
                      <Icon name="link" size="sm" className="text-green" />
                    )} */}
                  {column.isUnique && <BadgeCheckIcon className="dv:size-4 dv:text-secondary-foreground" />}
                  <DiamondIcon className={cn("dv:size-4", column.isNotNull && "dv:fill-secondary-foreground")} />
                  {column.name}
                </div>
                <span className="dv:px-2 dv:py-1 dv:text-muted-foreground dv:text-xs">
                  {column.enumValues ? column.enumValues.join(" | ") : column.dataType}
                  {!column.isNotNull && " | null"}
                </span>
                {(column.default || column.defaultFn) && (
                  <Popover data-no-print>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="custom" className="dv:right-1 dv:absolute dv:px-2 dv:py-1">
                        <span className="dv:text-muted-foreground dv:text-xs">
                          {column.enumValues ? column.enumValues.join(" | ") : column.dataType}
                          {!column.isNotNull && " | null"}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="dv:flex dv:flex-row dv:items-center dv:gap-2 dv:w-fit">
                      <span className="dv:text-muted-foreground dv:text-xs">default:</span>
                      <pre
                        className="dv:text-sm"
                        dangerouslySetInnerHTML={{
                          __html:
                            highlighter?.codeToHtml(String(column.default || column.defaultFn || ""), {
                              theme: "tokyo-night",
                              lang: column.default ? "sql" : "typescript",
                            }) || "",
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              {data.withExplain && column.description && <Description description={column.description} />}
              <Handle
                type="target"
                position={Position.Left}
                id={`${column.name}-left`}
                className={cn(hiddenNodeConnector, "dv:left-0!")}
              />

              <Handle
                type="source"
                position={Position.Right}
                id={`${column.name}-right`}
                className={cn(hiddenNodeConnector, "dv:right-0!")}
              />
            </div>
          );
        })}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="relation"
        className={cn(hiddenNodeConnector, "dv:bottom-0!")}
      />
    </div>
  );
}

function Description({ description }: { description: string }) {
  return (
    <div className="dv:relative dv:flex dv:px-2 dv:py-0.5 dv:border dv:border-muted/80 dv:rounded-md dv:text-foreground/60">
      <span className="dv:top-[-0.5rem] dv:left-1 dv:flex dv:gap-1 dv:bg-background dv:pr-1">
        <BookTextIcon className="dv:size-4" />
      </span>
      <span className="dv:flex-wrap dv:text-inherit" style={{ fontSize: "0.6rem" }}>
        {description}
      </span>
    </div>
  );
}

function AutoLayoutButton(props: React.ComponentPropsWithoutRef<"button">) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="sm" {...props}>
            Auto layout
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Automatically layout the nodes</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function FitViewButton() {
  const { fitView } = useReactFlow();
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon:sm" onClick={() => fitView()}>
            <ShrinkIcon className="dv:size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Set the viewport to fit the diagram</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function InfoButton() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon:sm">
          <InfoIcon className="dv:size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="dv:w-fit">
        {/* <div className="dv:flex dv:flex-row dv:gap-1">
          <a
            href="https://github.com/rphlmr/drizzle-lab/tree/main/packages/api#extensions"
            target="_blank"
            rel="noopener noreferrer"
            className="dv:font-semibold dv:text-blue dv:text-sm"
          >
            Check how
          </a>
          <Typography variant="mutedText" className="dv:text-sm">
            you can document your schema!
          </Typography>
        </div>
        <Separator className="my-2" /> */}
        <div className="dv:flex dv:flex-row dv:items-center dv:gap-1">
          <span className="dv:text-muted-foreground dv:text-sm">This diagram is powered by </span>
          <a
            href="https://reactflow.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="dv:font-semibold dv:text-blue dv:text-sm"
          >
            React Flow
          </a>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ExplainToggle(props: React.ComponentPropsWithoutRef<typeof Toggle>) {
  const Icon = props.pressed ? CaptionsIcon : CaptionsOffIcon;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle variant="outline" size="icon:sm" className="dv:bg-background" {...props}>
            <Icon className="dv:size-4" />
          </Toggle>
        </TooltipTrigger>
        <TooltipContent>
          <p>Display the schema documentation</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

declare global {
  interface Window {
    vscode?: {
      postMessage: (message: any) => void;
    };
  }
}

function saveAs(file: string, fileName = "schema.png") {
  if (window.vscode) {
    window.vscode.postMessage({
      type: "save-image",
      payload: {
        file,
        fileName,
      },
    });

    return;
  }

  const a = document.createElement("a");
  a.style.display = "none";
  a.download = fileName;
  a.href = file;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

const PADDING = 100; // Add padding around the nodes

export function DownloadSchemaButton() {
  const theme = useTheme();
  const { getNodes } = useReactFlow();
  const { getNodesBounds } = useReactFlow();

  const onClick = async () => {
    const { toPng } = await import("html-to-image");

    const nodes = getNodes();
    const nodesBounds = getNodesBounds(nodes);

    nodesBounds.x -= PADDING;
    nodesBounds.y -= PADDING;
    nodesBounds.width += 2 * PADDING;
    nodesBounds.height += 2 * PADDING;

    const viewport = document.querySelector(".react-flow__viewport") as HTMLElement;

    if (!viewport) {
      return;
    }

    // Batch DOM operations for better performance
    const edgePaths = viewport.querySelectorAll(
      ".edge-dashed > .react-flow__edge-path, .edge-plain > .react-flow__edge-path"
    );

    await new Promise<void>((resolve) => {
      for (const path of edgePaths) {
        const isDashed = path.closest(".edge-dashed");
        path.setAttribute(
          "style",
          isDashed
            ? "stroke: #3e3e3e; stroke-width: 2; stroke-dasharray: 5; fill: none;"
            : "stroke: #3e3e3e; stroke-width: 2; fill: none;"
        );
      }
      resolve();
    });

    const file = await toPng(viewport, {
      width: nodesBounds.width,
      height: nodesBounds.height,
      skipFonts: true,
      skipAutoScale: true,
      backgroundColor: theme === "dark" ? "#0f0f14" : "#fff",
      quality: 1,
      cacheBust: false,
      pixelRatio: 1,
      style: {
        width: `${nodesBounds.width}px`,
        height: `${nodesBounds.height}px`,
        transform: `translate(${-nodesBounds.x}px, ${-nodesBounds.y}px) scale(1)`,
      },
      filter: (node) => {
        return !node.dataset?.noPrint;
      },
    });

    saveAs(file);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon:sm" onClick={onClick}>
            <ImageDownIcon className={cn("dv:size-4")} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Download the diagram as a PNG image</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
