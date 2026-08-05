// imageUploadHelpers.js
//
// Shared logic for turning a File into an inserted, then-uploaded, image
// node. Used by paste, drag-and-drop, and the toolbar "Add Image" button
// so all three entry points behave identically.

let uploadCounter = 0;
const nextUploadId = () => `img-upload-${Date.now()}-${uploadCounter++}`;

export function isImageFile(file) {
  return file && file.type && file.type.startsWith('image/');
}

/**
 * Inserts a placeholder image (using a local object URL so the user sees it
 * immediately) at `pos`, uploads the file via `onImageUpload(file)`, then
 * swaps the placeholder's src for the real URL once the upload resolves.
 *
 * @param {import('@tiptap/react').Editor} editor
 * @param {File} file
 * @param {number|null} pos - insert position, or null to insert at current selection
 * @param {(file: File) => Promise<string>} onImageUpload - must resolve to a URL
 */
export function insertImageWithUpload(editor, file, pos, onImageUpload) {
  if (!editor || !isImageFile(file)) return;

  const uploadId = nextUploadId();
  const objectUrl = URL.createObjectURL(file);

  const chain = editor.chain().focus();
  if (typeof pos === 'number') chain.insertContentAt(pos, {
    type: 'image',
    attrs: { src: objectUrl, alt: file.name, uploading: true, uploadId },
  });
  else chain.insertContent({
    type: 'image',
    attrs: { src: objectUrl, alt: file.name, uploading: true, uploadId },
  });
  chain.run();

  if (!onImageUpload) {
    // No upload handler wired up — leave the local preview in place but
    // flag it so it's obvious this won't survive a reload.
    finalizeUploadNode(editor, uploadId, { uploading: false, error: true });
    return;
  }

  onImageUpload(file)
    .then((url) => {
      if (!url) throw new Error('Image upload resolved without a URL');
      finalizeUploadNode(editor, uploadId, { src: url, uploading: false, error: false });
      URL.revokeObjectURL(objectUrl);
    })
    .catch((err) => {
      console.error('Image upload failed:', err);
      finalizeUploadNode(editor, uploadId, { uploading: false, error: true });
    });
}

/** Finds the image node carrying `uploadId` and patches its attrs in place. */
function finalizeUploadNode(editor, uploadId, patch) {
  const { state, view } = editor;
  let targetPos = null;
  state.doc.descendants((node, pos) => {
    if (targetPos !== null) return false;
    if (node.type.name === 'image' && node.attrs.uploadId === uploadId) {
      targetPos = pos;
      return false;
    }
    return true;
  });
  if (targetPos === null) return;
  const node = state.doc.nodeAt(targetPos);
  if (!node) return;
  const tr = state.tr.setNodeMarkup(targetPos, undefined, { ...node.attrs, ...patch });
  view.dispatch(tr);
}
