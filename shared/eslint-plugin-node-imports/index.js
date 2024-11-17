module.exports = {
  rules: {
    "no-node-imports": {
      meta: {
        type: "problem",
        docs: {
          description:
            "Prevent importing/exporting .node.ts files from non-.node.ts files except for type imports/exports",
        },
      },
      create(context) {
        function checkNodeImport(node) {
          const sourcePath = node.source.value;
          const currentFilePath = context.getFilename();

          if (sourcePath.includes(".node")) {
            // Allow if current file is .node.ts
            if (currentFilePath.includes(".node")) {
              return;
            }

            // Allow if it's a type import/export
            if (
              node.importKind === "type" ||
              node.exportKind === "type" ||
              (node.specifiers &&
                node.specifiers.every(
                  (spec) =>
                    spec.importKind === "type" || spec.exportKind === "type",
                ))
            ) {
              return;
            }

            context.report({
              node,
              message:
                "Files with .node extension can only be imported/exported in other .node files or as type imports/exports",
            });
          }
        }

        return {
          ImportDeclaration: checkNodeImport,
          ExportNamedDeclaration(node) {
            if (node.source) {
              checkNodeImport(node);
            }
          },
          ExportAllDeclaration: checkNodeImport,
        };
      },
    },
  },
};
