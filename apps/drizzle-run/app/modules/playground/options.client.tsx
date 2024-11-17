import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { Label } from "@repo/ui/components/label";
import { Switch } from "@repo/ui/components/switch";
import { createStore } from "@xstate/store";
import { useSelector } from "@xstate/store/react";
import type { editor as MonacoEditor } from "monaco-editor";

import type { Closable } from "~/utils/use-dialog";

const defaultUserOptions: MonacoEditor.IStandaloneEditorConstructionOptions = {
  lineNumbers: "off",
};

const storageKey = "editor-options";

const userOptions = JSON.parse(
  localStorage.getItem(storageKey) || JSON.stringify(defaultUserOptions),
) as MonacoEditor.IStandaloneEditorConstructionOptions;

const baseOptions: MonacoEditor.IStandaloneEditorConstructionOptions = {
  scrollBeyondLastLine: false,
  definitionLinkOpensInPeek: true,
  fontSize: 16,
  formatOnPaste: true,
  formatOnType: false,
  minimap: {
    enabled: false,
  },
  suggest: {
    showWords: false,
    showClasses: false,
    showInterfaces: false,
  },
  foldingImportsByDefault: true,
  overviewRulerLanes: 0,
  scrollbar: {
    vertical: "auto",
  },
  hover: {
    above: true,
  },
  ...userOptions,
};

const store = createStore({
  // Initial context
  context: userOptions,
  // Transitions
  on: {
    line_numbers_toggle: {
      lineNumbers: (_, event: { value: "on" | "off" }) => event.value,
    },
  },
});

store.subscribe((snapshot) => {
  localStorage.setItem(storageKey, JSON.stringify(snapshot.context));
});

function useEditorOptions() {
  const userOptions = useSelector(store, (state) => state.context);

  return {
    ...baseOptions,
    ...userOptions,
  };
}

function EditorOptionsDialog({ close }: Closable) {
  const editorOptions = useEditorOptions();

  return (
    <Dialog open onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editor settings</DialogTitle>
          <div className="flex flex-col gap-2 py-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="line-numbers"
                defaultChecked={editorOptions.lineNumbers === "on"}
                onCheckedChange={(checked) => {
                  store.send({
                    type: "line_numbers_toggle",
                    value: checked ? "on" : "off",
                  });
                }}
              />
              <Label htmlFor="line-numbers">Show line numbers</Label>
            </div>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

export { EditorOptionsDialog, useEditorOptions };
