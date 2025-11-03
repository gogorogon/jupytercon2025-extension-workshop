import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ICommandPalette } from '@jupyterlab/apputils';
import { ILauncher } from '@jupyterlab/launcher';
import { imageIcon } from '@jupyterlab/ui-components';

import { ImageCaptionMainAreaWidget } from './widget';
import { requestAPI } from './request';

interface HelloResponse {
  data: string;
}

const COMMAND_ID = 'jupytercon2025_extension_workshop:image-caption';
const PALETTE_CATEGORY = 'Tutorial';

/**
 * Initialization data for the jupytercon2025-extension-workshop extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupytercon2025-extension-workshop:plugin',
  description: 'A JupyterLab extension that displays a random image and caption.',
  autoStart: true,
  requires: [ICommandPalette],
  optional: [ILauncher],
  activate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    launcher: ILauncher | null
  ) => {
    void requestAPI<HelloResponse>('hello').catch((error: unknown) => {
      const detail = error instanceof Error ? error.message : 'Unknown error';
      console.error(
        `The jupytercon2025_extension_workshop server extension appears to be missing.\n${detail}`
      );
    });

    app.commands.addCommand(COMMAND_ID, {
      execute: () => {
        const widget = new ImageCaptionMainAreaWidget();
        app.shell.add(widget, 'main');
        return widget;
      },
      icon: imageIcon,
      label: 'View a random image & caption'
    });

    palette.addItem({ command: COMMAND_ID, category: PALETTE_CATEGORY });

    if (launcher) {
      launcher.add({ command: COMMAND_ID, category: PALETTE_CATEGORY });
    }
  }
};

export default plugin;
