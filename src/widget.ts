import { Widget } from '@lumino/widgets';
import {
  MainAreaWidget,
  ToolbarButton,
  showErrorMessage
} from '@jupyterlab/apputils';
import { imageIcon, refreshIcon, saveIcon } from '@jupyterlab/ui-components';

import { requestAPI } from './request';

interface RandomImageResponse {
  b64_bytes: string;
  caption: string;
}

interface EditImageResponse {
  b64_bytes: string;
  status: string;
}

class ImageCaptionWidget extends Widget {
  private readonly img: HTMLImageElement;
  private readonly caption: HTMLParagraphElement;
  private readonly statusDiv: HTMLDivElement;
  private readonly controlsContainer: HTMLDivElement;
  private currentImageData: string = '';
  private originalImageData: string = '';
  private appliedFilters: string[] = [];

  constructor() {
    super();

    this.addClass('jp-jupytercon2025-extension-workshop-widget');

    // Create main container with flexbox layout
    const mainContainer = document.createElement('div');
    mainContainer.className = 'jp-image-editor-container';
    this.node.appendChild(mainContainer);

    // Create controls panel
    this.controlsContainer = this._createControlsPanel();
    mainContainer.appendChild(this.controlsContainer);

    // Create image display area
    const imageContainer = document.createElement('div');
    imageContainer.className = 'jp-image-display-area';
    mainContainer.appendChild(imageContainer);

    this.img = document.createElement('img');
    this.img.alt = 'Random cat';
    this.img.className = 'jp-image-display';
    imageContainer.appendChild(this.img);

    this.caption = document.createElement('p');
    this.caption.className = 'jp-image-caption';
    imageContainer.appendChild(this.caption);

    this.statusDiv = document.createElement('div');
    this.statusDiv.className = 'jp-image-status';
    imageContainer.appendChild(this.statusDiv);

    void this.loadImage();
  }

  private _createControlsPanel(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'jp-image-controls-panel';

    // Filters section
    const filtersSection = document.createElement('div');
    filtersSection.className = 'jp-image-controls-section';
    const filtersTitle = document.createElement('h3');
    filtersTitle.textContent = 'Filters';
    filtersSection.appendChild(filtersTitle);

    const filterButtons = [
      { label: 'Grayscale', operation: 'grayscale' },
      { label: 'Sepia', operation: 'sepia' },
      { label: 'Blur', operation: 'blur' },
      { label: 'Sharpen', operation: 'sharpen' }
    ];

    filterButtons.forEach(({ label, operation }) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.className = 'jp-image-filter-button';
      btn.onclick = () => void this._applyFilter(operation);
      filtersSection.appendChild(btn);
    });

    container.appendChild(filtersSection);

    // Crop section
    const cropSection = document.createElement('div');
    cropSection.className = 'jp-image-controls-section';
    const cropTitle = document.createElement('h3');
    cropTitle.textContent = 'Crop';
    cropSection.appendChild(cropTitle);

    const cropBtn = document.createElement('button');
    cropBtn.textContent = 'Crop 50% (Center)';
    cropBtn.className = 'jp-image-filter-button';
    cropBtn.onclick = () => void this._applyFilter('crop');
    cropSection.appendChild(cropBtn);

    container.appendChild(cropSection);

    // Adjustments section
    const adjustSection = document.createElement('div');
    adjustSection.className = 'jp-image-controls-section';
    const adjustTitle = document.createElement('h3');
    adjustTitle.textContent = 'Adjustments';
    adjustSection.appendChild(adjustTitle);

    // Brightness slider
    const brightnessLabel = document.createElement('label');
    brightnessLabel.textContent = 'Brightness';
    adjustSection.appendChild(brightnessLabel);

    const brightnessSlider = document.createElement('input');
    brightnessSlider.type = 'range';
    brightnessSlider.min = '0.5';
    brightnessSlider.max = '2.0';
    brightnessSlider.step = '0.1';
    brightnessSlider.value = '1.0';
    brightnessSlider.className = 'jp-image-slider';
    brightnessSlider.oninput = (e) => {
      const value = (e.target as HTMLInputElement).value;
      brightnessValue.textContent = value;
    };
    brightnessSlider.onchange = (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      void this._applyAdjustment('brightness', value);
    };
    adjustSection.appendChild(brightnessSlider);

    const brightnessValue = document.createElement('span');
    brightnessValue.textContent = '1.0';
    brightnessValue.className = 'jp-image-slider-value';
    adjustSection.appendChild(brightnessValue);

    // Contrast slider
    const contrastLabel = document.createElement('label');
    contrastLabel.textContent = 'Contrast';
    adjustSection.appendChild(contrastLabel);

