import { Widget } from '@lumino/widgets';
import { MainAreaWidget } from '@jupyterlab/apputils';
import { imageIcon } from '@jupyterlab/ui-components';

import { requestAPI } from './request';

interface RandomImageResponse {
  b64_bytes: string;
  caption: string;
}

class ImageCaptionWidget extends Widget {
  private readonly img: HTMLImageElement;
  private readonly caption: HTMLParagraphElement;

  constructor() {
    super();

    this.addClass('jp-jupytercon2025-extension-workshop-widget');

    const center = document.createElement('center');
    this.node.appendChild(center);

    this.img = document.createElement('img');
    this.img.alt = 'Random cat';
    this.img.style.maxWidth = '100%';
    center.appendChild(this.img);

    this.caption = document.createElement('p');
    center.appendChild(this.caption);

    void this.loadImage();
  }

  private async loadImage(): Promise<void> {
    try {
      const data = await requestAPI<RandomImageResponse>('random-image-caption');
      this.img.src = `data:image/jpeg;base64,${data.b64_bytes}`;
      this.caption.textContent = data.caption;
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error fetching image data: ${detail}`);
      this.caption.textContent = 'Failed to load image.';
    }
  }
}

export class ImageCaptionMainAreaWidget extends MainAreaWidget<ImageCaptionWidget> {
  constructor() {
    const widget = new ImageCaptionWidget();
    super({ content: widget });

    this.title.label = 'Random image with caption';
    this.title.caption = this.title.label;
    this.title.icon = imageIcon;
  }
}
