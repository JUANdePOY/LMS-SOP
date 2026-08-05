// ImageResizable.js
//
// Extends @tiptap/extension-image with:
//  - width (percentage string, e.g. "35%") for Small / Medium / Large / Custom sizing
//  - align (left | center | right)
//  - caption (plain text, rendered as an editable <figcaption>)
//  - transient upload state (uploading / uploadId / error) used only while an
//    upload is in flight — these are stripped before the doc is persisted.
//
// The node view (drag-to-resize handles, caption box, size preset menu) lives
// in ImageNodeView.jsx. This file only defines the schema + HTML round-trip.

import Image from '@tiptap/extension-image';
import { ReactNodeViewRenderer } from '@tiptap/react';
import ImageNodeView from './ImageNodeView';

const ImageResizable = Image.extend({
  name: 'image',

  addOptions() {
    return {
      ...this.parent?.(),
      inline: false,
      allowBase64: false,
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-width') || el.style.width || null,
        renderHTML: (attrs) => (attrs.width ? { 'data-width': attrs.width, style: `width: ${attrs.width}` } : {}),
      },
      align: {
        default: 'center',
        parseHTML: (el) => el.getAttribute('data-align') || 'center',
        renderHTML: (attrs) => ({ 'data-align': attrs.align || 'center' }),
      },
      caption: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-caption') || '',
        renderHTML: (attrs) => (attrs.caption ? { 'data-caption': attrs.caption } : {}),
      },
      // Transient — only meaningful in the live editor session while a file
      // is mid-upload. Never written into the persisted HTML.
      uploading: { default: false, rendered: false },
      uploadId: { default: null, rendered: false },
      error: { default: false, rendered: false },
    };
  },

  parseHTML() {
    return [{ tag: 'img[src]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const { caption, 'data-align': dataAlign, 'data-width': dataWidth, style: inheritedStyle, ...imgAttrs } = HTMLAttributes;
    const children = [['img', {
      ...imgAttrs,
      style: `width: 100%; height: auto; display: block; ${inheritedStyle || ''}`.trim(),
    }]];
    if (caption) children.push(['figcaption', {}, caption]);

    const figureAttrs = { class: 'sop-image-figure', 'data-align': dataAlign || 'center' };
    if (dataWidth) {
      figureAttrs.style = `width: ${dataWidth}; max-width: 100%;`;
      figureAttrs['data-width'] = dataWidth;
    }
    return ['figure', figureAttrs, ...children];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});

export default ImageResizable;
