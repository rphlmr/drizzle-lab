import "@xyflow/react/dist/style.css";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Icon } from "@repo/ui/components/icon";
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
import { highlighter } from "./highlighter";

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

type NodeTypes = TableNodeDefinition | ViewNodeDefinition;

export function DrizzleVisualizer({
  loading,
  className,
  snapshot,
  initialNodesPositions,
  onNodesPositionsChange,
  showMiniMap = true,
}: {
  snapshot: Snapshot;
  loading?: boolean;
  className?: string;
  initialNodesPositions?: NodePosition[];
  onNodesPositionsChange?: (nodesPositions: NodePosition[]) => void;
  showMiniMap?: boolean;
}) {
  const projectId = snapshot.projectId;
  const [withExplain, setWithExplain] = useState(false);
  const [nodes, setNodes] = useState([] as Array<NodeTypes>);
  const [edges, setEdges] = useEdgesState([] as Array<Edge>);
  const nodeTypes = useMemo(() => ({ table: TableNode, view: ViewNode }), []);
  const shiftPressed = useKeyPress("ShiftLeft");
  const hasDescription =
    Object.values(snapshot.tables).some((table) => table.description) ||
    Object.values(snapshot.views).some((view) => view.description);

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
    <div className={cn("size-full", className)}>
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
          <div className="absolute flex size-full items-center justify-center">
            loading...
          </div>
        )}
        <Panel position="top-right">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <AutoLayoutButton
                onClick={() => {
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
            <div className="flex items-center gap-1">
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
            className="rounded-md border-2 border-muted-foreground/10"
            nodeColor="#ffffff10"
          />
        )}
      </ReactFlow>
    </div>
  );
}

