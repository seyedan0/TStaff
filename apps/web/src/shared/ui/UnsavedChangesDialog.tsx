import React from "react";
import type { Blocker } from "react-router-dom";
import { Button } from "./Button.js";
import { Modal } from "./Modal.js";

export function UnsavedChangesDialog({ blocker }: { blocker: Blocker }) {
  return <Modal isOpen={blocker.state === "blocked"} onClose={() => blocker.reset?.()} title="تغییرات ذخیره نشده است" maxWidth="sm">
    <p className="mb-5 text-sm text-slate-400">با ترک صفحه، تغییراتی که هنوز ذخیره نکرده‌اید از دست می‌رود.</p>
    <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => blocker.reset?.()}>ادامه ویرایش</Button><Button variant="danger" onClick={() => blocker.proceed?.()}>ترک صفحه</Button></div>
  </Modal>;
}
