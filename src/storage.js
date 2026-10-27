import { validateProject, migrateLegacy } from "./project.js";
const KEY = "chordlab-projects-v2";
export function readProjects(storage = localStorage) {
  const raw = storage.getItem(KEY);
  if (raw !== null) {
    const list = JSON.parse(raw);
    if (!Array.isArray(list) || list.length > 100)
      throw new Error(
        "Saved project library is invalid. Export your open project before changing browser data.",
      );
    return list.map(validateProject);
  }
  const legacy = storage.getItem("chordlab-v1");
  return legacy ? [migrateLegacy(JSON.parse(legacy))] : [];
}
export function saveProject(project, storage = localStorage) {
  const valid = validateProject(project);
  const list = readProjects(storage);
  const index = list.findIndex((p) => p.id === valid.id);
  if (index >= 0) {
    list.splice(index, 1);
    list.push(valid);
  } else {
    if (list.length >= 100)
      throw new Error(
        "Library is full (100 projects). Export and delete a project first.",
      );
    list.push(valid);
  }
  storage.setItem(KEY, JSON.stringify(list));
  return list;
}
export function deleteProject(id, storage = localStorage) {
  const list = readProjects(storage).filter((p) => p.id !== id);
  storage.setItem(KEY, JSON.stringify(list));
  return list;
}
export function parseProject(text) {
  if (text.length > 250000)
    throw new Error("Project file is too large (maximum 250 KB).");
  try {
    return validateProject(JSON.parse(text));
  } catch (error) {
    if (error instanceof SyntaxError)
      throw new Error(
        "The file contains invalid JSON. Your current project has been kept.",
      );
    throw error;
  }
}
