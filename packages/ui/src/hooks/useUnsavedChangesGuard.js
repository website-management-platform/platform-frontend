import { useEffect } from "react";
import { useBeforeUnload, useBlocker } from "react-router";
import { useConfirm } from "@/hooks/useConfirm";

const dirtyGuards = new Set();
let navigationAllowed = false;

const DISCARD_DIALOG = {
  variant: "warning",
  title: "Kaydedilmemiş değişiklikler var",
  description: "Devam ederseniz yaptığınız değişiklikler kaybolacak.",
  confirmLabel: "Değişiklikleri at",
  cancelLabel: "Sayfada kal",
};

export const hasUnsavedChanges = () => dirtyGuards.size > 0;

export const confirmDiscardChanges = async (confirm) => (hasUnsavedChanges() ? confirm(DISCARD_DIALOG) : true);

// İzin tek seferliktir ve yalnızca kirli form varken verilir; tüketilmezse bir sonraki konum
// değişiminde silinir ki başka bir formun onay sorusunu sessizce atlatmasın.
export const allowNextNavigation = () => {
  if (hasUnsavedChanges()) navigationAllowed = true;
};

export const clearNavigationAllowance = () => {
  navigationAllowed = false;
};

export const useUnsavedChangesGuard = (dirty) => {
  const confirm = useConfirm();
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (!dirty || currentLocation.pathname === nextLocation.pathname) return false;
    if (navigationAllowed) {
      navigationAllowed = false;
      return false;
    }
    return true;
  });

  useEffect(() => {
    if (!dirty) return undefined;
    const token = Symbol("unsaved");
    dirtyGuards.add(token);
    return () => {
      dirtyGuards.delete(token);
    };
  }, [dirty]);

  useBeforeUnload((event) => {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = "";
  });

  useEffect(() => {
    if (blocker.state !== "blocked") return undefined;
    let active = true;
    confirm({
      ...DISCARD_DIALOG,
      description: "Sayfadan ayrılırsanız yaptığınız değişiklikler kaybolacak.",
      confirmLabel: "Ayrıl",
    }).then((confirmed) => {
      if (!active) return;
      if (confirmed) blocker.proceed();
      else blocker.reset();
    });
    return () => {
      active = false;
    };
  }, [blocker, confirm]);
};
