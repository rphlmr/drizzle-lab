"use client";

import "@xyflow/react/dist/style.css";

import { useCallback, useEffect, useMemo, useState } from "react";

import { schemaToSnapshot as mysqlSchemaToSnapshot } from "@drizzle-lab/api/mysql/web";
import { schemaToSnapshot as pgSchemaToSnapshot } from "@drizzle-lab/api/pg/web";
import { schemaToSnapshot as sqliteSchemaToSnapshot } from "@drizzle-lab/api/sqlite/web";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Separator } from "~/components/ui/separator";
import { Toggle } from "~/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import type {
  NodePositionChange,
  NodeProps,
  Edge,
  NodeChange,
} from "@xyflow/react";
import {
  Background,
  Handle,
  Position,
  ReactFlow,
  useEdgesState,
  MiniMap,
  Panel,
  applyNodeChanges,
  PanOnScrollMode,
  useKeyPress,
  getNodesBounds,
  useReactFlow,
  getViewportForBounds,
} from "@xyflow/react";
import { toPng } from "html-to-image";

import { compute } from "./compute";
import type {
  Snapshot,
  ViewNodeDefinition,
  TableNodeDefinition,
} from "./compute";
import { useHighlighter } from "./highlighter";
import {
  BadgeCheckIcon,
  BookTextIcon,
  CableIcon,
  CaptionsOffIcon,
  CaptionsIcon,
  DiamondIcon,
  EyeIcon,
  InfoIcon,
  KeyRoundIcon,
  LinkIcon,
  LockIcon,
  SheetIcon,
  ShieldCheckIcon,
  ShrinkIcon,
  TriangleAlertIcon,
  ImageDownIcon,
  LoaderPinwheelIcon,
} from "lucide-react";

function storageKey(key: string) {
  return `${key}.nodes.positions`;
}

export type NodePosition = Required<
  Pick<NodePositionChange, "id" | "position">
>;

function saveNodesPositions(projectId: string, nodesPositions: NodePosition[]) {
  sessionStorage.setItem(storageKey(projectId), JSON.stringify(nodesPositions));
}

function getSavedNodesPositions(projectId: string) {
  return JSON.parse(
    sessionStorage.getItem(storageKey(projectId)) || "[]",
  ) as NodePosition[];
}

type DrizzleSchema = Record<string, unknown>;

