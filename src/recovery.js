import { validateProject } from "./project.js";
const KEY = "chordlab-drafts-v1";
const canonicalSignature = (value) =>
  value === null ? null : JSON.stringify(validateProject(JSON.parse(value)));
export function readDrafts(storage = localStorage) {
  const raw = storage.getItem(KEY);
  if (raw === null) return [];
  const list = JSON.parse(raw);
  if (!Array.isArray(list) || list.length > 20)
    throw new Error(
      "Recovery drafts could not be read. Existing data was kept.",
    );
  return list.map((draft) => {
    if (
      !draft ||
      !Number.isFinite(draft.updatedAt) ||
      (draft.savedSignature !== null &&
        typeof draft.savedSignature !== "string")
    )
      throw new Error("A recovery draft is invalid. Existing data was kept.");
    return {
      project: validateProject(draft.project),
      savedSignature: canonicalSignature(draft.savedSignature),
      updatedAt: draft.updatedAt,
    };
  });
}
export function saveDraft(
  project,
  savedSignature,
  storage = localStorage,
  now = Date.now(),
) {
  const list = readDrafts(storage).filter(
    (draft) => draft.project.id !== project.id,
  );
  const draft = {
    project: validateProject(project),
    savedSignature: canonicalSignature(savedSignature),
    updatedAt: now,
  };
  list.push(draft);
  storage.setItem(KEY, JSON.stringify(list.slice(-20)));
  return draft;
}
export function recoverableDraft(drafts) {
  const last = drafts.at(-1);
  return last && JSON.stringify(last.project) !== last.savedSignature
    ? last
    : null;
}
