import "@xyflow/react/dist/style.css";

import dagre from "@dagrejs/dagre";
import type { Snapshot as MySqlSnapshot } from "@drizzle-lab/api/mysql";
import type { Snapshot as PgSnapshot } from "@drizzle-lab/api/pg";
import type { Snapshot as SQLiteSnapshot } from "@drizzle-lab/api/sqlite";
import type { Node, Edge } from "@xyflow/react";
import { Position } from "@xyflow/react";

/*
 * Work in progress
 */

export type Snapshot = PgSnapshot | SQLiteSnapshot | MySqlSnapshot;

type CompositePrimaryKeyDefinition =
  | PgSnapshot["tables"][number]["compositePrimaryKeys"][number]
  | SQLiteSnapshot["tables"][number]["compositePrimaryKeys"][number];
type RelationDefinition =
  | PgSnapshot["tables"][number]["relations"][number]
  | SQLiteSnapshot["tables"][number]["relations"][number];
type CheckDefinition =
  | PgSnapshot["tables"][number]["checkConstraints"][number]
  | SQLiteSnapshot["tables"][number]["checkConstraints"][number];
type PolicyDefinition = PgSnapshot["policies"][number];
type UniqueConstraintDefinition =
  | PgSnapshot["tables"][number]["uniqueConstraints"][number]
  | SQLiteSnapshot["tables"][number]["uniqueConstraints"][number];
type IndexDefinition =
  | PgSnapshot["tables"][number]["indexes"][number]
  | SQLiteSnapshot["tables"][number]["indexes"][number];
type ForeignKeyDefinition = {
  id: string;
  fkName: string;
  tableFrom: string;
  columnFrom: string;
  columnTo: string;
  tableTo: string;
  onDelete: string | undefined;
  onUpdate: string | undefined;
};

export type TableNodeDefinition = Node<
  {
    name: string;
    description?: string;
    schema?: string;
    columns: Array<{
      name: string;
      description?: string;
      dataType: string;
      isPrimaryKey: boolean;
      isForeignKey: boolean;
      isNotNull: boolean;
      isUnique: boolean;
      default?: string;
      defaultFn?: string;
      enumValues?: string[];
      jsonShape?: string;
      onDelete: string | undefined;
      onUpdate: string | undefined;
    }>;
    isRLSEnabled: boolean;
    provider: PgSnapshot["provider"];
    compositePrimaryKeys: Array<CompositePrimaryKeyDefinition>;
    relations: Array<RelationDefinition>;
    checks: Array<CheckDefinition>;
    policies: PolicyDefinition[];
    foreignKeys: Array<ForeignKeyDefinition>;
    uniqueConstraints: Array<UniqueConstraintDefinition>;
    indexes: Array<IndexDefinition>;
    withExplain?: boolean;
  },
  "table"
>;

export type ViewNodeDefinition = Node<
  {
    name: string;
    schema: string | undefined;
    definition: string | undefined;
    description: string | undefined;
    columns: Array<{
      name: string;
      dataType: string;
      isPrimaryKey: boolean;
      isNotNull: boolean;
      isUnique: boolean;
      description: string | undefined;
      enumValues?: string[];
      default?: string;
      defaultFn?: string;
    }>;
    withExplain?: boolean;
    materialized: boolean;
    with: PgSnapshot["views"][number]["with"];
    isExisting: boolean;
    provider: PgSnapshot["provider"];
  },
  "view"
>;

// ReactFlow is scaling everything by the factor of 2
const NODE_WIDTH = 1000;
const NODE_ROW_HEIGHT = 150;

// Supabase, thanks!
const getLayoutedElements = (
  nodes: (TableNodeDefinition | ViewNodeDefinition)[],
  edges: Edge[],
) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: "LR",
    align: "UR",
    nodesep: 25,
    ranksep: 50,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: NODE_WIDTH / 2.5,
      height: (NODE_ROW_HEIGHT / 2.5) * (node.data.columns.length + 1), // columns + header
    });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = Position.Left;
    node.sourcePosition = Position.Right;
    // We are shifting the dagre node position (anchor=center center) to the top left
    // so it matches the React Flow node anchor point (top left).
    node.position = {
      x: nodeWithPosition.x - nodeWithPosition.width / 2,
      y: nodeWithPosition.y - nodeWithPosition.height / 2,
    };

    return node;
  });

  return { nodes, edges };
};