    const contrastSlider = document.createElement('input');
    contrastSlider.type = 'range';
    contrastSlider.min = '0.5';
    contrastSlider.max = '2.0';
    contrastSlider.step = '0.1';
    contrastSlider.value = '1.0';
    contrastSlider.className = 'jp-image-slider';
    contrastSlider.oninput = (e) => {
      const value = (e.target as HTMLInputElement).value;
      contrastValue.textContent = value;
    };
    contrastSlider.onchange = (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      void this._applyAdjustment('contrast', value);
    };
    adjustSection.appendChild(contrastSlider);

    const contrastValue = document.createElement('span');
    contrastValue.textContent = '1.0';
    contrastValue.className = 'jp-image-slider-value';
    adjustSection.appendChild(contrastValue);

    container.appendChild(adjustSection);

    // Reset button
    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'Reset to Original';
    resetBtn.className = 'jp-image-reset-button';
    resetBtn.onclick = () => this._resetToOriginal();
    container.appendChild(resetBtn);

    return container;
  }

  async loadImage(): Promise<void> {
    try {
      const data = await requestAPI<RandomImageResponse>('random-image-caption');
      this.originalImageData = `data:image/jpeg;base64,${data.b64_bytes}`;
      this.currentImageData = this.originalImageData;
      this.img.src = this.currentImageData;
      this.caption.textContent = data.caption;
      this.appliedFilters = [];
      this._updateStatus('Image loaded');
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error fetching image data: ${detail}`);
      this.caption.textContent = 'Failed to load image.';
      this._updateStatus('Error loading image', true);
    }
  }

  private async _applyFilter(operation: string): Promise<void> {
    if (!this.currentImageData) {
      return;
    }

    try {
      this._updateStatus(`Applying ${operation}...`);
      
      const response = await requestAPI<EditImageResponse>('edit-image', {
        method: 'POST',
        body: JSON.stringify({
          image_data: this.currentImageData,
          operation: operation
        })
      });

      this.currentImageData = `data:image/jpeg;base64,${response.b64_bytes}`;
      this.img.src = this.currentImageData;
      this.appliedFilters.push(operation);
      this._updateStatus(`Applied ${operation} (Total filters: ${this.appliedFilters.length})`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error applying filter: ${detail}`);
      void showErrorMessage('Image Edit Error', detail);
      this._updateStatus(`Error applying ${operation}`, true);
    }
  }

  private async _applyAdjustment(type: string, factor: number): Promise<void> {
    if (!this.currentImageData) {
      return;
    }

    try {
      this._updateStatus(`Adjusting ${type}...`);
      
      const response = await requestAPI<EditImageResponse>('edit-image', {
        method: 'POST',
        body: JSON.stringify({
          image_data: this.currentImageData,
          operation: type,
          params: { factor }
        })
      });

      this.currentImageData = `data:image/jpeg;base64,${response.b64_bytes}`;
      this.img.src = this.currentImageData;
      this.appliedFilters.push(`${type}(${factor})`);
      this._updateStatus(`Applied ${type}: ${factor}`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error adjusting image: ${detail}`);
      void showErrorMessage('Image Adjustment Error', detail);
      this._updateStatus(`Error adjusting ${type}`, true);
    }
  }

  private _resetToOriginal(): void {
    this.currentImageData = this.originalImageData;
    this.img.src = this.currentImageData;
    this.appliedFilters = [];
    this._updateStatus('Reset to original image');
  }

  private _updateStatus(message: string, isError: boolean = false): void {
    this.statusDiv.textContent = message;
    this.statusDiv.className = isError 
      ? 'jp-image-status jp-image-status-error' 
      : 'jp-image-status';
  }

  getCurrentImageData(): string {
    return this.currentImageData;
  }
}

export class ImageCaptionMainAreaWidget extends MainAreaWidget<ImageCaptionWidget> {
  constructor() {
    const widget = new ImageCaptionWidget();
    super({ content: widget });

    this.title.label = 'Image Editor';
    this.title.caption = 'Edit and view random images';
    this.title.icon = imageIcon;

    const refreshButton = new ToolbarButton({
      icon: refreshIcon,
      tooltip: 'Load new image',
      onClick: () => {
        void widget.loadImage();
      }
    });
    this.toolbar.addItem('refresh', refreshButton);

    const saveButton = new ToolbarButton({
      icon: saveIcon,
      tooltip: 'Save edited image (downloads to browser)',
      onClick: () => {
        this._saveImage(widget);
      }
    });
    this.toolbar.addItem('save', saveButton);
  }

  private _saveImage(widget: ImageCaptionWidget): void {
    const imageData = widget.getCurrentImageData();
    if (!imageData) {
      void showErrorMessage('Save Error', 'No image to save');
      return;
    }

    try {
      // Create a download link
      const link = document.createElement('a');
      link.href = imageData;
      link.download = `edited-image-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown error';
      void showErrorMessage('Save Error', `Failed to save image: ${detail}`);
    }
  }
}
