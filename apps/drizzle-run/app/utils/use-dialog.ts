import React from "react";

export type Closable = {
  close: (cb?: Function | unknown) => void;
};

export type Openable = {
  open: () => void;
};

export function useDialog<DialogType extends string>() {
  const [type, setType] = React.useState<DialogType | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);

  const open = React.useCallback((actionType: DialogType) => {
    setType(actionType);
    setIsOpen(true);
  }, []);

  const close = React.useCallback<Closable["close"]>((cb) => {
    if (cb && typeof cb === "function") {
      cb();
    }
    setType(null);
    setIsOpen(false);
  }, []);

  const toggle = React.useCallback(() => {
    setIsOpen((open) => !open);
  }, []);

  return { isOpen, open, close, toggle, type };
}