export async function compute(snapshot: Snapshot) {
  if (!snapshot) {
    return { nodes: [], edges: [] };
  }

  const nodes: Array<TableNodeDefinition | ViewNodeDefinition> = [];
  const edges: Array<Edge> = [];

  switch (snapshot.dialect) {
    case "postgresql": {
      /* Tables */
      Object.values(snapshot.tables).forEach((table) => {
        /* Foreign Keys */
        const foreignKeys = Object.values(table.foreignKeys).flatMap((fk) => {
          const fkName = fk.name;
          const tableTo = fk.tableTo;
          const tableFrom = table.name;
          const onDelete = fk.onDelete;
          const onUpdate = fk.onUpdate;

          return fk.columnsFrom.map((columnFrom, colIdx) => {
            const columnTo = fk.columnsTo[colIdx];

            return {
              id: `${fkName}_${colIdx}`,
              fkName,
              tableFrom,
              columnFrom,
              columnTo,
              tableTo,
              onDelete,
              onUpdate,
            };
          });
        });

        foreignKeys.forEach((foreignKey) => {
          edges.push({
            id: foreignKey.id,
            source: foreignKey.tableTo,
            sourceHandle: `${foreignKey.columnTo}-right`,
            target: foreignKey.tableFrom,
            targetHandle: `${foreignKey.columnFrom}-left`,
            style: { strokeWidth: 2 },
            type: "smoothstep",
          });
        });

        /* Composite Primary Keys */
        const compositePrimaryKeys = Object.values(table.compositePrimaryKeys);

        /* Relations */
        const relations = table.relations;

        relations.forEach((relation) => {
          edges.push({
            id: crypto.randomUUID(),
            source: relation.referencedTableName,
            sourceHandle: "relation",
            target: table.name,
            targetHandle: relation.fieldName,
            style: { strokeWidth: 2, strokeDasharray: "5" },
            type: "smoothstep",
          });
        });

        /* Checks */
        const checks = Object.values(table.checkConstraints);

        /* Unique Constraints */
        const uniqueConstraints = Object.values(table.uniqueConstraints);

        /* Indexes */
        const indexes = Object.values(table.indexes);

        /* Policies */
        const policies = Object.values(table.policies);

        /* Nodes */
        nodes.push({
          id: table.name,
          data: {
            name: table.name,
            description: table.description,
            schema: table.schema,
            columns: Object.values(table.columns).map((column) => {
              const foreignKey = foreignKeys.find(
                (fk) => fk.columnFrom === column.name,
              );

              return {
                name: column.name,
                dataType: column.type,
                description: column.description,
                isPrimaryKey:
                  column.primaryKey ||
                  compositePrimaryKeys.some((cpk) =>
                    cpk.columns.includes(column.name),
                  ),
                isForeignKey: Boolean(foreignKey),
                isNotNull: column.notNull,
                isUnique: column.isUnique,
                default: column.default,
                defaultFn: column.defaultFn,
                enumValues: column.enumValues,
                jsonShape: column.jsonShape,
                onDelete: foreignKey?.onDelete,
                onUpdate: foreignKey?.onUpdate,
              };
            }),
            isRLSEnabled: table.isRLSEnabled,
            provider: snapshot.provider,
            checks,
            relations,
            policies,
            compositePrimaryKeys,
            foreignKeys,
            uniqueConstraints,
            indexes,
          },
          position: { x: 0, y: 0 },
          type: "table",
        });
      });

      /* Views */
      Object.values(snapshot.views).forEach((view) => {
        nodes.push({
          id: view.name,
          data: {
            name: view.name,
            schema: view.schema,
            definition: view.definition,
            description: view.description,
            columns: Object.values(view.columns).map((column) => {
              return {
                name: column.name,
                dataType: column.type,
                isPrimaryKey: column.primaryKey,
                isNotNull: column.notNull,
                isUnique: column.isUnique,
                default: column.default,
                defaultFn: column.defaultFn,
                enumValues: column.enumValues,
                description: column.description,
              };
            }),
            materialized: view.materialized,
            with: view.with,
            isExisting: view.isExisting,
            provider: snapshot.provider,
          },
          position: { x: 0, y: 0 },
          type: "view",
        });
      });
      break;
    }
    case "sqlite": {
      /* Tables */
      Object.values(snapshot.tables).forEach((table) => {
        /* Foreign Keys */
        const foreignKeys = Object.values(table.foreignKeys).flatMap((fk) => {
          const fkName = fk.name;
          const tableTo = fk.tableTo;
          const tableFrom = table.name;
          const onDelete = fk.onDelete;
          const onUpdate = fk.onUpdate;

          return fk.columnsFrom.map((columnFrom, colIdx) => {
            const columnTo = fk.columnsTo[colIdx];

            return {
              id: `${fkName}_${colIdx}`,
              fkName,
              tableFrom,
              columnFrom,
              columnTo,
              tableTo,
              onDelete,
              onUpdate,
            };
          });
        });

        foreignKeys.forEach((foreignKey) => {
          edges.push({
            id: foreignKey.id,
            source: foreignKey.tableTo,
            sourceHandle: `${foreignKey.columnTo}-right`,
            target: foreignKey.tableFrom,
            targetHandle: `${foreignKey.columnFrom}-left`,
            style: { strokeWidth: 2 },
            type: "smoothstep",
          });
        });

        /* Composite Primary Keys */
        const compositePrimaryKeys = Object.values(table.compositePrimaryKeys);

        /* Relations */
        const relations = table.relations;

        relations.forEach((relation) => {
          edges.push({
            id: crypto.randomUUID(),
            source: relation.referencedTableName,
            sourceHandle: "relation",
            target: table.name,
            targetHandle: relation.fieldName,
            style: { strokeWidth: 2, strokeDasharray: "5" },
            type: "smoothstep",
          });
        });

        /* Checks */
        const checks = Object.values(table.checkConstraints);

        /* Unique Constraints */
        const uniqueConstraints = Object.values(table.uniqueConstraints);

        /* Indexes */
        const indexes = Object.values(table.indexes);

        /* Nodes */
        nodes.push({
          id: table.name,
          data: {
            name: table.name,
            description: table.description,
            columns: Object.values(table.columns).map((column) => {
              const foreignKey = foreignKeys.find(
                (fk) => fk.columnFrom === column.name,
              );

              return {
                name: column.name,
                dataType: column.type,
                description: column.description,
                isPrimaryKey:
                  column.primaryKey ||
                  compositePrimaryKeys.some((cpk) =>
                    cpk.columns.includes(column.name),
                  ),
                isForeignKey: Boolean(foreignKey),
                isNotNull: column.notNull,
                isUnique: false,
                default: column.default,
                defaultFn: column.defaultFn,
                enumValues: column.enumValues,
                jsonShape: column.jsonShape,
                onDelete: foreignKey?.onDelete,
                onUpdate: foreignKey?.onUpdate,
              };
            }),
            isRLSEnabled: false,
            provider: undefined,
            checks,
            relations,
            policies: [],
            compositePrimaryKeys,
            foreignKeys,
            uniqueConstraints,
            indexes,
          },
          position: { x: 0, y: 0 },
          type: "table",
        });
      });

      /* Views */
      Object.values(snapshot.views).forEach((view) => {
        nodes.push({
          id: view.name,
          data: {
            name: view.name,
            schema: undefined,
            definition: view.definition,
            description: view.description,
            columns: Object.values(view.columns).map((column) => {
              return {
                name: column.name,
                dataType: column.type,
                isPrimaryKey: column.primaryKey,
                isNotNull: column.notNull,
                isUnique: false,
                default: column.default,
                defaultFn: column.defaultFn,
                enumValues: column.enumValues,
                description: column.description,
              };
            }),
            materialized: false,
            with: undefined,
            isExisting: view.isExisting,
            provider: undefined,
          },
          position: { x: 0, y: 0 },
          type: "view",
        });
      });

      break;
    }
  }

  return getLayoutedElements(nodes, edges);
}