function getSnapshot(
  schema: DrizzleSchema,
  dialect: "postgresql" | "mysql" | "sqlite" | "turso",
) {
  switch (dialect) {
    case "postgresql": {
      return pgSchemaToSnapshot(schema);
    }

    case "turso":
    case "sqlite": {
      return sqliteSchemaToSnapshot(schema);
    }

    case "mysql": {
      return mysqlSchemaToSnapshot(schema);
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
};

type SnapshotOption = {
  snapshot: Snapshot;
};

type DrizzleSnapshotVisualizerProps = DrizzleVisualizerBaseProps &
  SnapshotOption;

type SchemaOption = {
  schema: DrizzleSchema;
  dialect: "postgresql" | "mysql" | "sqlite" | "turso";
};

type DrizzleSchemaVisualizerProps = DrizzleVisualizerBaseProps & SchemaOption;

type DrizzleVisualizerProps = DrizzleVisualizerBaseProps &
  (DrizzleSnapshotVisualizerProps | DrizzleSchemaVisualizerProps);

function isSchemaOption(
  snapshotOrSchema: SnapshotOption | SchemaOption,
): snapshotOrSchema is SchemaOption {
  return "dialect" in snapshotOrSchema;
}

export function DrizzleVisualizer(
  props: DrizzleSnapshotVisualizerProps,
): React.ReactNode;
export function DrizzleVisualizer(
  props: DrizzleSchemaVisualizerProps,
): React.ReactNode;
export function DrizzleVisualizer({
  loading,
  className,
  initialNodesPositions,
  onNodesPositionsChange,
  showMiniMap = true,
  ...snapshotOrSchema
}: DrizzleVisualizerProps) {
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
    const snapshot = isSchemaOption(snapshotOrSchema)
      ? getSnapshot(snapshotOrSchema.schema, snapshotOrSchema.dialect)
      : snapshotOrSchema.snapshot;

    setSnapshot(snapshot);
  }, []);

  const onNodesChange = useCallback(
    (changes: NodeChange<NodeTypes>[]) => {
      const positionUpdate = changes.filter(
        (change) => change.type === "position" || change.type === "dimensions",
      );

      if (positionUpdate.length === 0) {
        return;
      }

      setNodes((prev) => {
        const updatedNodes = applyNodeChanges(positionUpdate, prev);

        // only save positions when we have finished moving around. it prevents massive triggers
        if (positionUpdate.every((u) => u.type === "position" && !u.dragging)) {
          const updatedNodesPositions: NodePosition[] = updatedNodes.map(
            (node) => ({
              id: node.id,
              position: node.position,
            }),
          );

          onNodesPositionsChange?.(updatedNodesPositions);
          saveNodesPositions(projectId, updatedNodesPositions);
        }

        return updatedNodes;
      });
    },
    [onNodesPositionsChange, projectId],
  );

  useEffect(() => {
    if (!snapshot) {
      return;
    }

    compute(snapshot)
      .then(({ nodes, edges }) => {
        const defaultPositions =
          initialNodesPositions || getSavedNodesPositions(snapshot.projectId);

        const updatedNodes = nodes.map((node) => {
          const defaultPosition = defaultPositions.find(
            (p) => p.id === node.id,
          );

          if (defaultPosition?.position) {
            node.position = defaultPosition.position;
          }

          return node;
        });
        setNodes(updatedNodes);
        setEdges(edges);
      })
      .catch(console.error);
  }, [snapshot, setEdges, setNodes, initialNodesPositions]);

  return (
    <div
      data-app="drizzle-visualizer"
      data-theme-dv="dark"
      className={cn("dv:size-full", className)}
    >
      <ReactFlow
        panOnScroll
        panOnScrollMode={
          shiftPressed ? PanOnScrollMode.Horizontal : PanOnScrollMode.Vertical
        }
        zoomOnScroll={false}
        nodeTypes={nodeTypes}
        colorMode="dark"
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
          <div className="dv:absolute dv:flex dv:size-full dv:items-center dv:justify-center">
            loading...
          </div>
        )}
        <Panel position="top-right">
          <div className="dv:flex dv:items-center dv:gap-4">
            <div className="dv:flex dv:items-center dv:gap-1">
              <AutoLayoutButton
                onClick={() => {
                  if (!snapshot) {
                    return;
                  }

                  compute(snapshot).then(({ nodes }) => {
                    onNodesChange(
                      nodes.map((node) => ({
                        id: node.id,
                        position: node.position,
                        type: "position",
                      })),
                    );
                  });
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
        <Background bgColor="#0f0f14" />
        {showMiniMap && (
          <MiniMap
            pannable
            zoomable
            bgColor="transparent"
            maskColor="transparent"
            className="dv:rounded-md dv:border-2 dv:border-muted-foreground/10"
            nodeColor="#ffffff10"
          />
        )}
      </ReactFlow>
    </div>
  );
}

