import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  ICommandPalette,
  WidgetTracker
} from '@jupyterlab/apputils';
import { ILauncher } from '@jupyterlab/launcher';
import { imageIcon } from '@jupyterlab/ui-components';
import { UUID } from '@lumino/coreutils';

import { ImageCaptionMainAreaWidget } from './widget';
import { requestAPI } from './request';

interface HelloResponse {
  data: string;
}

interface CommandArgs {
  id?: string;
}

const COMMAND_ID = 'jupytercon2025_extension_workshop:image-caption';
const PALETTE_CATEGORY = 'Tutorial';
const TRACKER_NAMESPACE = 'jupytercon2025-extension-workshop';

const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupytercon2025-extension-workshop:plugin',
  description: 'A JupyterLab extension that displays a random image and caption.',
  autoStart: true,
  requires: [ICommandPalette, ILauncher],
  optional: [ILayoutRestorer],
  activate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    launcher: ILauncher,
    restorer: ILayoutRestorer | null
  ) => {
    void requestAPI<HelloResponse>('hello').catch((error: unknown) => {
      const detail = error instanceof Error ? error.message : 'Unknown error';
      console.error(
        `The jupytercon2025_extension_workshop server extension appears to be missing.\n${detail}`
      );
    });

    const tracker = new WidgetTracker<ImageCaptionMainAreaWidget>({
      namespace: TRACKER_NAMESPACE
    });

    if (restorer) {
      void restorer.restore(tracker, {
        command: COMMAND_ID,
        args: widget => ({ id: widget.id }),
        name: widget => widget.id
      });
    }

    app.commands.addCommand(COMMAND_ID, {
      icon: imageIcon,
      label: 'View a random image & caption',
      execute: (args?: CommandArgs) => {
        const existingId = args?.id;
        let widget = existingId
          ? tracker.find(w => w.id === existingId)
          : tracker.currentWidget ?? null;

        if (!widget || widget.isDisposed) {
          widget = new ImageCaptionMainAreaWidget();
          widget.id = existingId ?? `image-caption-${UUID.uuid4()}`;
          widget.title.closable = true;
          void tracker.add(widget);
        }

        if (!widget.isAttached) {
          app.shell.add(widget, 'main');
        }

        app.shell.activateById(widget.id);
        return widget;
      }
    });

    palette.addItem({ command: COMMAND_ID, category: PALETTE_CATEGORY });
    launcher.add({ command: COMMAND_ID, category: PALETTE_CATEGORY });
  }
};

export default plugin;
