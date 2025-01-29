"use client";

import "@xyflow/react/dist/style.css";
import "./style.css";

import { useCallback, useEffect, useMemo, useState } from "react";

import { schemaToSnapshot as mysqlSchemaToSnapshot } from "@drizzle-lab/api/mysql/web";
import { schemaToSnapshot as pgSchemaToSnapshot } from "@drizzle-lab/api/pg/web";
import { schemaToSnapshot as sqliteSchemaToSnapshot } from "@drizzle-lab/api/sqlite/web";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import { Separator } from "@repo/ui/components/separator";
import { Toggle } from "@repo/ui/components/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/ui/components/tooltip";
import { Typography } from "@repo/ui/components/typography";
import { cn } from "@repo/ui/utils/cn";
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
import { Icon, IconSprite } from "./icons";

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
    <div className={cn("dzl-size-full", className)}>
      <IconSprite />
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
          <div className="dzl-absolute dzl-flex dzl-size-full dzl-items-center dzl-justify-center">
            loading...
          </div>
        )}
        <Panel position="top-right">
          <div className="dzl-flex dzl-items-center dzl-gap-4">
            <div className="dzl-flex dzl-items-center dzl-gap-1">
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
            <div className="dzl-flex dzl-items-center dzl-gap-1">
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
            className="dzl-rounded-md dzl-border-2 dzl-border-muted-foreground/10"
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
    "!dzl-h-px !dzl-w-px !dzl-min-w-0 !dzl-min-h-0 !dzl-cursor-grab !dzl-border-0 !dzl-opacity-0";

  return (
    <>
      <div className="dzl-flex dzl-min-w-64 dzl-max-w-fit dzl-flex-col dzl-divide-y dzl-divide-border dzl-rounded-lg dzl-border-2 dzl-border-border dzl-bg-background dzl-text-foreground dzl-shadow-md">
        <div className="dzl-flex dzl-w-full dzl-p-2 dzl-text-base">
          <div className="dzl-flex dzl-w-full dzl-flex-col dzl-gap-4">
            <div className="dzl-flex dzl-w-full dzl-items-center dzl-justify-between dzl-gap-4 dzl-text-base">
              <div className="relative dzl-flex dzl-items-center dzl-gap-2">
                <Icon name="sheet" size="md" />
                <span>
                  {data.schema ? `${data.schema}.${data.name}` : data.name}
                </span>
              </div>
              {data.provider && (
                <Badge
                  variant="outline"
                  className="dzl-items-center dzl-gap-2"
                  data-no-print
                >
                  {!data.isRLSEnabled && (
                    <Icon
                      name="triangle-alert"
                      size="sm"
                      className="dzl-text-orange-400"
                    />
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
        <div className="dzl-relative dzl-cursor-default dzl-divide-y dzl-divide-border">
          {data.columns.map((column) => {
            return (
              <div
                key={column.name}
                className="dzl-relative dzl-flex dzl-w-full dzl-flex-col dzl-gap-4 dzl-p-2 dzl-text-sm"
              >
                <div className="dzl-flex dzl-w-full dzl-items-center dzl-justify-between dzl-gap-2">
                  <div className="dzl-relative dzl-flex dzl-items-center dzl-gap-2">
                    {column.isPrimaryKey && (
                      <Icon
                        name="key-round"
                        size="sm"
                        className="dzl-text-green"
                      />
                    )}
                    {column.isForeignKey && (
                      <>
                        <span className="dzl-mr-1 dzl-size-4" />
                        <Popover data-no-print>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="custom"
                              className="dzl-absolute dzl--left-1 dzl-p-1"
                            >
                              <Icon
                                name="link"
                                size="sm"
                                className="dzl-text-green"
                              />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-fit">
                            <div className="dzl-flex dzl-gap-2 dzl-p-2">
                              <span className="dzl-text-xs dzl-text-muted-foreground">
                                on delete:
                              </span>
                              <span className="dzl-text-xs">
                                {column.onDelete}
                              </span>
                              <span className="dzl-text-xs dzl-text-muted-foreground">
                                on update:
                              </span>
                              <span className="dzl-text-xs">
                                {column.onUpdate}
                              </span>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </>
                    )}
                    {column.isUnique && (
                      <Icon
                        name="badge-check"
                        size="sm"
                        className="dzl-text-secondary-foreground"
                      />
                    )}
                    <Icon
                      name="diamond"
                      size="sm"
                      className={cn(
                        column.isNotNull && "dzl-fill-secondary-foreground",
                      )}
                    />
                    {column.name}
                  </div>
                  <span className="dzl-px-2 dzl-py-1 dzl-text-xs dzl-text-muted-foreground">
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
                          className="dzl-absolute dzl-right-1 dzl-px-2 dzl-py-1"
                        >
                          <span className="dzl-text-xs dzl-text-muted-foreground">
                            {column.enumValues
                              ? column.enumValues.join(" | ")
                              : column.dataType}
                            {!column.isNotNull && " | null"}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="dzl-flex dzl-w-fit dzl-flex-row dzl-items-center dzl-gap-2">
                        <span className="dzl-text-xs dzl-text-muted-foreground">
                          {column.jsonShape ? "shape" : "default"}:
                        </span>
                        <pre
                          className="dzl-text-sm"
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
                  className={cn(hiddenNodeConnector, "!dzl-left-0")}
                />

                <Handle
                  type="source"
                  position={Position.Right}
                  id={`${column.name}-right`}
                  className={cn(hiddenNodeConnector, "!dzl-right-0")}
                />
              </div>
            );
          })}

          {data.checks.length > 0 && <Separator className="h-1" />}
          {data.checks.map((check) => {
            return (
              <div
                key={check.name}
                className="dzl-relative dzl-flex dzl-text-sm"
              >
                <div className="dzl-relative dzl-flex dzl-w-full dzl-items-center dzl-justify-between dzl-gap-2 dzl-p-2">
                  <div className="dzl-relative dzl-flex dzl-items-center dzl-gap-2">
                    <span className="dzl-mr-1 dzl-size-4" />
                    <Popover data-no-print>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="custom"
                          className="dzl-absolute dzl--left-1 dzl-p-1"
                        >
                          <Icon
                            name="shield-check"
                            size="sm"
                            className="dzl-text-green"
                          />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="dzl-w-fit">
                        <pre
                          className="dzl-text-sm"
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
              <div
                key={policy.name}
                className="dzl-relative dzl-flex dzl-text-sm"
              >
                <div className="dzl-flex dzl-w-full dzl-items-center dzl-justify-between dzl-gap-2 dzl-p-2">
                  <div className="dzl-flex dzl-items-center dzl-gap-2">
                    <Icon name="lock" size="sm" className="dzl-text-green" />
                    {policy.name}
                  </div>
                  <Popover data-no-print>
                    <PopoverTrigger asChild>
                      <Button
                        data-no-print
                        variant="ghost"
                        size="sm"
                        className="dzl-border-none"
                      >
                        <span>Show definition</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="dzl-w-fit">
                      <div className="dzl-flex dzl-items-center dzl-gap-2">
                        <span className="dzl-text-xs dzl-text-muted-foreground">
                          as
                        </span>
                        <span>{policy.as}</span>
                      </div>
                      <div className="dzl-flex dzl-items-center dzl-gap-2">
                        <span className="dzl-text-xs dzl-text-muted-foreground">
                          to
                        </span>
                        <span>
                          {policy.to ? policy.to.join(", ") : "public"}
                        </span>
                      </div>
                      <div className="dzl-flex dzl-items-center dzl-gap-2">
                        <span className="dzl-text-xs dzl-text-muted-foreground">
                          for
                        </span>
                        <span>{policy.for}</span>
                      </div>
                      {policy.using ? (
                        <div className="dzl-flex dzl-items-center dzl-gap-2">
                          <span className="dzl-text-xs dzl-text-muted-foreground">
                            using
                          </span>
                          <pre
                            className="dzl-text-sm"
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
                        <div className="dzl-flex dzl-items-center dzl-gap-2">
                          <span className="dzl-text-xs dzl-text-muted-foreground">
                            with check
                          </span>
                          <pre
                            className="dzl-text-sm"
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

          {data.relations.length > 0 && <Separator className="dzl-h-1" />}
          {data.relations.map((relation) => {
            return (
              <div
                key={relation.fieldName}
                className="dzl-relative dzl-flex dzl-text-sm"
              >
                <div className="dzl-flex dzl-w-full dzl-items-center dzl-justify-between dzl-gap-2 dzl-p-2">
                  <div className="dzl-flex dzl-items-center dzl-gap-2">
                    <Icon name="cable" size="sm" className="dzl-text-green" />
                    {relation.fieldName}
                    <span className="dzl-text-xs dzl-text-muted-foreground">
                      {relation.type}
                    </span>
                  </div>
                  <span className="dzl-flex dzl-items-center dzl-text-xs dzl-text-muted-foreground">
                    {relation.referencedTableName}
                    {relation.type === "one" ? " | null" : "[]"}
                  </span>
                </div>

                <Handle
                  type="target"
                  position={Position.Right}
                  id={`${relation.fieldName}`}
                  className={cn(hiddenNodeConnector, "!dzl-right-0")}
                />
              </div>
            );
          })}
        </div>
        <Handle
          type="source"
          position={Position.Bottom}
          id="relation"
          className={cn(hiddenNodeConnector, "!dzl-bottom-0")}
        />
      </div>
    </>
  );
}

function ViewNode({ data }: NodeProps<ViewNodeDefinition>) {
  const highlighter = useHighlighter();
  const hiddenNodeConnector =
    "!dzl-h-px !dzl-w-px !dzl-min-w-0 !dzl-min-h-0 !dzl-cursor-grab !dzl-border-0 !dzl-opacity-0";

  return (
    <>
      <div className="dzl-flex dzl-min-w-64 dzl-max-w-fit dzl-flex-col dzl-divide-y dzl-divide-border dzl-rounded-lg dzl-border-2 dzl-border-border dzl-bg-background dzl-text-foreground dzl-shadow-md">
        <div className="dzl-flex dzl-w-full dzl-p-2 dzl-text-base">
          <div className="dzl-flex dzl-w-full dzl-flex-col dzl-gap-4">
            <div className="dzl-flex dzl-w-full dzl-items-center dzl-justify-between dzl-gap-4 dzl-text-base">
              <div className="dzl-relative dzl-flex dzl-items-center dzl-gap-2">
                <Icon name="eye" size="md" />
                <span>
                  {data.schema && data.schema !== "public"
                    ? `${data.schema}.${data.name}`
                    : data.name}
                </span>
              </div>
              <div className="dzl-flex dzl-items-center dzl-gap-2">
                {data.provider && (
                  <Badge
                    variant="outline"
                    className="dzl-items-center dzl-gap-2"
                    data-no-print
                  >
                    {!data.with?.securityInvoker && (
                      <Icon
                        name="triangle-alert"
                        size="sm"
                        className="dzl-text-orange-400"
                      />
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
                        className="dzl-h-6 dzl-border-none"
                      >
                        <span>Definition</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="dzl-w-fit dzl-max-w-80">
                      <pre
                        className="dzl-flex dzl-flex-wrap dzl-overflow-hidden dzl-text-sm"
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
        <div className="dzl-relative dzl-cursor-default dzl-divide-y dzl-divide-border">
          {data.columns.map((column) => {
            return (
              <div
                key={column.name}
                className="dzl-relative dzl-flex dzl-flex-col dzl-gap-4 dzl-p-2 dzl-text-sm"
              >
                <div className="dzl-flex dzl-w-full dzl-items-center dzl-justify-between dzl-gap-2">
                  <div className="dzl-flex dzl-items-center dzl-gap-2">
                    {column.isPrimaryKey && (
                      <Icon
                        name="key-round"
                        size="sm"
                        className="dzl-text-green"
                      />
                    )}
                    {/* {column.isForeignKey && (
                      <Icon name="link" size="sm" className="text-green" />
                    )} */}
                    {column.isUnique && (
                      <Icon
                        name="badge-check"
                        size="sm"
                        className="dzl-text-secondary-foreground"
                      />
                    )}
                    <Icon
                      name="diamond"
                      size="sm"
                      className={cn(
                        column.isNotNull && "dzl-fill-secondary-foreground",
                      )}
                    />
                    {column.name}
                  </div>
                  <span className="dzl-px-2 dzl-py-1 dzl-text-xs dzl-text-muted-foreground">
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
                          className="dzl-absolute dzl-right-1 dzl-px-2 dzl-py-1"
                        >
                          <span className="dzl-text-xs dzl-text-muted-foreground">
                            {column.enumValues
                              ? column.enumValues.join(" | ")
                              : column.dataType}
                            {!column.isNotNull && " | null"}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="dzl-flex dzl-w-fit dzl-flex-row dzl-items-center dzl-gap-2">
                        <span className="dzl-text-xs dzl-text-muted-foreground">
                          default:
                        </span>
                        <pre
                          className="dzl-text-sm"
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
                  className={cn(hiddenNodeConnector, "!dzl-left-0")}
                />

                <Handle
                  type="source"
                  position={Position.Right}
                  id={`${column.name}-right`}
                  className={cn(hiddenNodeConnector, "!dzl-right-0")}
                />
              </div>
            );
          })}
        </div>
        <Handle
          type="source"
          position={Position.Bottom}
          id="relation"
          className={cn(hiddenNodeConnector, "!dzl-bottom-0")}
        />
      </div>
    </>
  );
}

function Description({ description }: { description: string }) {
  return (
    <div className="dzl-relative dzl-flex dzl-rounded-md dzl-border dzl-border-muted/80 dzl-px-2 dzl-py-0.5 dzl-text-foreground/60">
      <span className="dzl-left-1 dzl-top-[-0.5rem] dzl-flex dzl-gap-1 dzl-bg-background dzl-pr-1">
        <Icon name="book-text" size="xs" />
      </span>
      <span
        className="dzl-flex-wrap dzl-text-inherit"
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
            <Icon name="shrink" size="sm" />
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
          <Icon name="info" size="sm" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="dzl-dark dzl-w-fit">
        {/* <div className="dzl-flex dzl-flex-row dzl-gap-1">
          <a
            href="https://github.com/rphlmr/drizzle-lab/tree/main/packages/api#extensions"
            target="_blank"
            rel="noopener noreferrer"
            className="dzl-text-sm dzl-font-semibold dzl-text-blue"
          >
            Check how
          </a>
          <Typography variant="mutedText" className="dzl-text-sm">
            you can document your schema!
          </Typography>
        </div>
        <Separator className="my-2" /> */}
        <div className="dzl-flex dzl-flex-row dzl-items-center dzl-gap-1">
          <Typography variant="mutedText" className="dzl-text-sm">
            This diagram is powered by{" "}
          </Typography>
          <a
            href="https://reactflow.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="dzl-text-sm dzl-font-semibold dzl-text-blue"
          >
            React Flow
          </a>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ExplainToggle(props: React.ComponentPropsWithoutRef<typeof Toggle>) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle
            variant="outline"
            size="icon:sm"
            className="dzl-bg-background"
            {...props}
          >
            <Icon
              name={props.pressed ? "captions" : "captions-off"}
              size="sm"
            />
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
              name={isGenerating ? "loader-pinwheel" : "image-down"}
              size="sm"
              className={cn(isGenerating && "dzl-animate-spin")}
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