function TableNode({ data }: NodeProps<TableNodeDefinition>) {
  const highlighter = useHighlighter();
  const hiddenNodeConnector =
    "dv:h-px! dv:w-px! dv:min-w-0! dv:min-h-0! dv:cursor-grab! dv:border-0! dv:opacity-0!";

  return (
    <div className="dv:flex dv:min-w-64 dv:flex-col dv:divide-y dv:divide-border dv:rounded-lg dv:border-2 dv:border-border dv:bg-background dv:text-foreground dv:shadow-md">
      <div className="dv:flex dv:p-2 dv:text-base">
        <div className="dv:flex dv:flex-col dv:gap-4">
          <div className="dv:flex dv:items-center dv:justify-between dv:gap-4 dv:text-base">
            <div className="relative dv:flex dv:items-center dv:gap-2">
              <SheetIcon className="dv:size-5" />
              <span>
                {data.schema ? `${data.schema}.${data.name}` : data.name}
              </span>
            </div>
            {data.provider && (
              <Badge
                variant="outline"
                className="dv:items-center dv:gap-2"
                data-no-print
              >
                {!data.isRLSEnabled && (
                  <TriangleAlertIcon className="dv:text-orange-400 dv:size-4" />
                )}
                RLS {data.isRLSEnabled ? "enabled" : "disabled"}
              </Badge>
            )}
          </div>
          {data.withExplain && data.description && (
            <Description description={data.description} />
          )}
        </div>
      </div>
      <div className="dv:relative dv:cursor-default dv:divide-y dv:divide-border">
        {data.columns.map((column) => {
          return (
            <div
              key={column.name}
              className="dv:relative dv:flex dv:flex-col dv:gap-4 dv:p-2 dv:text-sm"
            >
              <div className="dv:flex dv:w-full dv:items-center dv:justify-between dv:gap-2">
                <div className="dv:relative dv:flex dv:items-center dv:gap-2">
                  {column.isPrimaryKey && (
                    <KeyRoundIcon className="dv:text-green dv:size-4" />
                  )}
                  {column.isForeignKey && (
                    <>
                      <span className="dv:mr-1 dv:size-4" />
                      <Popover data-no-print>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="custom"
                            className="dv:absolute dv:-left-1 dv:p-1"
                          >
                            <LinkIcon className="dv:text-green dv:size-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-fit">
                          <div className="dv:flex dv:gap-2 dv:p-2">
                            <span className="dv:text-xs dv:text-muted-foreground">
                              on delete:
                            </span>
                            <span className="dv:text-xs">
                              {column.onDelete}
                            </span>
                            <span className="dv:text-xs dv:text-muted-foreground">
                              on update:
                            </span>
                            <span className="dv:text-xs">
                              {column.onUpdate}
                            </span>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </>
                  )}
                  {column.isUnique && (
                    <BadgeCheckIcon className="dv:text-secondary-foreground dv:size-4" />
                  )}
                  <DiamondIcon
                    className={cn(
                      "dv:size-4",
                      column.isNotNull && "dv:fill-secondary-foreground",
                    )}
                  />
                  {column.name}
                </div>
                <span className="dv:px-2 dv:py-1 dv:text-xs dv:text-muted-foreground">
                  {column.enumValues
                    ? column.enumValues.join(" | ")
                    : column.dataType}
                  {!column.isNotNull && " | null"}
                </span>
                {(column.default || column.defaultFn || column.jsonShape) && (
                  <Popover data-no-print>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="custom"
                        className="dv:absolute dv:right-1 dv:px-2 dv:py-1"
                      >
                        <span className="dv:text-xs dv:text-muted-foreground">
                          {column.enumValues
                            ? column.enumValues.join(" | ")
                            : column.dataType}
                          {!column.isNotNull && " | null"}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="dv:flex dv:w-fit dv:flex-row dv:items-center dv:gap-2">
                      <span className="dv:text-xs dv:text-muted-foreground">
                        {column.jsonShape ? "shape" : "default"}:
                      </span>
                      <pre
                        className="dv:text-sm"
                        dangerouslySetInnerHTML={{
                          __html:
                            highlighter?.codeToHtml(
                              String(
                                column.default ||
                                  column.defaultFn ||
                                  column.jsonShape ||
                                  "",
                              ),
                              {
                                theme: "tokyo-night",
                                lang: column.default ? "sql" : "typescript",
                              },
                            ) || "",
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              {data.withExplain && column.description && (
                <Description description={column.description} />
              )}
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
              <div className="dv:relative dv:flex dv:w-full dv:items-center dv:justify-between dv:gap-2 dv:p-2">
                <div className="dv:relative dv:flex dv:items-center dv:gap-2">
                  <span className="dv:mr-1 dv:size-4" />
                  <Popover data-no-print>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="custom"
                        className="dv:absolute dv:-left-1 dv:p-1"
                      >
                        <ShieldCheckIcon className="dv:text-green dv:size-4" />
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
              <div className="dv:flex dv:w-full dv:items-center dv:justify-between dv:gap-2 dv:p-2">
                <div className="dv:flex dv:items-center dv:gap-2">
                  <LockIcon className="dv:text-green dv:size-4" />
                  {policy.name}
                </div>
                <Popover data-no-print>
                  <PopoverTrigger asChild>
                    <Button
                      data-no-print
                      variant="ghost"
                      size="sm"
                      className="dv:border-none"
                    >
                      <span>Show definition</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="dv:w-fit">
                    <div className="dv:flex dv:items-center dv:gap-2">
                      <span className="dv:text-xs dv:text-muted-foreground">
                        as
                      </span>
                      <span>{policy.as}</span>
                    </div>
                    <div className="dv:flex dv:items-center dv:gap-2">
                      <span className="dv:text-xs dv:text-muted-foreground">
                        to
                      </span>
                      <span>{policy.to ? policy.to.join(", ") : "public"}</span>
                    </div>
                    <div className="dv:flex dv:items-center dv:gap-2">
                      <span className="dv:text-xs dv:text-muted-foreground">
                        for
                      </span>
                      <span>{policy.for}</span>
                    </div>
                    {policy.using ? (
                      <div className="dv:flex dv:items-center dv:gap-2">
                        <span className="dv:text-xs dv:text-muted-foreground">
                          using
                        </span>
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
                        <span className="dv:text-xs dv:text-muted-foreground">
                          with check
                        </span>
                        <pre
                          className="dv:text-sm"
                          dangerouslySetInnerHTML={{
                            __html:
                              highlighter?.codeToHtml(
                                String(policy.withCheck),
                                {
                                  theme: "tokyo-night",
                                  lang: "sql",
                                },
                              ) || "",
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
            <div
              key={relation.fieldName}
              className="dv:relative dv:flex dv:text-sm"
            >
              <div className="dv:flex dv:w-full dv:items-center dv:justify-between dv:gap-2 dv:p-2">
                <div className="dv:flex dv:items-center dv:gap-2">
                  <CableIcon className="dv:text-green dv:size-4" />
                  {relation.fieldName}
                  <span className="dv:text-xs dv:text-muted-foreground">
                    {relation.type}
                  </span>
                </div>
                <span className="dv:flex dv:items-center dv:text-xs dv:text-muted-foreground">
                  {relation.referencedTableName}
                  {relation.type === "one" ? " | null" : "[]"}
                </span>
              </div>

              <Handle
                type="target"
                position={Position.Right}
                id={`${relation.fieldName}`}
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
  const hiddenNodeConnector =
    "dv:h-px! dv:w-px! dv:min-w-0! dv:min-h-0! dv:cursor-grab! dv:border-0! dv:opacity-0!";

  return (
    <>
      <div className="dv:flex dv:min-w-64 dv:flex-col dv:divide-y dv:divide-border dv:rounded-lg dv:border-2 dv:border-border dv:bg-background dv:text-foreground dv:shadow-md">
        <div className="dv:flex dv:p-2 dv:text-base">
          <div className="dv:flex dv:w-full dv:flex-col dv:gap-4">
            <div className="dv:flex dv:items-center dv:justify-between dv:gap-4 dv:text-base">
              <div className="dv:relative dv:flex dv:items-center dv:gap-2">
                <EyeIcon className="dv:size-5" />
                <span>
                  {data.schema && data.schema !== "public"
                    ? `${data.schema}.${data.name}`
                    : data.name}
                </span>
              </div>
              <div className="dv:flex dv:items-center dv:gap-2">
                {data.provider && (
                  <Badge
                    variant="outline"
                    className="dv:items-center dv:gap-2"
                    data-no-print
                  >
                    {!data.with?.securityInvoker && (
                      <TriangleAlertIcon className="dv:text-orange-400 dv:size-4" />
                    )}
                    RLS {data.with?.securityInvoker ? "enabled" : "disabled"}
                  </Badge>
                )}
                {data.definition && (
                  <Popover data-no-print>
                    <PopoverTrigger asChild>
                      <Button
                        data-no-print
                        variant="ghost"
                        size="sm"
                        className="dv:h-6 dv:border-none"
                      >
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
            {data.withExplain && data.description && (
              <Description description={data.description} />
            )}
          </div>
        </div>
        <div className="dv:relative dv:cursor-default dv:divide-y dv:divide-border">
          {data.columns.map((column) => {
            return (
              <div
                key={column.name}
                className="dv:relative dv:flex dv:flex-col dv:gap-4 dv:p-2 dv:text-sm"
              >
                <div className="dv:flex dv:w-full dv:items-center dv:justify-between dv:gap-2">
                  <div className="dv:flex dv:items-center dv:gap-2">
                    {column.isPrimaryKey && (
                      <KeyRoundIcon className="dv:text-green dv:size-4" />
                    )}
                    {/* {column.isForeignKey && (
                      <Icon name="link" size="sm" className="text-green" />
                    )} */}
                    {column.isUnique && (
                      <BadgeCheckIcon className="dv:text-secondary-foreground dv:size-4" />
                    )}
                    <DiamondIcon
                      className={cn(
                        "dv:size-4",
                        column.isNotNull && "dv:fill-secondary-foreground",
                      )}
                    />
                    {column.name}
                  </div>
                  <span className="dv:px-2 dv:py-1 dv:text-xs dv:text-muted-foreground">
                    {column.enumValues
                      ? column.enumValues.join(" | ")
                      : column.dataType}
                    {!column.isNotNull && " | null"}
                  </span>
                  {(column.default || column.defaultFn) && (
                    <Popover data-no-print>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="custom"
                          className="dv:absolute dv:right-1 dv:px-2 dv:py-1"
                        >
                          <span className="dv:text-xs dv:text-muted-foreground">
                            {column.enumValues
                              ? column.enumValues.join(" | ")
                              : column.dataType}
                            {!column.isNotNull && " | null"}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="dv:flex dv:w-fit dv:flex-row dv:items-center dv:gap-2">
                        <span className="dv:text-xs dv:text-muted-foreground">
                          default:
                        </span>
                        <pre
                          className="dv:text-sm"
                          dangerouslySetInnerHTML={{
                            __html:
                              highlighter?.codeToHtml(
                                String(
                                  column.default || column.defaultFn || "",
                                ),
                                {
                                  theme: "tokyo-night",
                                  lang: column.default ? "sql" : "typescript",
                                },
                              ) || "",
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
                {data.withExplain && column.description && (
                  <Description description={column.description} />
                )}
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
    </>
  );
}

function Description({ description }: { description: string }) {
  return (
    <div className="dv:relative dv:flex dv:rounded-md dv:border dv:border-muted/80 dv:px-2 dv:py-0.5 dv:text-foreground/60">
      <span className="dv:left-1 dv:top-[-0.5rem] dv:flex dv:gap-1 dv:bg-background dv:pr-1">
        <BookTextIcon className="dv:size-4" />
      </span>
      <span
        className="dv:flex-wrap dv:text-inherit"
        style={{ fontSize: "0.6rem" }}
      >
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
            className="dv:text-sm dv:font-semibold dv:text-blue"
          >
            Check how
          </a>
          <Typography variant="mutedText" className="dv:text-sm">
            you can document your schema!
          </Typography>
        </div>
        <Separator className="my-2" /> */}
        <div className="dv:flex dv:flex-row dv:items-center dv:gap-1">
          <span className="dv:text-sm dv:text-muted-foreground">
            This diagram is powered by{" "}
          </span>
          <a
            href="https://reactflow.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="dv:text-sm dv:font-semibold dv:text-blue"
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
          <Toggle
            variant="outline"
            size="icon:sm"
            className="dv:bg-background"
            {...props}
          >
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

function downloadImage(dataUrl: string) {
  const a = document.createElement("a");

  a.setAttribute("download", "schema.png");
  a.setAttribute("href", dataUrl);
  a.click();
}

const PADDING = 100; // Add padding around the nodes
const MIN_DIMENSION = 1024; // Minimum dimension to ensure quality
const MAX_DIMENSION = 4096; // Maximum dimension to prevent excessive file size

export function DownloadSchemaButton() {
  const { getNodes } = useReactFlow();
  const [isGenerating, setIsGenerating] = useState(false);

  const onClick = async () => {
    setIsGenerating(true);

    try {
      const nodes = getNodes();
      const nodesBounds = getNodesBounds(nodes);

      // Add padding to the bounds
      nodesBounds.x -= PADDING;
      nodesBounds.y -= PADDING;
      nodesBounds.width += 2 * PADDING;
      nodesBounds.height += 2 * PADDING;

      // Calculate dimensions while maintaining aspect ratio
      const aspectRatio = nodesBounds.width / nodesBounds.height;
      let imageWidth, imageHeight;

      if (aspectRatio > 1) {
        // Wider than tall
        imageWidth = Math.min(
          Math.max(nodesBounds.width, MIN_DIMENSION),
          MAX_DIMENSION,
        );
        imageHeight = imageWidth / aspectRatio;
      } else {
        // Taller than wide
        imageHeight = Math.min(
          Math.max(nodesBounds.height, MIN_DIMENSION),
          MAX_DIMENSION,
        );
        imageWidth = imageHeight * aspectRatio;
      }

      // Round dimensions to integers
      imageWidth = Math.round(imageWidth);
      imageHeight = Math.round(imageHeight);

      // Create a hidden container - Prevents UI flickering while generating
      const hiddenContainer = document.createElement("div");
      hiddenContainer.style.position = "absolute";
      hiddenContainer.style.left = "-99999px";
      hiddenContainer.style.width = `${imageWidth}px`;
      hiddenContainer.style.height = `${imageHeight}px`;
      document.body.appendChild(hiddenContainer);

      // Clone the viewport into the hidden container
      const viewport = document.querySelector(
        ".react-flow__viewport",
      ) as HTMLElement;

      if (!viewport) {
        return;
      }

      const viewportClone = viewport.cloneNode(true) as HTMLElement;
      hiddenContainer.appendChild(viewportClone);

      // Calculate and apply transform
      const transform = getViewportForBounds(
        nodesBounds,
        imageWidth,
        imageHeight,
        0.1, // Lower minZoom to handle spread out tables better
        1, // maxZoom
        1.2, // Slightly increase padding factor
      );

      viewportClone.style.transform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})`;

      try {
        const dataUrl = await toPng(viewportClone, {
          width: imageWidth,
          height: imageHeight,
          skipFonts: true,
          backgroundColor: "#0f0f14",
          filter: (node) => {
            return !node.dataset?.noPrint;
          },
        });

        downloadImage(dataUrl);
      } finally {
        // Clean up
        document.body.removeChild(hiddenContainer);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const Icon = isGenerating ? LoaderPinwheelIcon : ImageDownIcon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon:sm"
            onClick={onClick}
            disabled={isGenerating}
          >
            <Icon
              className={cn("dv:size-4", isGenerating && "dv:animate-spin")}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Download the diagram as a PNG image</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
