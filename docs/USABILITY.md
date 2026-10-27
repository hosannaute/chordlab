# Composition usability pass

This update focuses on undo/redo, a smaller melody editor, and mobile controls. It does not change the project format or audio synthesis engine.

- Composition edits retain up to 100 undo steps per open project. Ctrl/Command+Z undoes, Ctrl/Command+Shift+Z or Ctrl+Y redoes. Text fields keep native editing shortcuts. Consecutive typing/tempo changes are grouped; saving closes a group. Loading another project resets history. Library deletion remains a separate confirmed action.
- Clearing a part or selecting a preset is reversible, so these actions no longer interrupt with native confirmation dialogs. Undoing back to a saved composition clears its unsaved marker.
- The melody editor starts with one octave of scale notes. Existing chromatic notes within that octave remain visible; All notes exposes the complete chromatic octave. A separate melody octave selector avoids moving the editor when playing another piano register.
- Drag a filled note to move it by half beats/semitones. Drag the marked right edge to choose a half-, one-, two-, or four-beat length. A preview shows the proposed edit. One completed gesture creates one history step; cancellation and rejected overlaps keep the original note. Move buttons, duration selection, grid arrows and Delete/Backspace remain available.
- A fixed phone playback bar keeps Play, Stop, Undo and Redo reachable. Sound/keyboard settings fold away on phones, and the piano follows the progression before chord details. Melody paging changes between one and two bars when crossing the phone breakpoint, keeping the current beat in view.

Undo history lives in memory and is not saved in exported projects. This release does not add automatic draft recovery, new synth sounds or voice leading. Physical Android multitouch and assistive-technology testing remain separate device QA tasks.