function TableNode({ data }: NodeProps<TableNodeDefinition>) {
  const hiddenNodeConnector =
    "!h-px !w-px !min-w-0 !min-h-0 !cursor-grab !border-0 !opacity-0";

  return (
    <>
      <div className="flex min-w-64 max-w-fit flex-col divide-y rounded-lg border-2 bg-background text-foreground shadow-md">
        <div className="flex w-full p-2 text-base">
          <div className="flex w-full flex-col gap-4">
            <div className="flex w-full items-center justify-between gap-4 text-base">
              <div className="relative flex items-center gap-2">
                <Icon name="sheet" size="md" />
                <span>
                  {data.schema ? `${data.schema}.${data.name}` : data.name}
                </span>
              </div>
              {data.provider && (
                <Badge
                  variant="outline"
                  className="items-center gap-2"
                  data-no-print
                >
                  {!data.isRLSEnabled && (
                    <Icon
                      name="triangle-alert"
                      size="sm"
                      className="text-orange-400"
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
        <div className="relative cursor-default divide-y">
          {data.columns.map((column) => {
            return (
              <div
                key={column.name}
                className="relative flex w-full flex-col gap-4 p-2 text-sm"
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <div className="relative flex items-center gap-2">
                    {column.isPrimaryKey && (
                      <Icon name="key-round" size="sm" className="text-green" />
                    )}
                    {column.isForeignKey && (
                      <>
                        <span className="mr-1 size-4" />
                        <Popover data-no-print>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="custom"
                              className="absolute -left-1 p-1"
                            >
                              <Icon
                                name="link"
                                size="sm"
                                className="text-green"
                              />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-fit">
                            <div className="flex gap-2 p-2">
                              <span className="text-xs text-muted-foreground">
                                on delete:
                              </span>
                              <span className="text-xs">{column.onDelete}</span>
                              <span className="text-xs text-muted-foreground">
                                on update:
                              </span>
                              <span className="text-xs">{column.onUpdate}</span>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </>
                    )}
                    {column.isUnique && (
                      <Icon
                        name="badge-check"
                        size="sm"
                        className="text-secondary-foreground"
                      />
                    )}
                    <Icon
                      name="diamond"
                      size="sm"
                      className={cn(
                        column.isNotNull && "fill-secondary-foreground",
                      )}
                    />
                    {column.name}
                  </div>
                  <span className="px-2 py-1 text-xs text-muted-foreground">
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
                          className="absolute right-1 px-2 py-1"
                        >
                          <span className="text-xs text-muted-foreground">
                            {column.enumValues
                              ? column.enumValues.join(" | ")
                              : column.dataType}
                            {!column.isNotNull && " | null"}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="flex w-fit flex-row items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {column.jsonShape ? "shape" : "default"}:
                        </span>
                        <pre
                          className="text-sm"
                          dangerouslySetInnerHTML={{
                            __html: highlighter.codeToHtml(
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
                            ),
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
                  className={cn(hiddenNodeConnector, "!left-0")}
                />

                <Handle
                  type="source"
                  position={Position.Right}
                  id={`${column.name}-right`}
                  className={cn(hiddenNodeConnector, "!right-0")}
                />
              </div>
            );
          })}

          {data.checks.length > 0 && <Separator className="h-1" />}
          {data.checks.map((check) => {
            return (
              <div key={check.name} className="relative flex text-sm">
                <div className="relative flex w-full items-center justify-between gap-2 p-2">
                  <div className="relative flex items-center gap-2">
                    <span className="mr-1 size-4" />
                    <Popover data-no-print>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="custom"
                          className="absolute -left-1 p-1"
                        >
                          <Icon
                            name="shield-check"
                            size="sm"
                            className="text-green"
                          />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-fit">
                        <pre
                          className="text-sm"
                          dangerouslySetInnerHTML={{
                            __html: highlighter.codeToHtml(
                              String(check.value),
                              {
                                theme: "tokyo-night",
                                lang: "sql",
                              },
                            ),
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
              <div key={policy.name} className="relative flex text-sm">
                <div className="flex w-full items-center justify-between gap-2 p-2">
                  <div className="flex items-center gap-2">
                    <Icon name="lock" size="sm" className="text-green" />
                    {policy.name}
                  </div>
                  <Popover data-no-print>
                    <PopoverTrigger asChild>
                      <Button
                        data-no-print
                        variant="ghost"
                        size="sm"
                        className="border-none"
                      >
                        <span>Show definition</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-fit">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          as
                        </span>
                        <span>{policy.as}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          to
                        </span>
                        <span>
                          {policy.to ? policy.to.join(", ") : "public"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          for
                        </span>
                        <span>{policy.for}</span>
                      </div>
                      {policy.using ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            using
                          </span>
                          <pre
                            className="text-sm"
                            dangerouslySetInnerHTML={{
                              __html: highlighter.codeToHtml(
                                String(policy.using),
                                {
                                  theme: "tokyo-night",
                                  lang: "sql",
                                },
                              ),
                            }}
                          />
                        </div>
                      ) : null}
                      {policy.withCheck ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            with check
                          </span>
                          <pre
                            className="text-sm"
                            dangerouslySetInnerHTML={{
                              __html: highlighter.codeToHtml(
                                String(policy.withCheck),
                                {
                                  theme: "tokyo-night",
                                  lang: "sql",
                                },
                              ),
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

          {data.relations.length > 0 && <Separator className="h-1" />}
          {data.relations.map((relation) => {
            return (
              <div key={relation.fieldName} className="relative flex text-sm">
                <div className="flex w-full items-center justify-between gap-2 p-2">
                  <div className="flex items-center gap-2">
                    <Icon name="cable" size="sm" className="text-green" />
                    {relation.fieldName}
                    <span className="text-xs text-muted-foreground">
                      {relation.type}
                    </span>
                  </div>
                  <span className="flex items-center text-xs text-muted-foreground">
                    {relation.referencedTableName}
                    {relation.type === "one" ? " | null" : "[]"}
                  </span>
                </div>

                <Handle
                  type="target"
                  position={Position.Right}
                  id={`${relation.fieldName}`}
                  className={cn(hiddenNodeConnector, "!right-0")}
                />
              </div>
            );
          })}
        </div>
        <Handle
          type="source"
          position={Position.Bottom}
          id="relation"
          className={cn(hiddenNodeConnector, "!bottom-0")}
        />
      </div>
    </>
  );
}

function ViewNode({ data }: NodeProps<ViewNodeDefinition>) {
  const hiddenNodeConnector =
    "!h-px !w-px !min-w-0 !min-h-0 !cursor-grab !border-0 !opacity-0";

  return (
    <>
      <div className="flex min-w-64 max-w-fit flex-col divide-y rounded-lg border-2 bg-background text-foreground shadow-md">
        <div className="flex w-full p-2 text-base">
          <div className="flex w-full flex-col gap-4">
            <div className="flex w-full items-center justify-between gap-4 text-base">
              <div className="relative flex items-center gap-2">
                <Icon name="eye" size="md" />
                <span>
                  {data.schema && data.schema !== "public"
                    ? `${data.schema}.${data.name}`
                    : data.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {data.provider && (
                  <Badge
                    variant="outline"
                    className="items-center gap-2"
                    data-no-print
                  >
                    {!data.with?.securityInvoker && (
                      <Icon
                        name="triangle-alert"
                        size="sm"
                        className="text-orange-400"
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
                        className="h-6 border-none"
                      >
                        <span>Definition</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-fit max-w-80">
                      <pre
                        className="flex flex-wrap overflow-hidden text-sm"
                        dangerouslySetInnerHTML={{
                          __html: highlighter.codeToHtml(
                            String(data.definition),
                            {
                              theme: "tokyo-night",
                              lang: "sql",
                              structure: "inline",
                            },
                          ),
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
        <div className="relative cursor-default divide-y">
          {data.columns.map((column) => {
            return (
              <div
                key={column.name}
                className="relative flex flex-col gap-4 p-2 text-sm"
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {column.isPrimaryKey && (
                      <Icon name="key-round" size="sm" className="text-green" />
                    )}
                    {/* {column.isForeignKey && (
                      <Icon name="link" size="sm" className="text-green" />
                    )} */}
                    {column.isUnique && (
                      <Icon
                        name="badge-check"
                        size="sm"
                        className="text-secondary-foreground"
                      />
                    )}
                    <Icon
                      name="diamond"
                      size="sm"
                      className={cn(
                        column.isNotNull && "fill-secondary-foreground",
                      )}
                    />
                    {column.name}
                  </div>
                  <span className="px-2 py-1 text-xs text-muted-foreground">
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
                          className="absolute right-1 px-2 py-1"
                        >
                          <span className="text-xs text-muted-foreground">
                            {column.enumValues
                              ? column.enumValues.join(" | ")
                              : column.dataType}
                            {!column.isNotNull && " | null"}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="flex w-fit flex-row items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          default:
                        </span>
                        <pre
                          className="text-sm"
                          dangerouslySetInnerHTML={{
                            __html: highlighter.codeToHtml(
                              String(column.default || column.defaultFn || ""),
                              {
                                theme: "tokyo-night",
                                lang: column.default ? "sql" : "typescript",
                              },
                            ),
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
                  className={cn(hiddenNodeConnector, "!left-0")}
                />

                <Handle
                  type="source"
                  position={Position.Right}
                  id={`${column.name}-right`}
                  className={cn(hiddenNodeConnector, "!right-0")}
                />
              </div>
            );
          })}
        </div>
        <Handle
          type="source"
          position={Position.Bottom}
          id="relation"
          className={cn(hiddenNodeConnector, "!bottom-0")}
        />
      </div>
    </>
  );
}

function Description({ description }: { description: string }) {
  return (
    <div className="relative rounded-md border border-muted/80 px-2 py-0.5 text-foreground/60">
      <span className="absolute -top-2 left-1 flex gap-1 bg-background px-1">
        <Icon name="book-text" size="xs" />
      </span>
      <span
        className="flex flex-wrap text-inherit"
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
      <PopoverContent className="w-fit">
        <div className="flex flex-row gap-1">
          <a
            href="https://github.com/rphlmr/drizzle-lab/tree/main/packages/api#extensions"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-blue"
          >
            Check how
          </a>
          <Typography variant="mutedText" className="text-sm">
            you can document your schema!
          </Typography>
        </div>
        <Separator className="my-2" />
        <div className="flex flex-row items-center gap-1">
          <Typography variant="mutedText" className="text-sm">
            This diagram is powered by{" "}
          </Typography>
          <a
            href="https://reactflow.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-blue"
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
            className="bg-background"
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
              className={cn(isGenerating && "animate-spin")}
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
